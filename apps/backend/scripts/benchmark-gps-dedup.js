// docs/roadmap/OPEN_ITEMS_AFTER_MVP.md §8 / SPRINT_R1_STABILIZATION.md R1-6 —
// measures the real cost of the gps_event_dedup idempotency write
// (apps/backend/src/realtime/gps-events.service.ts) against a running
// backend + Postgres/PostGIS. Small load test, not a large-scale benchmark
// (docs/TEST_STRATEGY.md §4 explicitly excludes "load test quy mô lớn
// (nghìn client đồng thời)" from MVP scope).
//
// Usage (backend + Postgres already running locally):
//   node apps/backend/scripts/benchmark-gps-dedup.js
//
// Env overrides: API_BASE_URL (default http://localhost:3000/api),
// DATABASE_URL (falls back to apps/backend/.env's value),
// SEQUENTIAL_ITERATIONS (default 500), CONCURRENT_WORKERS (default 4),
// CONCURRENT_ITERATIONS_PER_WORKER (default 200).

const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const DATABASE_URL = process.env.DATABASE_URL;
const SEQUENTIAL_ITERATIONS = Number(process.env.SEQUENTIAL_ITERATIONS ?? 500);
// Default kept at 4 to stay under AuthController's login rate limit (5
// attempts/60s/IP, see apps/backend/src/auth/auth.controller.ts): this
// script logs in once for the sequential-phase trip plus once per
// concurrent worker, all from the same IP, so total logins = 1 +
// CONCURRENT_WORKERS must stay <= 5. setupTrip() now checks response.ok on
// every call and throws a clear error (including the 429 body) instead of
// letting a failed login cascade into a confusing DB constraint violation,
// so raising this is safe to experiment with -- it will just fail fast.
const CONCURRENT_WORKERS = Number(process.env.CONCURRENT_WORKERS ?? 4);
const CONCURRENT_ITERATIONS_PER_WORKER = Number(process.env.CONCURRENT_ITERATIONS_PER_WORKER ?? 200);

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required (set it in apps/backend/.env or the environment).');
  process.exit(1);
}

async function setupTrip(suffix) {
  const email = `benchmark-${Date.now()}-${suffix}@example.com`;
  const password = 'BenchmarkPass123!';

  const register = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!register.ok) throw new Error(`register failed: ${await register.text()}`);

  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error(`login failed (${loginRes.status}): ${await loginRes.text()}`);
  const { access_token: token } = await loginRes.json();
  const authHeader = { Authorization: `Bearer ${token}` };

  const vehicleRes = await fetch(`${API_BASE_URL}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ type: 'motorbike', license_plate: `BM-${Date.now()}-${suffix}` }),
  });
  if (!vehicleRes.ok) throw new Error(`create vehicle failed (${vehicleRes.status}): ${await vehicleRes.text()}`);
  const vehicle = await vehicleRes.json();

  const activateRes = await fetch(`${API_BASE_URL}/vehicles/${vehicle.id}/activate`, {
    method: 'POST',
    headers: authHeader,
  });
  if (!activateRes.ok) throw new Error(`activate vehicle failed (${activateRes.status}): ${await activateRes.text()}`);

  const verifyRes = await fetch(`${API_BASE_URL}/vehicles/${vehicle.id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ provider_payload: 'benchmark' }),
  });
  if (!verifyRes.ok) throw new Error(`biometric verify failed (${verifyRes.status}): ${await verifyRes.text()}`);
  const { verification_id: verificationId } = await verifyRes.json();

  const tripRes = await fetch(`${API_BASE_URL}/trips/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ vehicle_id: vehicle.id, consent: true, verification_id: verificationId }),
  });
  if (!tripRes.ok) throw new Error(`start trip failed (${tripRes.status}): ${await tripRes.text()}`);
  const trip = await tripRes.json();

  const meRes = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeader });
  if (!meRes.ok) throw new Error(`/auth/me failed (${meRes.status}): ${await meRes.text()}`);
  const me = await meRes.json();

  return { tripId: trip.id, vehicleId: vehicle.id, userId: me.id };
}

async function insertRawGpsEvent(client, { tripId, vehicleId, userId }) {
  const [{ id }] = (
    await client.query(
      `INSERT INTO raw_gps_events
         (trip_id, vehicle_id, user_id, client_event_id, location, speed_kmh, accuracy_m, sync_channel, event_timestamp)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, 'realtime', $9)
       RETURNING id`,
      [tripId, vehicleId, userId, crypto.randomUUID(), 106.7009, 10.7769, 30, 5, new Date().toISOString()],
    )
  ).rows;
  return id;
}

async function insertDedup(client, { userId, rawGpsEventId }) {
  await client.query(
    `INSERT INTO gps_event_dedup (user_id, client_event_id, raw_gps_event_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, client_event_id) DO NOTHING
     RETURNING raw_gps_event_id`,
    [userId, crypto.randomUUID(), rawGpsEventId],
  );
}

function stats(label, latenciesMs) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  console.log(
    `${label}: n=${sorted.length} avg=${avg.toFixed(3)}ms p50=${pick(0.5).toFixed(3)}ms ` +
      `p95=${pick(0.95).toFixed(3)}ms p99=${pick(0.99).toFixed(3)}ms max=${sorted[sorted.length - 1].toFixed(3)}ms`,
  );
  return { avg, p50: pick(0.5), p95: pick(0.95), p99: pick(0.99) };
}

async function runSequentialPhase(client, trip) {
  console.log(`\n=== Phase 1: sequential latency (n=${SEQUENTIAL_ITERATIONS}) ===`);

  const fullTx = [];
  for (let i = 0; i < SEQUENTIAL_ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    await client.query('BEGIN');
    const rawId = await insertRawGpsEvent(client, trip);
    await insertDedup(client, { userId: trip.userId, rawGpsEventId: rawId });
    await client.query('COMMIT');
    fullTx.push(Number(process.hrtime.bigint() - start) / 1e6);
  }

  const rawOnly = [];
  for (let i = 0; i < SEQUENTIAL_ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    await client.query('BEGIN');
    await insertRawGpsEvent(client, trip);
    await client.query('COMMIT');
    rawOnly.push(Number(process.hrtime.bigint() - start) / 1e6);
  }

  const fullStats = stats('Full transaction (raw_gps_events + gps_event_dedup)', fullTx);
  const rawStats = stats('raw_gps_events insert only (no dedup)          ', rawOnly);
  console.log(
    `Marginal cost of gps_event_dedup write: avg +${(fullStats.avg - rawStats.avg).toFixed(3)}ms, ` +
      `p95 +${(fullStats.p95 - rawStats.p95).toFixed(3)}ms`,
  );
}

async function runConcurrentPhase(trips) {
  console.log(
    `\n=== Phase 2: concurrent throughput (${CONCURRENT_WORKERS} workers x ${CONCURRENT_ITERATIONS_PER_WORKER} events) ===`,
  );

  const start = process.hrtime.bigint();
  await Promise.all(
    trips.map(async (trip) => {
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      try {
        for (let i = 0; i < CONCURRENT_ITERATIONS_PER_WORKER; i++) {
          await client.query('BEGIN');
          const rawId = await insertRawGpsEvent(client, trip);
          await insertDedup(client, { userId: trip.userId, rawGpsEventId: rawId });
          await client.query('COMMIT');
        }
      } finally {
        await client.end();
      }
    }),
  );
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  const totalEvents = CONCURRENT_WORKERS * CONCURRENT_ITERATIONS_PER_WORKER;
  console.log(
    `Processed ${totalEvents} events across ${CONCURRENT_WORKERS} concurrent connections in ${elapsedMs.toFixed(0)}ms ` +
      `-> ${((totalEvents / elapsedMs) * 1000).toFixed(1)} events/sec aggregate`,
  );
}

async function main() {
  console.log(`Setting up 1 trip for sequential phase against ${API_BASE_URL} ...`);
  const sequentialTrip = await setupTrip('seq');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  await runSequentialPhase(client, sequentialTrip);
  await client.end();

  console.log(`\nSetting up ${CONCURRENT_WORKERS} trips for concurrent phase ...`);
  const concurrentTrips = [];
  for (let i = 0; i < CONCURRENT_WORKERS; i++) {
    concurrentTrips.push(await setupTrip(`c${i}`));
  }
  await runConcurrentPhase(concurrentTrips);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

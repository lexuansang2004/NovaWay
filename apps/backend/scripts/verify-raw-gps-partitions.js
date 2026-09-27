// docs/REVIEW_NOTES.md §17 / step 9.3 (fix/raw-gps-partition-availability) —
// committed regression coverage for ensure_raw_gps_partitions() (migration
// 1721260000010-EnsureRawGpsPartitions.ts) and PartitionMaintenanceService.
// This is a plain script, not a Jest .spec.ts, deliberately: apps/backend's
// default `pnpm test` (Jest, rootDir "src") runs in CI's "node" job, which
// has no live Postgres (see .github/workflows/ci.yml comment on the `node`
// job) — a real-DB spec discovered by that default run would break it. This
// script is invoked explicitly (`pnpm test:partition-integration`) only from
// the `e2e` job, which already provisions Postgres/PostGIS and runs
// migrations before this script's usual call site.
//
// Usage (Postgres reachable, migrations already applied):
//   DATABASE_URL=postgres://... node apps/backend/scripts/verify-raw-gps-partitions.js
//
// Exits 0 with a per-check summary on success, exits 1 with the first
// failing assertion's message on failure. Never logs DATABASE_URL or any
// connection credentials — only query results and error messages.

const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required (set it in apps/backend/.env or the environment).');
  process.exit(1);
}

const CONCURRENT_CONNECTIONS = 8;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function partitionName(year, monthIndex0 /* 0-based, may be <0 or >11 */) {
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  return `raw_gps_events_${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function partitionExists(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
     WHERE i.inhparent = 'raw_gps_events'::regclass AND c.relname = $1`,
    [name],
  );
  return rows.length > 0;
}

async function partitionCount(client) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM pg_inherits WHERE inhparent = 'raw_gps_events'::regclass`,
  );
  return rows[0].n;
}

// (a) Repeated calls are idempotent — no error, no change in partition count.
async function verifyIdempotency(client) {
  await client.query('SELECT ensure_raw_gps_partitions()');
  const before = await partitionCount(client);
  await client.query('SELECT ensure_raw_gps_partitions()');
  const after = await partitionCount(client);
  assert(before === after, `partition count changed after a repeat call (${before} -> ${after})`);
  console.log(`(a) OK — idempotent, partition count stable at ${after}`);
}

// (b) Current + next UTC-month partitions exist after a call with no
// reference_date (i.e. driven by the database's own clock).
async function verifyCurrentAndNextPartitions(client) {
  await client.query('SELECT ensure_raw_gps_partitions()');
  const { rows } = await client.query(`SELECT (now() AT TIME ZONE 'UTC')::date AS today`);
  const today = rows[0].today;
  const currentName = partitionName(today.getUTCFullYear(), today.getUTCMonth());
  const nextName = partitionName(today.getUTCFullYear(), today.getUTCMonth() + 1);

  assert(await partitionExists(client, currentName), `missing current-month partition ${currentName}`);
  assert(await partitionExists(client, nextName), `missing next-month partition ${nextName}`);
  console.log(`(b) OK — ${currentName} and ${nextName} exist`);
}

// (c) A fixed future reference_date creates the correct future partitions —
// deterministic, doesn't depend on waiting for a real month boundary.
async function verifyFutureReferenceDate(client) {
  await client.query("SELECT ensure_raw_gps_partitions('2027-01-15'::date)");
  assert(await partitionExists(client, 'raw_gps_events_2027_01'), 'missing raw_gps_events_2027_01');
  assert(await partitionExists(client, 'raw_gps_events_2027_02'), 'missing raw_gps_events_2027_02');
  console.log('(c) OK — reference_date 2027-01-15 created raw_gps_events_2027_01 and _2027_02');
}

// (d) Concurrent calls from separate connections complete without
// duplicate-object errors and without duplicating any partition — the
// advisory lock inside the function must serialize them.
async function verifyConcurrentCalls() {
  const clients = [];
  try {
    for (let i = 0; i < CONCURRENT_CONNECTIONS; i += 1) {
      const c = new Client({ connectionString: DATABASE_URL });
      await c.connect();
      clients.push(c);
    }

    const before = await partitionCount(clients[0]);
    const results = await Promise.allSettled(
      clients.map((c) => c.query('SELECT ensure_raw_gps_partitions()')),
    );
    const failed = results.filter((r) => r.status === 'rejected');
    assert(
      failed.length === 0,
      `${failed.length}/${CONCURRENT_CONNECTIONS} concurrent calls failed: ` +
        failed.map((f) => f.reason?.message ?? String(f.reason)).join('; '),
    );

    const after = await partitionCount(clients[0]);
    assert(before === after, `partition count changed after concurrent calls (${before} -> ${after})`);
    console.log(`(d) OK — ${CONCURRENT_CONNECTIONS} concurrent calls succeeded, partition count stable at ${after}`);
  } finally {
    await Promise.all(clients.map((c) => c.end()));
  }
}

// (e) + (f) combined: under a non-UTC session TimeZone, partition bounds
// must remain exact UTC month boundaries, and real raw_gps_events inserts at
// the exact lower boundary and the next-month boundary must land in the
// correct child partition (tableoid). Everything here runs inside one
// transaction that is rolled back at the end, so no seeded row or partition
// is left behind by this check.
async function verifyUtcBoundsAndBoundaryInserts(client) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh'");

    // A session TimeZone other than UTC is exactly the condition that used
    // to shift partition bounds (docs/REVIEW_NOTES.md §17 rework) — this
    // call must still produce partitions anchored to true UTC midnight.
    await client.query("SELECT ensure_raw_gps_partitions('2026-08-10'::date)");

    // Minimum FK chain raw_gps_events requires (users -> vehicles ->
    // biometric_verifications -> trips), seeded with fixed ids scoped to
    // this transaction only.
    const userId = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    const verificationId = crypto.randomUUID();
    const tripId = crypto.randomUUID();

    await client.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'x')`,
      [userId, `partition-verify-${userId}@example.com`],
    );
    await client.query(
      `INSERT INTO vehicles (id, user_id, type, license_plate) VALUES ($1, $2, 'motorbike', $3)`,
      [vehicleId, userId, `PV-${vehicleId.slice(0, 8)}`],
    );
    await client.query(
      `INSERT INTO biometric_verifications (id, user_id, vehicle_id, result, provider) VALUES ($1, $2, $3, 'success', 'mock')`,
      [verificationId, userId, vehicleId],
    );
    await client.query(
      `INSERT INTO trips (id, user_id, vehicle_id, biometric_verification_id, consent_at) VALUES ($1, $2, $3, $4, now())`,
      [tripId, userId, vehicleId, verificationId],
    );

    async function insertAt(receivedAtIso) {
      const { rows } = await client.query(
        `INSERT INTO raw_gps_events
           (trip_id, vehicle_id, user_id, client_event_id, location, speed_kmh, accuracy_m, sync_channel, event_timestamp, received_at)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint(106.7, 10.77), 4326)::geography, 25, 5, 'realtime', $5, $5)
         RETURNING tableoid::regclass::text AS partition`,
        [tripId, vehicleId, userId, crypto.randomUUID(), receivedAtIso],
      );
      return rows[0].partition;
    }

    // Exact lower boundary of the August partition (UTC midnight) and the
    // exact next-month boundary — both expressed with an explicit 'Z' so the
    // *value* being inserted is unambiguous; the session TimeZone set above
    // only affects how the server would interpret an offset-less literal,
    // which is precisely what the fix must not depend on.
    const augustBoundary = await insertAt('2026-08-01T00:00:00.000Z');
    assert(
      augustBoundary === 'raw_gps_events_2026_08',
      `insert at 2026-08-01T00:00:00Z landed in ${augustBoundary}, expected raw_gps_events_2026_08`,
    );

    const septemberBoundary = await insertAt('2026-09-01T00:00:00.000Z');
    assert(
      septemberBoundary === 'raw_gps_events_2026_09',
      `insert at 2026-09-01T00:00:00Z landed in ${septemberBoundary}, expected raw_gps_events_2026_09`,
    );

    console.log(
      '(e)+(f) OK — under session TimeZone Asia/Ho_Chi_Minh, both boundary inserts landed in the correct UTC-month partition ' +
        `(${augustBoundary}, ${septemberBoundary})`,
    );
  } finally {
    // Always roll back — this check must never leave seeded rows behind,
    // pass or fail.
    await client.query('ROLLBACK');
  }
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await verifyIdempotency(client);
    await verifyCurrentAndNextPartitions(client);
    await verifyFutureReferenceDate(client);
    await verifyConcurrentCalls();
    await verifyUtcBoundsAndBoundaryInserts(client);
  } finally {
    await client.end();
  }
}

main()
  .then(() => {
    console.log('\nraw_gps_events partition maintenance: all checks passed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nraw_gps_events partition maintenance FAILED: ${err.message}`);
    process.exit(1);
  });

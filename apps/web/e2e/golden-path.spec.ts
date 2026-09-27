import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';

// docs/roadmap/SPRINT_R1_STABILIZATION.md R1-3 — minimal E2E for the golden
// flow: đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí → kết thúc.
//
// "Start trip" / "see location" / "end trip" are exercised here through the
// real REST + WebSocket APIs directly (the same ones apps/mobile's Trip
// Cockpit uses), while login and vehicle selection go through the real web
// UI. This is not a LiveMapPage limitation — starting/ending a trip requires
// biometric vehicle binding (FR-BIOMETRIC-01), which is a mobile-only flow
// (no webcam-based verify UI on web, by design — see docs/roadmap/
// SPRINT_R2_PRODUCT_COMPLETION.md R2-1 / docs/roadmap/OPEN_ITEMS_AFTER_MVP.md
// §9). LiveMapPage (/start-trip, R2-1, 07/2026) only *watches* whichever
// trip is currently active for the user via the real `/realtime` WebSocket
// (apps/web/src/services/useLiveTrip.ts) — it has no start/stop control.

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api';
const WS_BASE_URL = process.env.E2E_WS_BASE_URL ?? 'http://localhost:3000';

interface VehicleResponse {
  id: string;
  license_plate: string;
}

interface VerifyResponse {
  verification_id: string;
  result: 'success' | 'failed';
}

interface TripStartResponse {
  id: string;
}

interface TripEndResponse {
  id: string;
  status: string;
  trip_log: { distance_km: number; duration_minutes: number };
}

interface LocationBroadcastPayload {
  trip_id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  timestamp: string;
}

interface LocationRejectedPayload {
  client_event_id: string;
  error_code: string;
}

const LOCATION_ACK_TIMEOUT_MS = 5000;

// Sends one `location:update` and waits for the server's own acknowledgement
// instead of a fixed sleep. RealtimeGateway.handleLocationUpdate only emits
// `location:broadcast` *after* GpsEventsService.recordEvent has persisted the
// row into raw_gps_events (apps/backend/src/realtime/realtime.gateway.ts) —
// so receiving the matching broadcast is the one signal that actually proves
// persistence before the "end trip" step queries raw_gps_events for the
// distance calculation. A fixed setTimeout is not a valid sync signal: it
// leaves an ordering/observability weakness where "end trip" could race an
// in-flight insert under variable CI load. (The historical distance_km === 0
// failures on PR #73 had a separately confirmed primary cause — the
// raw_gps_events missing-partition defect, docs/REVIEW_NOTES.md §17 — this
// fix addresses the synchronization weakness itself, see §18.)
async function sendLocationUpdateAndAwaitAck(
  socket: Socket,
  point: { latitude: number; longitude: number },
  tripId: string,
): Promise<void> {
  const clientEventId = randomUUID();
  const timestamp = new Date().toISOString();

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutHandle);
      socket.off('location:broadcast', onBroadcast);
      socket.off('location:rejected', onRejected);
    };

    const settleResolve = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    function onBroadcast(payload: LocationBroadcastPayload) {
      // Only resolve for *this* point's broadcast — trip_id + coordinates +
      // timestamp uniquely identify it (the broadcast payload does not echo
      // back client_event_id, see docs/API_CONTRACT.md §6).
      if (
        payload.trip_id === tripId &&
        payload.latitude === point.latitude &&
        payload.longitude === point.longitude &&
        payload.timestamp === timestamp
      ) {
        settleResolve();
      }
    }

    function onRejected(payload: LocationRejectedPayload) {
      if (payload.client_event_id === clientEventId) {
        settleReject(
          new Error(
            `location:update rejected (error_code=${payload.error_code}, trip=${tripId}, client_event_id=${clientEventId})`,
          ),
        );
      }
    }

    const timeoutHandle = setTimeout(() => {
      settleReject(
        new Error(
          `Timed out after ${LOCATION_ACK_TIMEOUT_MS}ms waiting for location:broadcast/location:rejected ` +
            `(trip=${tripId}, client_event_id=${clientEventId}, point=${JSON.stringify(point)})`,
        ),
      );
    }, LOCATION_ACK_TIMEOUT_MS);

    socket.on('location:broadcast', onBroadcast);
    socket.on('location:rejected', onRejected);

    socket.emit('location:update', {
      trip_id: tripId,
      client_event_id: clientEventId,
      speed_kmh: 25,
      accuracy_m: 5,
      timestamp,
      ...point,
    });
  });
}

test('golden path: login → select vehicle → start trip → see location → end trip', async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'E2ePass123!';
  const licensePlate = `E2E-${Date.now()}`;

  await test.step('setup: register user via real API (no register UI on web)', async () => {
    const res = await request.post(`${API_BASE_URL}/auth/register`, { data: { email, password } });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  await test.step('login via real UI', async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  const token = await page.evaluate(() => sessionStorage.getItem('novaway_web_token'));
  expect(token, 'expected a JWT in sessionStorage after real login').toBeTruthy();
  const authHeader = { Authorization: `Bearer ${token}` };

  await test.step('add + activate vehicle via real UI', async () => {
    await page.goto('/vehicles');
    await page.getByRole('button', { name: 'Thêm phương tiện' }).click();
    await page.getByLabel('Biển số').fill(licensePlate);
    await page.getByRole('button', { name: 'Lưu' }).click();
    // exact: true -- avoid Playwright's default case-insensitive substring
    // match colliding with the sidebar's logged-in user email, which also
    // embeds a Date.now()-based timestamp and can share the same digits.
    await expect(page.getByText(licensePlate, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đặt đang dùng' }).click();
    // exact: true -- the page's static description paragraph ("... chọn
    // phương tiện đang hoạt động.") also contains this phrase, and
    // Playwright's default text match is a case-insensitive substring, so it
    // would otherwise resolve to 2 elements (strict-mode violation) or race
    // against which one mounts first (docs/REVIEW_NOTES.md §18).
    await expect(page.getByText('Đang hoạt động', { exact: true })).toBeVisible();
  });

  let vehicleId: string;
  await test.step('resolve vehicle id via real API', async () => {
    const res = await request.get(`${API_BASE_URL}/vehicles`, { headers: authHeader });
    const { vehicles } = (await res.json()) as { vehicles: VehicleResponse[] };
    const vehicle = vehicles.find((v) => v.license_plate === licensePlate);
    expect(vehicle, 'vehicle created in the UI step should be findable via GET /vehicles').toBeTruthy();
    vehicleId = vehicle!.id;
  });

  let verificationId: string;
  await test.step('biometric verify via real API (mock provider)', async () => {
    // R2-6: verify now requires a session_id from POST .../verify/session
    // first (matches AWS Rekognition Face Liveness's real two-step flow) —
    // the mock provider accepts any non-'fail' session id.
    const sessionRes = await request.post(`${API_BASE_URL}/vehicles/${vehicleId!}/verify/session`, {
      headers: authHeader,
    });
    expect(sessionRes.ok(), await sessionRes.text()).toBeTruthy();
    const { session_id: sessionId } = (await sessionRes.json()) as { session_id: string };

    const res = await request.post(`${API_BASE_URL}/vehicles/${vehicleId!}/verify`, {
      data: { session_id: sessionId },
      headers: authHeader,
    });
    const body = (await res.json()) as VerifyResponse;
    expect(body.result).toBe('success');
    verificationId = body.verification_id;
  });

  let tripId: string;
  await test.step('start trip via real API', async () => {
    const res = await request.post(`${API_BASE_URL}/trips/start`, {
      data: { vehicle_id: vehicleId!, consent: true, verification_id: verificationId! },
      headers: authHeader,
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as TripStartResponse;
    tripId = body.id;
  });

  await test.step('send real GPS over WebSocket /realtime (same pipeline as mobile)', async () => {
    const socket = io(`${WS_BASE_URL}/realtime`, { auth: { token }, transports: ['websocket'] });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
      });

      const points = [
        { latitude: 10.7769, longitude: 106.7009 },
        { latitude: 10.78, longitude: 106.705 },
      ];
      // Sequential + awaited: each point's location:broadcast (proof it was
      // persisted to raw_gps_events) must land before sending the next one,
      // so both are guaranteed committed before "end trip" below queries
      // raw_gps_events for the distance calculation (docs/REVIEW_NOTES.md
      // §18 — replaces the old fixed-sleep ordering weakness).
      for (const point of points) {
        await sendLocationUpdateAndAwaitAck(socket, point, tripId!);
      }
    } finally {
      // finally: a failed assertion/timeout above must not leak the socket.
      socket.close();
    }
  });

  await test.step('end trip via real API — expect a real non-zero distance', async () => {
    const res = await request.post(`${API_BASE_URL}/trips/${tripId!}/end`, { headers: authHeader });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as TripEndResponse;
    expect(body.status).toBe('ended');
    expect(body.trip_log.distance_km).toBeGreaterThan(0);
  });

  await test.step('see the trip on the real dashboard (Analytics) UI', async () => {
    await page.goto('/trip-history');
    await expect(page.getByText('Tổng quãng đường')).toBeVisible();
    await expect(page.getByText('Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc.')).toHaveCount(0);
  });
});

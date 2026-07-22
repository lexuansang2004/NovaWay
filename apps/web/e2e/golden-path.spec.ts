import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { io } from 'socket.io-client';

// docs/roadmap/SPRINT_R1_STABILIZATION.md R1-3 — minimal E2E for the golden
// flow: đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí → kết thúc.
//
// LiveMapPage (/start-trip) only drives a client-side mock GPS animation —
// it never calls the real trip/WebSocket APIs (see docs/roadmap/
// OPEN_ITEMS_AFTER_MVP.md §9). So "start trip" / "see location" / "end trip"
// are exercised here through the real REST + WebSocket APIs directly
// (the same ones apps/mobile's Trip Cockpit uses), while login and vehicle
// selection go through the real web UI. This keeps the test meaningful
// (it hits the real backend pipeline) without adding new product features
// to LiveMapPage, which is out of scope for R1-3.

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
    await expect(page.getByText('Đang hoạt động')).toBeVisible();
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
    const res = await request.post(`${API_BASE_URL}/vehicles/${vehicleId!}/verify`, {
      data: { provider_payload: 'e2e-golden-path' },
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
    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', (err) => reject(err));
    });

    const points = [
      { latitude: 10.7769, longitude: 106.7009 },
      { latitude: 10.78, longitude: 106.705 },
    ];
    for (const point of points) {
      socket.emit('location:update', {
        trip_id: tripId!,
        client_event_id: randomUUID(),
        speed_kmh: 25,
        accuracy_m: 5,
        timestamp: new Date().toISOString(),
        ...point,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    socket.close();
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

import { expect, test, type Page, type WebSocketRoute } from '@playwright/test';

// WEB-07: real LiveMapPage, useLiveTrip, Socket.IO client and MapLibre canvas.
// Only HTTP/Socket.IO wire data, style and raster tiles are synthetic fixtures.
// CSS font stress is not native browser/text zoom or a device certification.
const TOKEN = 'fixture-live-map-token';
const TRIP_ID = '00000000-0000-4000-8000-000000000077';
const USER = { id: '00000000-0000-4000-8000-000000000007', email: 'live.map@example.com' };
const TRIP = { id: TRIP_ID, vehicle_id: '00000000-0000-4000-8000-000000000017', status: 'active', started_at: '2026-01-01T00:00:00.000Z', ended_at: null, distance_km: 0, duration_minutes: 0, mismatch_warning_count: 0 };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const STALE = 'Mất kết nối trực tiếp — đang thử kết nối lại...';
const ERROR = 'Không kết nối được máy chủ — đang thử lại...';
const EMPTY = 'Chưa có chuyến đi nào đang diễn ra';
const ATTRIBUTION = 'Fixture map attribution';
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
interface FixtureOptions { noTrip?: boolean; waiting?: boolean; tileFailure?: boolean; pollError?: boolean }

async function fixture(page: Page, options: FixtureOptions = {}) {
  const calls: { method: string; path: string; token?: string; body: string | null }[] = [];
  const sockets: WebSocketRoute[] = [];
  const packets: string[] = [];
  let rejectConnections = false;
  let positionIndex = 0;
  let tileRequests = 0;
  await page.addInitScript((token) => sessionStorage.setItem('novaway_web_token', token), TOKEN);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const path = new URL(request.url()).pathname;
    calls.push({ method: request.method(), path, token: request.headers()['authorization'], body: request.postData() });
    const body = path === '/api/auth/me' ? USER : path === '/api/trips' ? options.pollError ? { error_code: 'FIXTURE_SERVER_ERROR', message: 'Fixture trip polling error' } : { trips: options.noTrip ? [] : [TRIP] } : null;
    return route.fulfill({ status: options.pollError && path === '/api/trips' ? 500 : body ? 200 : 500, contentType: 'application/json', headers: CORS, body: JSON.stringify(body ?? { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' }) });
  });
  await page.route('https://api.protomaps.com/**', (route) => route.fulfill({
    contentType: 'application/json', headers: CORS,
    body: JSON.stringify({ version: 8, sources: { fixture: { type: 'raster', tiles: ['https://map.fixture.invalid/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 0, attribution: ATTRIBUTION } }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbe8ef' } }, { id: 'fixture', type: 'raster', source: 'fixture' }] }),
  }));
  await page.route('https://map.fixture.invalid/**', (route) => {
    tileRequests++;
    return options.tileFailure ? route.abort('failed') : route.fulfill({ contentType: 'image/png', headers: CORS, body: PIXEL });
  });
  const sendPosition = (speed = 38) => {
    positionIndex++;
    const payload = { trip_id: TRIP_ID, vehicle_id: TRIP.vehicle_id, latitude: 10.762622 + positionIndex * 0.0001, longitude: 106.660172 + positionIndex * 0.0001, speed_kmh: speed, timestamp: '2026-01-01T00:00:01.000Z' };
    sockets.at(-1)?.send(`42/realtime,${JSON.stringify(['location:broadcast', payload])}`);
  };
  await page.routeWebSocket('**/socket.io/**', (socket) => {
    sockets.push(socket);
    socket.send('0{"sid":"fixture-engine","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}');
    socket.onMessage((message) => {
      const packet = String(message);
      packets.push(packet);
      if (packet.startsWith('40/realtime,')) socket.send(rejectConnections ? '44/realtime,{"message":"Fixture connection rejected"}' : '40/realtime,{"sid":"fixture-namespace"}');
      if (packet.startsWith('42/realtime,["join:trip"') && !options.waiting) {
        sendPosition(37);
        sendPosition(38);
      }
      if (packet === '3') return;
    });
  });
  return {
    calls, packets, sendPosition,
    tileRequests: () => tileRequests,
    disconnect: () => sockets.at(-1)?.send('41/realtime,'),
    failConnection: () => { rejectConnections = true; sockets.at(-1)?.close(); },
  };
}

async function open(page: Page, options: FixtureOptions = {}) {
  const transport = await fixture(page, options);
  await page.goto('/start-trip');
  if (options.noTrip || options.waiting || options.pollError) await expect(page.getByText(EMPTY, { exact: true })).toBeVisible();
  else {
    await expect(page.getByText('38 km/h', { exact: false })).toBeVisible();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect(page.locator('.maplibregl-ctrl-attrib-inner')).toContainText(ATTRIBUTION);
    await expect.poll(transport.tileRequests).toBeGreaterThan(0);
  }
  return transport;
}

async function canvasFits(page: Page) {
  await expect.poll(() => page.locator('.maplibregl-canvas').evaluate((canvas) => {
    const box = canvas.getBoundingClientRect();
    const map = canvas.closest('.maplibregl-map')!.getBoundingClientRect();
    return { width: Math.round(box.width - map.width), height: Math.round(box.height - map.height), nonzero: box.width > 0 && box.height > 0, bitmap: Math.abs((canvas as HTMLCanvasElement).width - box.width * devicePixelRatio) <= 2 };
  })).toEqual({ width: 0, height: 0, nonzero: true, bitmap: true });
}

async function labelsFit(page: Page) {
  const main = page.getByRole('main');
  const speed = page.getByText('38 km/h', { exact: false });
  const stale = page.getByText(STALE, { exact: false });
  const error = page.getByText(ERROR, { exact: false });
  const labels = [speed, ...(await stale.count() ? [stale] : []), ...(await error.count() ? [error] : [])];
  const mainBox = (await main.boundingBox())!;
  const boxes = [];
  for (const label of labels) {
    const box = (await label.boundingBox())!;
    boxes.push(box);
    expect(box.x).toBeGreaterThanOrEqual(mainBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(mainBox.x + mainBox.width + 1);
    expect(await label.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  }
  if (boxes.length === 2) {
    const [a, b] = boxes;
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function attributionReachable(page: Page) {
  const attribution = page.locator('.maplibregl-ctrl-attrib');
  await attribution.scrollIntoViewIfNeeded();
  await expect(attribution).toBeInViewport({ ratio: 0.99 });
  const toggle = attribution.getByRole('button');
  if (await toggle.isVisible()) await toggle.click();
  const target = page.locator('.maplibregl-ctrl-attrib-inner');
  await expect(target).toContainText(ATTRIBUTION);
  await expect(target).toBeVisible();
  expect(await target.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
  })).toBe(true);
}

function readOnly(transport: Awaited<ReturnType<typeof fixture>>) {
  expect(transport.calls.length).toBeGreaterThan(0);
  expect(transport.calls.every((call) => call.method === 'GET' && call.body === null && call.token === `Bearer ${TOKEN}` && ['/api/auth/me', '/api/trips'].includes(call.path))).toBe(true);
  expect(transport.packets.some((packet) => packet.includes(`"token":"${TOKEN}"`))).toBe(true);
  expect(transport.packets.some((packet) => packet === `42/realtime,["join:trip",{"trip_id":"${TRIP_ID}"}]`)).toBe(true);
  expect(transport.packets.some((packet) => packet.includes('location:update'))).toBe(false);
}

test.describe('responsive live map — fixture transports, real map', () => {
  test.beforeAll(async ({ browser }) => console.info(`WEB-07 fixture browser: ${browser.version()}`));
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }]) {
    test(`${viewport.width}×${viewport.height}: connected, disconnected, attribution and canvas`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const transport = await open(page);
      await canvasFits(page);
      await labelsFit(page);
      transport.disconnect();
      await expect(page.getByText(STALE, { exact: false })).toBeVisible();
      await labelsFit(page);
      await attributionReachable(page);
      readOnly(transport);
    });
  }

  test('connection error keeps last position, speed and readable status', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const transport = await open(page);
    transport.failConnection();
    await expect(page.getByText(ERROR, { exact: false })).toBeVisible({ timeout: 15_000 });
    await labelsFit(page);
    await canvasFits(page);
    await attributionReachable(page);
    readOnly(transport);
  });

  for (const options of [{ noTrip: true }, { waiting: true }, { pollError: true }]) test(`empty state layout preserves existing WEB-G07 behavior ${JSON.stringify(options)}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 180 });
    const transport = await open(page, options);
    const empty = page.getByText(EMPTY, { exact: true });
    await empty.scrollIntoViewIfNeeded();
    await expect(empty).toBeInViewport({ ratio: 0.99 });
    expect(await empty.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
    expect(transport.calls.every((call) => call.method === 'GET')).toBe(true);
  });

  test('tile failure preserves real canvas, live data and attribution', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const transport = await open(page, { tileFailure: true });
    await canvasFits(page);
    await labelsFit(page);
    await attributionReachable(page);
    transport.sendPosition(51);
    await expect(page.getByText('51 km/h', { exact: false })).toBeVisible();
    readOnly(transport);
  });

  test('touch/DPR2 orientation retains real marker updates and usable attribution', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage();
      const transport = await open(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      const marker = page.locator('.maplibregl-marker');
      const before = (await marker.boundingBox())!;
      transport.sendPosition(43);
      await expect(page.getByText('43 km/h', { exact: false })).toBeVisible();
      await expect.poll(async () => {
        const after = (await marker.boundingBox())!;
        return Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
      }).toBeGreaterThan(0);
      await page.setViewportSize({ width: 844, height: 390 });
      await canvasFits(page);
      await attributionReachable(page);
      await expect(page.getByText('43 km/h', { exact: false })).toBeVisible();
      const trigger = page.getByRole('button', { name: 'Mở menu điều hướng' });
      await trigger.tap();
      await page.getByRole('button', { name: 'Đóng menu điều hướng' }).tap();
      await expect(page.getByTestId('navigation-backdrop')).toHaveCount(0);
      await page.locator('.maplibregl-canvas').tap({ position: { x: 30, y: 30 } });
      readOnly(transport);
    } finally {
      await context.close();
    }
  });

  test('lg boundary and container-only resize update actual canvas without losing live data', async ({ page }) => {
    const transport = await open(page);
    for (const width of [1023, 1024, 1025, 1024, 1023, 320, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 800 });
      await canvasFits(page);
      await labelsFit(page);
      await expect(page).toHaveURL(/\/start-trip$/);
    }
    // No window resize: emulate layout container changing independently.
    await page.getByRole('main').evaluate((main) => { main.style.width = '310px'; main.style.flex = 'none'; });
    await canvasFits(page);
    await page.getByRole('main').evaluate((main) => { main.style.width = ''; main.style.flex = ''; });
    await canvasFits(page);
    transport.sendPosition(42);
    await expect(page.getByText('42 km/h', { exact: false })).toBeVisible();
    readOnly(transport);
  });

  test('CSS doubled text, low height and closed drawer leave map/attribution usable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 180 });
    const transport = await open(page);
    transport.disconnect();
    await expect(page.getByText(STALE, { exact: false })).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await labelsFit(page);
    await canvasFits(page);
    const trigger = page.getByRole('button', { name: 'Mở menu điều hướng' });
    await trigger.click();
    await page.getByRole('button', { name: 'Đóng menu điều hướng' }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId('navigation-backdrop')).toHaveCount(0);
    await attributionReachable(page);
    const canvas = page.locator('.maplibregl-canvas');
    await canvas.scrollIntoViewIfNeeded();
    await canvas.click({ position: { x: 30, y: 30 } });
    await expect(canvas).toBeFocused();
    readOnly(transport);
  });
});

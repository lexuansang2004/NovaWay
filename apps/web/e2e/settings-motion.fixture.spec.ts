import { expect, test, type Browser, type Page, type WebSocketRoute } from '@playwright/test';

// WEB-12 / WEB-T10 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.4, WEB-D12/WEB-D13;
// AC-WEBSETTINGS-01…08).
//
// FIXTURE UI — the real app (router, AppLayout guard, session store, shell,
// settings page and every animated page) runs unchanged; only REST and the
// Socket.IO transport are fixtures. Every REST request is recorded with
// method, path, Bearer and body. OS reduced motion is Playwright emulation of
// `prefers-reduced-motion`, not a change of a real OS setting.
//
// Oracles measure behaviour, not flags: running animations from
// document.getAnimations(), computed opacity/transform sampled every frame
// from page start, the chart's SVG geometry over time, and the exact
// localStorage contents. Keys, JSON and copy are written out here by hand,
// never imported from the product code.

const TOKEN_KEY = 'novaway_web_token';
const USER_A = { id: '00000000-0000-4000-8000-0000000012a1', email: 'motion.reader.a@example.com' };
const USER_B = { id: '00000000-0000-4000-8000-0000000012b2', email: 'motion.reader.b@example.com' };
const TOKEN_A = 'fixture-motion-token-a';
const TOKEN_B = 'fixture-motion-token-b';
const KEY_A = 'novaway:web:motion-preference:00000000-0000-4000-8000-0000000012a1';
const KEY_B = 'novaway:web:motion-preference:00000000-0000-4000-8000-0000000012b2';
const PREFIX = 'novaway:web:motion-preference:';
const SENTINEL_KEY = 'unrelated.sentinel';
const SENTINEL_VALUE = 'keep-me';
const REDUCED = '{"version":1,"motion":"reduced"}';
const SYSTEM = '{"version":1,"motion":"system"}';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

const COPY = {
  scope: 'Chỉ áp dụng cho tài khoản này trên trình duyệt này.',
  os: 'Hệ điều hành đang bật giảm chuyển động, nên hiệu ứng luôn được giảm.',
  readFailed: 'Không đọc được lựa chọn đã lưu trên trình duyệt này. Đang dùng ‘Theo hệ thống’.',
  writeFailed: 'Không lưu được lựa chọn trên trình duyệt này. Lựa chọn vẫn áp dụng tới khi bạn tải lại trang.',
  invalid: 'Lựa chọn đã lưu không đọc được. Đang dùng ‘Theo hệ thống’. Chọn lại để lưu.',
};

const VEHICLES = [{ id: '00000000-0000-4000-8000-0000000012c1', type: 'car', license_plate: 'MOTION-01', brand_model: null, is_active: true }];
const TRIPS = [1, 2, 3].map((i) => ({
  id: `00000000-0000-4000-8000-00000000120${i}`, vehicle_id: VEHICLES[0].id, status: 'ended',
  started_at: `2026-10-0${i}T01:00:00.000Z`, ended_at: `2026-10-0${i}T02:00:00.000Z`,
  distance_km: 3 * i, duration_minutes: 10 * i, mismatch_warning_count: i === 2 ? 1 : 0,
}));
const ACTIVE_TRIP = { id: '00000000-0000-4000-8000-0000000012d1', vehicle_id: VEHICLES[0].id, status: 'active', started_at: '2026-10-21T00:00:00.000Z', ended_at: null, distance_km: 0, duration_minutes: 0, mismatch_warning_count: 0 };

type FailMode = 'get' | 'getter' | 'set';
type Frame = { t: number; opacity: string; parentOpacity: string; transform: string; d: string | null };

interface ApiCall { method: string; path: string; token?: string; body: string | null }

interface FixtureOptions {
  token?: string | null;
  storage?: Record<string, string>;
  fail?: FailMode[];
  sample?: 'hero' | 'login-card' | 'bar';
  activeTrip?: boolean;
}

async function fixture(page: Page, options: FixtureOptions = {}) {
  const calls: ApiCall[] = [];
  const token = options.token === undefined ? TOKEN_A : options.token;
  const sockets: WebSocketRoute[] = [];
  let positionIndex = 0;
  // Seeds once per tab (sessionStorage marker) so a reload keeps what the app did.
  await page.addInitScript(
    ([tokenKey, tokenValue, seed, sentinel]) => {
      if (sessionStorage.getItem('__motion_seeded')) return;
      sessionStorage.setItem('__motion_seeded', '1');
      if (tokenValue) sessionStorage.setItem(tokenKey, tokenValue);
      localStorage.setItem(sentinel[0], sentinel[1]);
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    },
    [TOKEN_KEY, token, options.storage ?? {}, [SENTINEL_KEY, SENTINEL_VALUE]] as const,
  );
  // Storage failure injection, limited to the preference keys of localStorage.
  // The mode lives in sessionStorage so a test can change it mid-flow.
  await page.addInitScript(
    ([prefix, initial]) => {
      if (initial && sessionStorage.getItem('__motion_fail') === null) sessionStorage.setItem('__motion_fail', initial);
      const modes = () => (sessionStorage.getItem('__motion_fail') ?? '').split(',');
      const ls = window.localStorage;
      const get = Storage.prototype.getItem;
      const set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key: string) {
        if (this === ls && String(key).startsWith(prefix) && modes().includes('get')) throw new DOMException('fixture read blocked', 'SecurityError');
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        if (this === ls && String(key).startsWith(prefix) && modes().includes('set')) throw new DOMException('fixture quota', 'QuotaExceededError');
        return set.call(this, key, value);
      };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          if (modes().includes('getter')) throw new DOMException('fixture storage blocked', 'SecurityError');
          return ls;
        },
      });
      const w = window as unknown as { __peekStorage: () => Record<string, string | null> };
      w.__peekStorage = () => {
        const out: Record<string, string | null> = {};
        for (let i = 0; i < ls.length; i += 1) {
          const key = ls.key(i)!;
          out[key] = get.call(ls, key);
        }
        return out;
      };
    },
    [PREFIX, (options.fail ?? []).join(',')] as const,
  );
  // Records any use of camera or geolocation by the page.
  await page.addInitScript(() => {
    const w = window as unknown as { __sensitiveApiCalls: string[] };
    w.__sensitiveApiCalls = [];
    const record = (name: string) => () => {
      w.__sensitiveApiCalls.push(name);
      throw new Error(`fixture: ${name} must not be used`);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = record('geolocation.getCurrentPosition');
      navigator.geolocation.watchPosition = record('geolocation.watchPosition');
    }
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = record('mediaDevices.getUserMedia');
  });
  // Every CSS animation that actually starts (short ones such as the 150 ms
  // menu `enter` finish before a later getAnimations() call could see them).
  await page.addInitScript(() => {
    const w = window as unknown as { __animStarts: string[] };
    w.__animStarts = [];
    document.addEventListener('animationstart', (event) => w.__animStarts.push(event.animationName), true);
  });
  if (options.sample) {
    // Samples the target's computed style on every frame from document start,
    // so the first painted frame of an entrance is included.
    await page.addInitScript((target) => {
      const frames: unknown[] = [];
      const w = window as unknown as { __frames: unknown[]; __t0: number };
      w.__frames = frames;
      w.__t0 = performance.now();
      const find = (): Element | null | undefined => {
        if (target === 'hero') return [...document.querySelectorAll('main h2')].find((h) => h.textContent === 'Vị trí trực tiếp')?.closest('.backdrop-blur-xl');
        if (target === 'login-card') return document.querySelector('form')?.closest('.backdrop-blur-xl');
        return document.querySelector('.recharts-bar-rectangle path');
      };
      const tick = () => {
        const el = find();
        if (el) {
          const style = getComputedStyle(el);
          const parent = el.parentElement ? getComputedStyle(el.parentElement).opacity : '1';
          frames.push({ t: performance.now() - w.__t0, opacity: style.opacity, parentOpacity: parent, transform: style.transform, d: el.getAttribute('d') });
        }
        if (performance.now() - w.__t0 < 8000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, options.sample);
  }
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const path = new URL(request.url()).pathname;
    const bearer = request.headers()['authorization'];
    calls.push({ method: request.method(), path, token: bearer, body: request.postData() });
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    const user = bearer === `Bearer ${TOKEN_A}` ? USER_A : bearer === `Bearer ${TOKEN_B}` ? USER_B : null;
    if (path === '/api/auth/me' && request.method() === 'GET') return user ? json(200, user) : json(401, { error_code: 'UNAUTHORIZED', message: 'fixture' });
    if (path === '/api/auth/login' && request.method() === 'POST') {
      const { email } = JSON.parse(request.postData() ?? '{}') as { email?: string };
      if (email === USER_A.email) return json(200, { access_token: TOKEN_A, user: USER_A });
      if (email === USER_B.email) return json(200, { access_token: TOKEN_B, user: USER_B });
      return json(401, { error_code: 'INVALID_CREDENTIALS', message: 'fixture' });
    }
    if (user && request.method() === 'GET' && path === '/api/vehicles') return json(200, { vehicles: VEHICLES });
    if (user && request.method() === 'GET' && path === '/api/trips') return json(200, { trips: options.activeTrip ? [ACTIVE_TRIP] : TRIPS });
    return json(500, { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' });
  });
  await page.route('https://api.protomaps.com/**', (route) => route.fulfill({
    contentType: 'application/json', headers: CORS,
    body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0f172a' } }] }),
  }));
  await page.routeWebSocket('**/socket.io/**', (socket) => {
    sockets.push(socket);
    socket.send('0{"sid":"fixture-engine","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}');
    socket.onMessage((message) => {
      const packet = String(message);
      if (packet.startsWith('40/realtime,')) socket.send('40/realtime,{"sid":"fixture-namespace"}');
      if (packet.startsWith('42/realtime,["join:trip"')) sendPosition(31);
    });
  });
  function sendPosition(speed: number) {
    positionIndex += 1;
    const payload = { trip_id: ACTIVE_TRIP.id, vehicle_id: ACTIVE_TRIP.vehicle_id, latitude: 10.762622 + positionIndex * 0.001, longitude: 106.660172 + positionIndex * 0.001, speed_kmh: speed, timestamp: '2026-10-21T00:00:01.000Z' };
    sockets.at(-1)?.send(`42/realtime,${JSON.stringify(['location:broadcast', payload])}`);
  }
  return { calls, sendPosition };
}

const main = (page: Page) => page.getByRole('main');
const status = (page: Page) => main(page).getByRole('status');
const radio = (page: Page, name: 'Theo hệ thống' | 'Giảm chuyển động') => main(page).getByRole('radio', { name, exact: true });
const animStarts = (page: Page) => page.evaluate(() => (window as unknown as { __animStarts: string[] }).__animStarts.slice());
const readToken = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);
const peek = (page: Page) => page.evaluate(() => (window as unknown as { __peekStorage: () => Record<string, string | null> }).__peekStorage());
const setFail = (page: Page, modes: FailMode[]) => page.evaluate((m) => sessionStorage.setItem('__motion_fail', m), modes.join(','));
const isIdentity = (transform: string) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';

// Names of the animations currently running in the document (CSS animations,
// CSS transitions and Web Animations).
async function running(page: Page) {
  return page.evaluate(() => document.getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'web-animation'));
}

async function frames(page: Page) {
  return page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames);
}

function decorative(names: string[]) {
  return names.filter((name) => ['radar-ping', 'ping', 'enter', 'exit'].includes(name));
}

async function waitDashboard(page: Page) {
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}

async function openSettings(page: Page) {
  await page.goto('/settings');
  await expect(main(page).getByRole('heading', { level: 1, name: 'Cài đặt', exact: true })).toBeVisible();
}

async function openAccountMenu(page: Page, email: string) {
  const opener = page.getByRole('button', { name: 'Mở menu điều hướng' });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('button', { name: `Tài khoản: ${email}` }).click();
}

async function logout(page: Page, email: string) {
  await openAccountMenu(page, email);
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('fixture-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await waitDashboard(page);
}

// Decorative CSS motion on the dashboard: radar rings and the Online ping.
async function expectDashboardMotion(page: Page, expected: 'full' | 'reduced') {
  await waitDashboard(page);
  if (expected === 'full') {
    await expect.poll(async () => decorative(await running(page)).sort().join(',')).toBe('ping,radar-ping,radar-ping');
  } else {
    // Several frames, so a late-starting animation would be seen too.
    for (let i = 0; i < 5; i += 1) {
      expect(decorative(await running(page))).toEqual([]);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    }
  }
}

function onlyReads(calls: ApiCall[]) {
  for (const call of calls) {
    expect(call.body, `${call.method} ${call.path}`).toBeNull();
    expect(call.method, call.path).toBe('GET');
  }
}

async function newPage(browser: Browser, baseURL: string | undefined, options: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 }, ...options });
  return { context, page: await context.newPage() };
}

test.describe('AC-WEBSETTINGS-01/06 — the settings page', () => {
  test('default: two native radios, "Theo hệ thống" checked, scope sentence, no Save; only GET /auth/me', async ({ page }) => {
    const { calls } = await fixture(page);
    await openSettings(page);

    const group = main(page).getByRole('group', { name: 'Hiệu ứng giao diện' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(2);
    await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    await expect(radio(page, 'Giảm chuyển động')).not.toBeChecked();
    await expect(main(page).getByText(COPY.scope, { exact: true })).toBeVisible();
    await expect(main(page).getByText(COPY.os, { exact: true })).toHaveCount(0);
    await expect(main(page).getByRole('button')).toHaveCount(0);
    expect(await group.locator('input').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).type))).toEqual(['radio', 'radio']);
    await expect(status(page)).toHaveCount(1);
    await expect(status(page)).toHaveText('');
    for (const call of calls) expect(call).toEqual({ method: 'GET', path: '/api/auth/me', token: `Bearer ${TOKEN_A}`, body: null });
  });

  test('OS reduce: information line shown, still exactly two choices', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'reduce' });
    try {
      await fixture(page);
      await openSettings(page);
      await expect(main(page).getByText(COPY.os, { exact: true })).toBeVisible();
      await expect(main(page).getByRole('radio')).toHaveCount(2);
      await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    } finally {
      await context.close();
    }
  });

  test('keyboard: Tab into the group, arrows choose and save at once, Space, visible focus, focus stays', async ({ page }) => {
    await fixture(page);
    await openSettings(page);
    await page.locator('body').focus();
    for (let i = 0; i < 40 && !(await radio(page, 'Theo hệ thống').evaluate((el) => el === document.activeElement)); i += 1) await page.keyboard.press('Tab');
    await expect(radio(page, 'Theo hệ thống')).toBeFocused();
    expect(await radio(page, 'Theo hệ thống').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    const ring = await radio(page, 'Theo hệ thống').evaluate((el) => {
      const s = getComputedStyle(el);
      return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
    });
    expect(ring).toBe(true);

    await page.keyboard.press('ArrowDown');
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    await expect(radio(page, 'Giảm chuyển động')).toBeFocused();
    expect((await peek(page))[KEY_A]).toBe(REDUCED);

    await page.keyboard.press('ArrowUp');
    await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    expect((await peek(page))[KEY_A]).toBe(SYSTEM);

    await radio(page, 'Giảm chuyển động').focus();
    await page.keyboard.press('Space');
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    await expect(radio(page, 'Giảm chuyển động')).toBeFocused();
    expect((await peek(page))[KEY_A]).toBe(REDUCED);
  });
});

test.describe('AC-WEBSETTINGS-02 — OS × choice × auth', () => {
  test('login (not signed in) follows the OS only, even with a saved reduced choice in storage', async ({ browser, baseURL }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const { context, page } = await newPage(browser, baseURL, { reducedMotion });
      try {
        await fixture(page, { token: null, storage: { [KEY_A]: REDUCED }, sample: 'login-card' });
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Đăng nhập NovaWay' })).toBeVisible();
        await expect.poll(async () => decorative(await running(page)), reducedMotion).toEqual(reducedMotion === 'reduce' ? [] : ['radar-ping', 'radar-ping']);
        expect(await page.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBeNull();
        // The JS entrance of the form follows the OS too, not the stored choice.
        await page.waitForTimeout(700);
        const entrance = await frames(page);
        expect(entrance.some((f) => Number(f.opacity) < 0.95 || Number(f.parentOpacity) < 0.95), reducedMotion).toBe(reducedMotion === 'no-preference');
      } finally {
        await context.close();
      }
    }
  });

  test('session check screen (held /auth/me) does not apply the account choice', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: REDUCED } });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fallback();
      await held;
      return route.fallback();
    });
    await page.goto('/dashboard');
    await expect(page.getByText('Đang kiểm tra phiên đăng nhập...')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBeNull();
    await expect(page.getByRole('status')).toHaveCount(0);
    release();
    await expectDashboardMotion(page, 'reduced');
  });

  const matrix = [
    { os: 'no-preference', stored: null, expected: 'full' },
    { os: 'no-preference', stored: SYSTEM, expected: 'full' },
    { os: 'no-preference', stored: REDUCED, expected: 'reduced' },
    { os: 'reduce', stored: null, expected: 'reduced' },
    { os: 'reduce', stored: SYSTEM, expected: 'reduced' },
    { os: 'reduce', stored: REDUCED, expected: 'reduced' },
  ] as const;
  for (const row of matrix) {
    test(`signed in: OS ${row.os} × stored ${row.stored ?? 'none'} → ${row.expected}`, async ({ browser, baseURL }) => {
      const { context, page } = await newPage(browser, baseURL, { reducedMotion: row.os });
      try {
        await fixture(page, { storage: row.stored ? { [KEY_A]: row.stored } : {} });
        await page.goto('/dashboard');
        await expectDashboardMotion(page, row.expected);
        // Account menu open/close animation (tw-animate `enter`).
        const startsBefore = (await animStarts(page)).length;
        await openAccountMenu(page, USER_A.email);
        await expect(page.getByRole('menu')).toBeVisible();
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const opened = (await animStarts(page)).slice(startsBefore).filter((n) => n === 'enter');
        expect(opened).toEqual(row.expected === 'full' ? ['enter'] : []);
      } finally {
        await context.close();
      }
    });
  }

  test('first frame: a saved reduced choice never shows the dashboard entrance (frames from page start)', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: REDUCED }, sample: 'hero' });
    await page.goto('/dashboard');
    await waitDashboard(page);
    await page.waitForTimeout(700); // let a would-be 400 ms entrance run its course while sampling
    const seen = await frames(page);
    expect(seen.length).toBeGreaterThan(10);
    for (const frame of seen) {
      expect(frame.opacity, `t=${Math.round(frame.t)}`).toBe('1');
      expect(isIdentity(frame.transform), `t=${Math.round(frame.t)} ${frame.transform}`).toBe(true);
    }
  });

  test('first frame: OS reduce with the system choice never shows the dashboard entrance either', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'reduce' });
    try {
      await fixture(page, { storage: { [KEY_A]: SYSTEM }, sample: 'hero' });
      await page.goto('/dashboard');
      await waitDashboard(page);
      await page.waitForTimeout(700);
      const seen = await frames(page);
      expect(seen.length).toBeGreaterThan(10);
      for (const frame of seen) {
        expect(frame.opacity, `t=${Math.round(frame.t)}`).toBe('1');
        expect(isIdentity(frame.transform), `t=${Math.round(frame.t)} ${frame.transform}`).toBe(true);
      }
    } finally {
      await context.close();
    }
  });

  test('control: with system choice and OS no-preference the dashboard entrance does animate', async ({ page }) => {
    await fixture(page, { sample: 'hero' });
    await page.goto('/dashboard');
    await waitDashboard(page);
    await page.waitForTimeout(700);
    const seen = await frames(page);
    expect(seen.some((f) => Number(f.opacity) < 0.95)).toBe(true);
  });

  test('chart: reduced choice renders final bar geometry from the first frame; data and totals unchanged', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: REDUCED }, sample: 'bar' });
    await page.goto('/trip-history');
    await expect(page.getByText('Tổng quãng đường')).toBeVisible();
    await expect(page.locator('.recharts-bar-rectangle path').first()).toBeVisible();
    await page.waitForTimeout(800);
    const seen = (await frames(page)).filter((f) => f.d);
    expect(seen.length).toBeGreaterThan(5);
    expect(new Set(seen.map((f) => f.d)).size).toBe(1);
    await expect(page.getByText('18.0 km')).toBeVisible();
    await expect(page.getByText('60 phút')).toBeVisible();
    await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(3);
  });

  test('chart control: system choice, OS no-preference — bar geometry changes over frames', async ({ page }) => {
    await fixture(page, { sample: 'bar' });
    await page.goto('/trip-history');
    await expect(page.locator('.recharts-bar-rectangle path').first()).toBeVisible();
    await page.waitForTimeout(1500);
    const seen = (await frames(page)).filter((f) => f.d);
    expect(new Set(seen.map((f) => f.d)).size).toBeGreaterThan(1);
  });
});

test.describe('AC-WEBSETTINGS-02 — OS changes while pages are mounted (WEB-D13, R12-01)', () => {
  test('mounted /login: OS → reduce keeps typed values, focus and selection; hover/tap stop scaling; back again re-enables', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'no-preference' });
    try {
      await fixture(page, { token: null });
      await page.goto('/login');
      const button = page.getByRole('button', { name: 'Đăng nhập', exact: true });
      await expect(button).toBeVisible();
      await page.waitForTimeout(600); // entrance finished
      await page.getByLabel('Email').fill('typed.value@example.com');
      await page.getByLabel('Mật khẩu').fill('typed-password');
      await page.getByLabel('Mật khẩu').evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 5));
      const before = await page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement;
        return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
      });

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect.poll(async () => decorative(await running(page))).toEqual([]);
      expect(await page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement;
        return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
      })).toEqual(before);
      await expect(page.getByLabel('Email')).toHaveValue('typed.value@example.com');
      await expect(page.getByLabel('Mật khẩu')).toHaveValue('typed-password');

      const wrapper = button.locator('xpath=..');
      const sampleTransforms = () => wrapper.evaluate(async (el) => {
        const seen: string[] = [];
        const end = performance.now() + 400;
        while (performance.now() < end) {
          seen.push(getComputedStyle(el).transform);
          await new Promise((r) => requestAnimationFrame(r));
        }
        return seen;
      });
      await button.hover();
      for (const t of await sampleTransforms()) expect(isIdentity(t), `hover ${t}`).toBe(true);
      const box = (await button.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      for (const t of await sampleTransforms()) expect(isIdentity(t), `tap ${t}`).toBe(true);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await expect(page).toHaveURL(/\/login$/); // no submit happened

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await button.hover();
      await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).not.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
      await expect(page.getByLabel('Email')).toHaveValue('typed.value@example.com');
    } finally {
      await context.close();
    }
  });

  test('OS → reduce during the running login entrance stops it at the final state', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'no-preference' });
    try {
      await fixture(page, { token: null, sample: 'login-card' });
      await page.goto('/login');
      await page.waitForFunction(() => (window as unknown as { __frames: Frame[] }).__frames.some((f) => Number(f.opacity) > 0.02 && Number(f.opacity) < 0.6), null, { polling: 'raf' });
      const entranceStart = (await frames(page)).find((f) => Number(f.opacity) < 1)!.t;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const switchedAt = await page.evaluate(() => performance.now() - (window as unknown as { __t0: number }).__t0);
      await page.waitForTimeout(500);
      const after = (await frames(page)).filter((f) => f.t > switchedAt + 34);
      expect(after.some((f) => f.t < entranceStart + 380), 'switch happened before the entrance would have ended').toBe(true);
      for (const f of after) {
        expect(f.opacity, `t=${Math.round(f.t)}`).toBe('1');
        expect(f.parentOpacity, `t=${Math.round(f.t)}`).toBe('1');
        expect(isIdentity(f.transform), `t=${Math.round(f.t)} ${f.transform}`).toBe(true);
      }
      // Completed (stopped) entrance does not replay when the OS goes back.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const resumedAt = await page.evaluate(() => performance.now() - (window as unknown as { __t0: number }).__t0);
      await page.waitForTimeout(500);
      for (const f of (await frames(page)).filter((x) => x.t > resumedAt)) expect(f.opacity).toBe('1');
    } finally {
      await context.close();
    }
  });

  test('OS → reduce during the running dashboard entrance stops it; radar/ping stop; back again resumes decoration only', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'no-preference' });
    try {
      await fixture(page, { sample: 'hero' });
      await page.goto('/dashboard');
      await page.waitForFunction(() => (window as unknown as { __frames: Frame[] }).__frames.some((f) => Number(f.opacity) > 0.02 && Number(f.opacity) < 0.6), null, { polling: 'raf' });
      const entranceStart = (await frames(page)).find((f) => Number(f.opacity) < 1)!.t;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const switchedAt = await page.evaluate(() => performance.now() - (window as unknown as { __t0: number }).__t0);
      await page.waitForTimeout(500);
      const after = (await frames(page)).filter((f) => f.t > switchedAt + 34);
      expect(after.some((f) => f.t < entranceStart + 380), 'switch happened before the entrance would have ended').toBe(true);
      for (const f of after) {
        expect(f.opacity, `t=${Math.round(f.t)}`).toBe('1');
        expect(isIdentity(f.transform), `t=${Math.round(f.t)} ${f.transform}`).toBe(true);
      }
      expect(decorative(await running(page))).toEqual([]);

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect.poll(async () => decorative(await running(page)).sort().join(',')).toBe('ping,radar-ping,radar-ping');
      const resumedAt = await page.evaluate(() => performance.now() - (window as unknown as { __t0: number }).__t0);
      await page.waitForTimeout(400);
      for (const f of (await frames(page)).filter((x) => x.t > resumedAt)) expect(f.opacity).toBe('1');
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      await context.close();
    }
  });

  test('settings page reflects an OS change live; the account choice is unchanged', async ({ page }) => {
    await fixture(page);
    await openSettings(page);
    await expect(main(page).getByText(COPY.os, { exact: true })).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(main(page).getByText(COPY.os, { exact: true })).toBeVisible();
    await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(main(page).getByText(COPY.os, { exact: true })).toHaveCount(0);
  });
});

test.describe('AC-WEBSETTINGS-03 — saved, isolated, kept on logout', () => {
  test('choose → applies at once → reload keeps it; exact stored record; sentinel and token untouched', async ({ page }) => {
    await fixture(page);
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    await expect(status(page)).toHaveText('');

    const stored = await peek(page);
    expect(Object.keys(stored).sort()).toEqual([KEY_A, SENTINEL_KEY].sort());
    expect(JSON.parse(stored[KEY_A]!)).toEqual({ version: 1, motion: 'reduced' });
    expect(Object.keys(JSON.parse(stored[KEY_A]!)).sort()).toEqual(['motion', 'version']);
    expect(stored[SENTINEL_KEY]).toBe(SENTINEL_VALUE);
    expect(stored[KEY_A]).not.toContain(USER_A.email);
    expect(await readToken(page)).toBe(TOKEN_A);

    await page.goto('/dashboard');
    await expectDashboardMotion(page, 'reduced');
    await page.reload();
    await expectDashboardMotion(page, 'reduced');
    await openSettings(page);
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
  });

  test('A reduced → logout (choice kept, /login OS only) → B gets the default → B chooses → A again gets A', async ({ page }) => {
    await fixture(page);
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();

    await logout(page, USER_A.email);
    expect(await readToken(page)).toBeNull();
    expect((await peek(page))[KEY_A]).toBe(REDUCED);
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBeNull();
    await expect.poll(async () => decorative(await running(page))).toEqual(['radar-ping', 'radar-ping']);

    await signIn(page, USER_B.email);
    await expectDashboardMotion(page, 'full');
    await openSettings(page);
    await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    await radio(page, 'Giảm chuyển động').check();
    await radio(page, 'Theo hệ thống').check();
    expect((await peek(page))[KEY_B]).toBe(SYSTEM);
    expect((await peek(page))[KEY_A]).toBe(REDUCED);

    await logout(page, USER_B.email);
    await signIn(page, USER_A.email);
    await expectDashboardMotion(page, 'reduced');
    await openSettings(page);
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    expect((await peek(page))[SENTINEL_KEY]).toBe(SENTINEL_VALUE);
  });

  test('another browser (new context) does not inherit the choice', async ({ page, browser, baseURL }) => {
    await fixture(page);
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();
    const other = await newPage(browser, baseURL);
    try {
      await fixture(other.page);
      await openSettings(other.page);
      await expect(radio(other.page, 'Theo hệ thống')).toBeChecked();
      expect((await peek(other.page))[KEY_A]).toBeUndefined();
    } finally {
      await other.context.close();
    }
  });

  test('no automatic cross-tab sync: the other tab changes only after a reload', async ({ page, context }) => {
    await fixture(page);
    await openSettings(page);
    const second = await context.newPage();
    await fixture(second);
    await openSettings(second);
    await expect(radio(second, 'Theo hệ thống')).toBeChecked();

    await radio(page, 'Giảm chuyển động').check();
    await second.waitForTimeout(300);
    await expect(radio(second, 'Theo hệ thống')).toBeChecked();
    await second.goto('/dashboard');
    await expectDashboardMotion(second, 'reduced');
  });
});

test.describe('storage errors — three separate cases (AC-WEBSETTINGS-04/07/08)', () => {
  for (const mode of ['get', 'getter'] as const) {
    test(`(a) read fails (${mode}) on a Dashboard deep link: shared status shows at once, system applied, token kept`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const { calls } = await fixture(page, { storage: { [KEY_A]: REDUCED }, fail: [mode] });
      await page.goto('/dashboard');
      await waitDashboard(page);
      await expect(status(page)).toHaveText(COPY.readFailed);
      await expect(status(page)).toHaveCount(1);
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
      await expectDashboardMotion(page, 'full');
      await expect(page.getByRole('heading', { name: 'Đã có lỗi xảy ra' })).toHaveCount(0);
      expect(await readToken(page)).toBe(TOKEN_A);
      expect(errors).toEqual([]);
      onlyReads(calls);
    });
  }

  test('(a) with OS reduce: notice shown and motion still reduced', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { reducedMotion: 'reduce' });
    try {
      await fixture(page, { fail: ['get'] });
      await page.goto('/dashboard');
      await expect(status(page)).toHaveText(COPY.readFailed);
      await expectDashboardMotion(page, 'reduced');
    } finally {
      await context.close();
    }
  });

  test('(a)/(c) notice on Help and Profile deep links; Settings shows the same single status; Back keeps it; no focus move', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: '{"version":1,"motion":"reduced","x":1}' } });
    for (const path of ['/help', '/account/profile']) {
      await page.goto(path);
      await expect(status(page)).toHaveText(COPY.invalid);
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
    }
    await openAccountMenu(page, USER_A.email);
    await page.getByRole('menuitem', { name: 'Cài đặt ứng dụng' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('status')).toHaveCount(1);
    await expect(status(page)).toHaveText(COPY.invalid);
    await expect(page.getByText(COPY.invalid)).toHaveCount(1);
    await expect(radio(page, 'Theo hệ thống')).toBeChecked();
    await page.goBack();
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(status(page)).toHaveText(COPY.invalid);
  });

  test('(a)/(c) logout and account switch do not carry A\'s notice to /login or to B', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: 'not-json' } });
    await page.goto('/dashboard');
    await expect(status(page)).toHaveText(COPY.invalid);
    await logout(page, USER_A.email);
    await expect(page.getByText(COPY.invalid)).toHaveCount(0);
    await signIn(page, USER_B.email);
    await expect(status(page)).toHaveText('');
    await expect(page.getByText(COPY.invalid)).toHaveCount(0);
  });

  test('(a) read always fails but write succeeds: choice applies and the read warning clears (R12-02)', async ({ page }) => {
    await fixture(page, { fail: ['get'] });
    await openSettings(page);
    await expect(status(page)).toHaveText(COPY.readFailed);
    await radio(page, 'Giảm chuyển động').check();
    await expect(status(page)).toHaveText('');
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    expect((await peek(page))[KEY_A]).toBe(REDUCED);
    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    await expectDashboardMotion(page, 'reduced');
    await expect(status(page)).toHaveText('');
  });

  test('(b) write fails: choice kept and applied, notice shown, focus stays; persists through same-tab logout→login; B unaffected', async ({ page }) => {
    await fixture(page, { fail: ['set'] });
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    await expect(radio(page, 'Giảm chuyển động')).toBeFocused();
    await expect(status(page)).toHaveText(COPY.writeFailed);
    expect((await peek(page))[KEY_A]).toBeUndefined();
    expect(await readToken(page)).toBe(TOKEN_A);

    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    await expectDashboardMotion(page, 'reduced');
    await expect(status(page)).toHaveText(COPY.writeFailed);

    await logout(page, USER_A.email);
    await signIn(page, USER_B.email);
    await expectDashboardMotion(page, 'full');
    await expect(status(page)).toHaveText('');
    await logout(page, USER_B.email);
    await signIn(page, USER_A.email);
    await expectDashboardMotion(page, 'reduced');
    await expect(status(page)).toHaveText(COPY.writeFailed);
  });

  test('(b) write fails then later succeeds: the write warning clears', async ({ page }) => {
    await fixture(page, { fail: ['set'] });
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();
    await expect(status(page)).toHaveText(COPY.writeFailed);
    await setFail(page, []);
    await radio(page, 'Theo hệ thống').check();
    await expect(status(page)).toHaveText('');
    expect((await peek(page))[KEY_A]).toBe(SYSTEM);
  });

  test('(b) failed write over an older durable choice: current choice now, the durable one after reload', async ({ page }) => {
    await fixture(page, { storage: { [KEY_A]: REDUCED }, fail: ['set'] });
    await openSettings(page);
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    await radio(page, 'Theo hệ thống').check();
    await expect(status(page)).toHaveText(COPY.writeFailed);
    await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
    await expectDashboardMotion(page, 'full');

    await page.reload();
    await expectDashboardMotion(page, 'reduced');
    await expect(status(page)).toHaveText('');
    await openSettings(page);
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
    expect((await peek(page))[KEY_A]).toBe(REDUCED);
  });

  const invalid: [string, string][] = [
    ['not JSON', 'not-json'],
    ['version 2', '{"version":2,"motion":"reduced"}'],
    ['unknown enum', '{"version":1,"motion":"fast"}'],
    ['extra field (U12)', '{"version":1,"motion":"reduced","x":1}'],
  ];
  for (const [name, raw] of invalid) {
    test(`(c) ${name}: system + notice, record untouched until the next valid save replaces it`, async ({ page }) => {
      await fixture(page, { storage: { [KEY_A]: raw } });
      await openSettings(page);
      await expect(status(page)).toHaveText(COPY.invalid);
      await expect(radio(page, 'Theo hệ thống')).toBeChecked();
      expect((await peek(page))[KEY_A]).toBe(raw);
      await page.goto('/dashboard');
      await expectDashboardMotion(page, 'full');
      await openSettings(page);
      await radio(page, 'Giảm chuyển động').check();
      await expect(status(page)).toHaveText('');
      expect((await peek(page))[KEY_A]).toBe(REDUCED);
      expect(await readToken(page)).toBe(TOKEN_A);
    });
  }
});

test.describe('AC-WEBSETTINGS-05 — business behaviour unchanged', () => {
  test('live map with reduced choice: several broadcasts all move the marker and update speed', async ({ page }) => {
    const { sendPosition, calls } = await fixture(page, { storage: { [KEY_A]: REDUCED }, activeTrip: true });
    await page.goto('/start-trip');
    await expect(page.getByText('31 km/h', { exact: false })).toBeVisible();
    const marker = page.locator('.maplibregl-marker');
    let last = (await marker.boundingBox())!;
    for (const speed of [32, 33, 34]) {
      sendPosition(speed);
      await expect(page.getByText(`${speed} km/h`, { exact: false })).toBeVisible();
      await expect.poll(async () => {
        const box = (await marker.boundingBox())!;
        return Math.abs(box.x - last.x) + Math.abs(box.y - last.y);
      }).toBeGreaterThan(0.5);
      last = (await marker.boundingBox())!;
    }
    onlyReads(calls);
    expect(await page.evaluate(() => (window as unknown as { __sensitiveApiCalls: string[] }).__sensitiveApiCalls)).toEqual([]);
  });

  test('requests are the same with full and reduced motion (dashboard, vehicles, trip history)', async ({ browser, baseURL }) => {
    const seen: string[][] = [];
    for (const stored of [SYSTEM, REDUCED]) {
      const { context, page } = await newPage(browser, baseURL);
      try {
        const { calls } = await fixture(page, { storage: { [KEY_A]: stored } });
        await page.goto('/dashboard');
        await waitDashboard(page);
        await page.getByRole('link', { name: 'Quản lý phương tiện', exact: true }).first().click();
        await expect(page.getByText('MOTION-01')).toBeVisible();
        await page.getByRole('link', { name: 'Lịch sử chuyến đi', exact: true }).first().click();
        await expect(page.getByText('Tổng quãng đường')).toBeVisible();
        onlyReads(calls);
        // The session check is compared by shape only: in the dev build
        // StrictMode starts it twice and the first, superseded request may or
        // may not reach the network (WEB-01 behaviour, unrelated to motion).
        for (const call of calls.filter((c) => c.path === '/api/auth/me')) expect(call).toEqual({ method: 'GET', path: '/api/auth/me', token: `Bearer ${TOKEN_A}`, body: null });
        seen.push(calls.filter((c) => c.path !== '/api/auth/me').map((c) => `${c.method} ${c.path} ${c.token} ${c.body}`));
      } finally {
        await context.close();
      }
    }
    expect(seen[1]).toEqual(seen[0]);
  });
});

test.describe('NFR-RWD / WEB-T10 — reflow, menu, touch', () => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    test(`${viewport.width}×${viewport.height}: settings and a long status reflow inside main; 44px choices`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fixture(page, { fail: ['set'] });
      await openSettings(page);
      await radio(page, 'Giảm chuyển động').check();
      await expect(status(page)).toHaveText(COPY.writeFailed);
      const report = await main(page).evaluate((mainEl) => {
        const m = mainEl.getBoundingClientRect();
        const problems: string[] = [];
        for (const el of mainEl.querySelectorAll<HTMLElement>('h1, legend, p, label, span')) {
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          if (r.left < m.left - 1 || r.right > m.right + 1) problems.push(`${el.tagName} ${el.textContent?.slice(0, 20)} box`);
          const range = document.createRange();
          range.selectNodeContents(el);
          for (const g of range.getClientRects()) if (g.width && (g.left < m.left - 1 || g.right > m.right + 1)) problems.push(`${el.tagName} glyph`);
        }
        return { problems: [...new Set(problems)], documentScrolls: document.documentElement.scrollWidth > innerWidth, mainScrolls: mainEl.scrollWidth > mainEl.clientWidth + 1 };
      });
      expect(report).toEqual({ problems: [], documentScrolls: false, mainScrolls: false });
      for (const name of ['Theo hệ thống', 'Giảm chuyển động'] as const) {
        const label = main(page).locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) });
        const box = (await label.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test('CSS text stress (html 32px, not native zoom) at 320×568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await fixture(page);
    await openSettings(page);
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await radio(page, 'Giảm chuyển động').scrollIntoViewIfNeeded();
    await radio(page, 'Giảm chuyển động').check();
    await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1023, height: 800 }]) {
    test(`reduced choice, account menu at ${viewport.width}×${viewport.height}: inside the viewport, closes and unmounts, focus returns`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fixture(page, { storage: { [KEY_A]: REDUCED } });
      await page.goto('/dashboard');
      await waitDashboard(page);
      await openAccountMenu(page, USER_A.email);
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      expect((await animStarts(page)).filter((n) => n === 'enter' || n === 'exit')).toEqual([]);
      await expect.poll(async () => {
        const box = (await menu.boundingBox())!;
        return box.y >= 0 && box.y + box.height <= viewport.height + 1 && box.x >= 0 && box.x + box.width <= viewport.width + 1;
      }).toBe(true);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(page.getByRole('button', { name: `Tài khoản: ${USER_A.email}` })).toBeFocused();
    });
  }

  test('resize across 1025/1024/1023 and orientation keeps the choice and focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fixture(page);
    await openSettings(page);
    await radio(page, 'Giảm chuyển động').check();
    for (const size of [{ width: 1025, height: 800 }, { width: 1024, height: 800 }, { width: 1023, height: 800 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
      await expect(radio(page, 'Giảm chuyển động')).toBeFocused();
    }
  });

  test('touch/DPR2 at 390×844: tapping a label chooses and saves', async ({ browser, baseURL }) => {
    const { context, page } = await newPage(browser, baseURL, { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
    try {
      await fixture(page);
      await openSettings(page);
      await main(page).getByText('Giảm chuyển động', { exact: true }).tap();
      await expect(radio(page, 'Giảm chuyển động')).toBeChecked();
      expect((await peek(page))[KEY_A]).toBe(REDUCED);
    } finally {
      await context.close();
    }
  });
});

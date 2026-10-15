import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import type { Vehicle } from '../src/services/vehiclesService';

// WEB-06: real VehicleForm UI, synthetic transport. CSS font stress and
// viewport/touch emulation are not native zoom or a real software keyboard.
const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-vehicle-form-token';
const USER = { id: '00000000-0000-4000-8000-000000000006', email: 'vehicle.form@example.com' };
const PLATE = 'DEMO-LONG-PLATE-0001';
const BRAND = 'LongNavigationResearchVehicleModel'.repeat(4).slice(0, 100);
const ERROR = `Không thể lưu phương tiện ${'navigation.reference.'.repeat(14)}. Hãy thử lại sau.`;
const ID = '00000000-0000-4000-8000-000000000016';
const CREATED_ID = '00000000-0000-4000-8000-000000000099';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const vehicle = (active = false): Vehicle => ({ id: ID, type: 'motorbike', license_plate: PLATE, brand_model: BRAND, is_active: active });
const form = (page: Page) => page.locator('form');
const type = (page: Page) => page.getByLabel('Loại xe', { exact: true });
const plate = (page: Page) => page.getByLabel('Biển số', { exact: true });
const brand = (page: Page) => page.getByLabel('Hãng/Dòng xe (tuỳ chọn)', { exact: true });
const save = (page: Page) => page.getByRole('button', { name: 'Lưu', exact: true });
const cancel = (page: Page) => page.getByRole('button', { name: 'Huỷ', exact: true });
interface Call { method: string; path: string; body: unknown; token?: string }
interface FixtureOptions {
  error?: boolean;
  holdWrite?: (route: Route, complete: () => Promise<void>) => Promise<void>;
}

async function fixture(page: Page, initial: Vehicle[] = [], options: FixtureOptions = {}) {
  let rows = initial.map((row) => ({ ...row }));
  const calls: Call[] = [];
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [TOKEN_KEY, TOKEN]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const method = request.method();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ method, path, body, token: request.headers()['authorization'] });
    const json = (status: number, value: unknown) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(value) });
    if (path === '/api/auth/me' && method === 'GET') return json(200, USER);
    if (path === '/api/vehicles' && method === 'GET') return json(200, { vehicles: rows });
    if ((path === '/api/vehicles' && method === 'POST') || (path === `/api/vehicles/${ID}` && method === 'PATCH')) {
      const complete = async () => {
        if (options.error) return json(method === 'POST' ? 400 : 403, { error_code: method === 'POST' ? 'VALIDATION_ERROR' : 'NOT_VEHICLE_OWNER', message: ERROR });
        if (method === 'POST') {
          const row = { id: CREATED_ID, ...body, brand_model: body.brand_model ?? null, is_active: false } as Vehicle;
          rows.push(row);
          return json(201, row);
        }
        rows = rows.map((row) => row.id === ID ? { ...row, ...body } : row);
        return json(200, rows.find((row) => row.id === ID));
      };
      return options.holdWrite ? options.holdWrite(route, complete) : complete();
    }
    return json(500, { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' });
  });
  return calls;
}

async function open(page: Page, mode: 'create' | 'edit' = 'create') {
  await page.goto('/vehicles');
  if (mode === 'create') await page.getByRole('button', { name: 'Thêm phương tiện', exact: true }).click();
  else await page.getByRole('button', { name: `Sửa phương tiện ${PLATE}`, exact: true }).click();
  await expect(form(page)).toBeVisible();
}

async function fill(page: Page, includeBrand = true) {
  await type(page).selectOption('car');
  await plate(page).fill(PLATE);
  await brand(page).fill(includeBrand ? BRAND : '');
}

async function reachable(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 0.99 });
  const bounds = await target.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
}

async function contained(page: Page) {
  const failures = await form(page).evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    return [...el.querySelectorAll('label, input, select, button, p')].flatMap((node) => {
      const child = node as HTMLElement;
      const box = child.getBoundingClientRect();
      // Native single-line inputs can scroll their value horizontally. Check
      // their box, not scrollWidth; labels/errors/actions must fully reflow.
      const nativeValue = child.matches('input, select');
      return box.left < bounds.left - 1 || box.right > bounds.right + 1 || (!nativeValue && (child.scrollWidth > child.clientWidth + 1 || child.scrollHeight > child.clientHeight + 1))
        ? [{ tag: child.tagName, text: child.textContent, left: box.left, right: box.right, bounds: { left: bounds.left, right: bounds.right }, width: child.clientWidth, scrollWidth: child.scrollWidth }]
        : [];
    });
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

function writes(calls: Call[]) { return calls.filter((call) => call.method !== 'GET'); }
function authenticated(calls: Call[]) {
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => call.token === `Bearer ${TOKEN}`)).toBe(true);
}

test.describe('responsive vehicle form — fixture UI', () => {
  test.beforeAll(async ({ browser }) => {
    console.info(`WEB-06 fixture browser: ${browser.version()}`);
  });

  for (const viewport of [
    { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 720 },
    { width: 844, height: 390 }, { width: 1024, height: 768 },
    { width: 639, height: 800 }, { width: 640, height: 800 }, { width: 641, height: 800 },
  ]) test(`create controls fit WEB-T05 ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const calls = await fixture(page);
    await open(page);
    await fill(page);
    await contained(page);
    for (const control of [type(page), plate(page), brand(page), save(page), cancel(page)]) await reachable(control);
    await expect(plate(page)).toHaveValue(PLATE);
    await expect(brand(page)).toHaveValue(BRAND);
    expect(PLATE).toHaveLength(20);
    expect(BRAND).toHaveLength(100);
    expect(writes(calls)).toEqual([]);
    authenticated(calls);
  });

  test('wide viewport with a narrow actual form container stays single-column', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await fixture(page);
    await open(page);
    // Deliberately constrain this real component without changing viewport:
    // it must not select three columns merely because window >= sm.
    await form(page).evaluate((el) => { el.style.width = '280px'; el.style.maxWidth = '100%'; });
    await fill(page);
    await contained(page);
    const boxes = await Promise.all([type(page), plate(page), brand(page)].map((control) => control.boundingBox()));
    expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y + boxes[1]!.height);
    for (const control of [type(page), plate(page), brand(page), save(page), cancel(page)]) await reachable(control);
  });

  for (const active of [false, true]) test(`edit ${active ? 'active' : 'inactive'} vehicle keeps values and focus through sm/lg/low-height resize`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = await fixture(page, [vehicle(active)]);
    await open(page, 'edit');
    await expect(type(page)).toHaveValue('motorbike');
    await expect(plate(page)).toHaveValue(PLATE);
    await expect(brand(page)).toHaveValue(BRAND);
    await brand(page).fill('Edited Value With Spaces');
    await brand(page).focus();
    for (const width of [639, 640, 641, 1023, 1024, 1025, 844, 320, 390]) {
      await page.setViewportSize({ width, height: width === 844 ? 260 : 568 });
      await expect(page).toHaveURL(/\/vehicles$/);
      await expect(brand(page)).toHaveValue('Edited Value With Spaces');
      await expect(brand(page)).toBeFocused();
      await contained(page);
    }
    await cancel(page).click();
    await expect(form(page)).toHaveCount(0);
    const row = page.getByRole('article', { name: `Phương tiện ${PLATE}`, exact: true });
    await expect(row.getByText(BRAND, { exact: true })).toBeVisible();
    await expect(row.getByText('Đang hoạt động', { exact: true })).toHaveCount(active ? 1 : 0);
    expect(writes(calls)).toEqual([]);
  });

  for (const mode of ['create', 'edit'] as const) test(`${mode} long API error has an associated summary and retains values at doubled CSS text`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, mode === 'edit' ? [vehicle(true)] : [], { error: true });
    await open(page, mode);
    await fill(page);
    await save(page).click();
    await expect(page.getByRole('alert')).toHaveText(ERROR);
    const errorId = await page.getByRole('alert').getAttribute('id');
    expect(errorId).toBeTruthy();
    await expect(form(page)).toHaveAttribute('aria-describedby', errorId!);
    await expect(form(page)).toHaveAttribute('aria-busy', 'false');
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await contained(page);
    for (const control of [type(page), plate(page), brand(page), save(page), cancel(page)]) await reachable(control);
    await expect(plate(page)).toHaveValue(PLATE);
    await expect(brand(page)).toHaveValue(BRAND);
    await expect(plate(page)).not.toHaveAttribute('aria-invalid', 'true');
    expect(writes(calls)).toEqual([{ method: mode === 'create' ? 'POST' : 'PATCH', path: mode === 'create' ? '/api/vehicles' : `/api/vehicles/${ID}`, body: { type: 'car', license_plate: PLATE, brand_model: BRAND }, token: `Bearer ${TOKEN}` }]);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(TOKEN);
  });

  test('empty required plate keeps native validation and sends no request', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 300 });
    const calls = await fixture(page);
    await open(page);
    await save(page).click();
    await expect(plate(page)).toBeFocused();
    expect(await plate(page).evaluate((el) => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(writes(calls)).toEqual([]);
    await contained(page);
    await reachable(plate(page));
    await reachable(cancel(page));
  });

  for (const includeBrand of [false, true]) test(`create preserves exact payload with brand ${includeBrand ? 'present' : 'omitted'}`, async ({ page }) => {
    const calls = await fixture(page);
    await open(page);
    await fill(page, includeBrand);
    await save(page).click();
    await expect(form(page)).toHaveCount(0);
    await expect(page.getByRole('article', { name: `Phương tiện ${PLATE}`, exact: true })).toHaveCount(1);
    expect(writes(calls)).toEqual([{ method: 'POST', path: '/api/vehicles', body: { type: 'car', license_plate: PLATE, ...(includeBrand ? { brand_model: BRAND } : {}) }, token: `Bearer ${TOKEN}` }]);
    authenticated(calls);
  });

  for (const active of [false, true]) test(`successful edit preserves ${active ? 'active' : 'inactive'} state and the exact PATCH contract`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const calls = await fixture(page, [vehicle(active)]);
    await open(page, 'edit');
    await type(page).selectOption('car');
    await brand(page).fill('Edited Navigation Vehicle');
    await save(page).click();
    await expect(form(page)).toHaveCount(0);
    const row = page.getByRole('article', { name: `Phương tiện ${PLATE}`, exact: true });
    await expect(row.getByText('Edited Navigation Vehicle', { exact: true })).toBeVisible();
    await expect(row.getByText('Đang hoạt động', { exact: true })).toHaveCount(active ? 1 : 0);
    expect(writes(calls)).toEqual([{ method: 'PATCH', path: `/api/vehicles/${ID}`, body: { type: 'car', license_plate: PLATE, brand_model: 'Edited Navigation Vehicle' }, token: `Bearer ${TOKEN}` }]);
    authenticated(calls);
  });

  test('pending submission exposes busy state, disables only Save and retains values through resize', async ({ page }) => {
    let complete: (() => Promise<void>) | undefined;
    const calls = await fixture(page, [], { holdWrite: async (_route, finish) => { complete = finish; } });
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await fill(page);
    await save(page).click();
    await expect.poll(() => Boolean(complete)).toBe(true);
    await expect(form(page)).toHaveAttribute('aria-busy', 'true');
    const pending = page.getByRole('button', { name: 'Đang lưu...', exact: true });
    await expect(pending).toBeDisabled();
    await expect(cancel(page)).toBeEnabled();
    await brand(page).focus();
    for (const width of [1023, 1024, 1025, 320]) {
      await page.setViewportSize({ width, height: 300 });
      await expect(brand(page)).toBeFocused();
      await expect(plate(page)).toHaveValue(PLATE);
      await expect(brand(page)).toHaveValue(BRAND);
      await contained(page);
      await reachable(pending);
      await reachable(cancel(page));
    }
    expect(writes(calls)).toHaveLength(1);
    await complete!();
    await expect(form(page)).toHaveCount(0);
  });

  test('Cancel while POST is pending preserves existing non-aborting semantics', async ({ page }) => {
    let complete: (() => Promise<void>) | undefined;
    let held: Route | undefined;
    const calls = await fixture(page, [], { holdWrite: async (route, finish) => { held = route; complete = finish; } });
    await open(page);
    await fill(page);
    await save(page).click();
    await expect.poll(() => Boolean(complete)).toBe(true);
    await cancel(page).click();
    await expect(form(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/vehicles$/);
    expect(held!.request().failure()).toBeNull();
    await complete!();
    await expect(page.getByRole('article', { name: `Phương tiện ${PLATE}`, exact: true })).toHaveCount(1);
    expect(writes(calls)).toHaveLength(1);
    authenticated(calls);
  });

  test('logical keyboard order and touch/DPR2 form controls remain usable', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      const calls = await fixture(page);
      await open(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints, dpr: devicePixelRatio }))).toEqual({ touch: 1, dpr: 2 });
      await type(page).focus();
      for (const control of [plate(page), brand(page), save(page), cancel(page)]) {
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await reachable(control);
        expect(await control.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
        expect(await control.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
      }
      await plate(page).fill(PLATE);
      await reachable(cancel(page));
      await cancel(page).tap();
      await expect(form(page)).toHaveCount(0);
      expect(writes(calls)).toEqual([]);
    } finally { await context.close(); }
  });
});

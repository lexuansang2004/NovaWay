import { expect, test, type Locator, type Page } from '@playwright/test';
import { HELP_SECTIONS } from '../src/pages/helpContent';

// WEB-10 / WEB-T11 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.5; AC-WEBHELP-01…05).
//
// FIXTURE UI — the real app (router, AppLayout guard, session store, shell and
// the help page) runs unchanged; only the REST transport is a Playwright route
// fixture. Every request is recorded with method, path, Bearer and body, so
// "the help page sends nothing but the session check" is asserted on the wire.
// Requests made by a destination page after following a help link are checked
// separately from the help page's own traffic. Synthetic accounts only.
//
// CSS text stress (html font-size 32px) is a stress test, NOT native browser
// zoom or native text-only zoom; those are separate checks outside this file.

const TOKEN_KEY = 'novaway_web_token';
const TOKEN = 'fixture-help-token';
const USER = { id: '00000000-0000-4000-8000-0000000010a1', email: 'help.reader@example.com' };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

// Order and labels of the table of contents (AC-WEBHELP-01), written out here
// rather than read from helpContent.ts so a reorder or rename fails the test.
const SECTIONS = [
  ['dang-nhap', 'Đăng nhập và phiên đăng nhập'],
  ['phuong-tien', 'Quản lý phương tiện'],
  ['vi-tri', 'Xem vị trí chuyến đi'],
  ['lich-su', 'Lịch sử và thống kê chuyến đi'],
  ['quyen-rieng-tu', 'Quyền riêng tư'],
  ['loi-thuong-gap', 'Lỗi thường gặp'],
] as const;

// Every link inside <main>, in DOM order: the TOC, one route per topic
// (spec §4.5 "Route đích"), and the in-page pointer from "Lỗi thường gặp".
const ALL_HREFS = [
  ...SECTIONS.map(([id]) => `#${id}`),
  '/login', '/vehicles', '/start-trip', '/trip-history', '/account/privacy', '#vi-tri',
];

// Spec §4.5: none of these may appear on the page. Case-insensitive.
// "trên điện thoại" (the phone app) is allowed; a phone number, email, contact
// channel, ticket/chat, a start-trip instruction, internals/debug, Offline Sync
// or privacy-policy wording is not.
//
// AGENTS.md terminology is not checked by listing prohibited words here (the
// rule forbids them in code too). Instead the whole visible text of <main> must
// be exactly the approved copy: the headings, intro and labels written out in
// APPROVED_FRAME below plus the H-01…H-26 items, so no other wording can appear.
const FORBIDDEN = [
  'liên hệ', 'hotline', 'số điện thoại', 'tổng đài', 'hỗ trợ viên', 'gửi yêu cầu', 'ticket', 'chat', 'form', '@', 'http', 'www.',
  'khuôn mặt', 'chụp ảnh', 'gửi ảnh', 'selfie',
  'bắt đầu chuyến đi', 'nhấn bắt đầu', 'kết thúc chuyến đi trên web',
  'offline', 'đồng bộ',
  'chính sách', 'thời hạn lưu', 'lưu trữ', 'bên thứ ba', 'nhà cung cấp',
  'token', 'jwt', 'api', 'websocket', 'socket', 'debug', 'trip id', 'localhost', 'sessionstorage',
  'đã gửi thành công', 'chúng tôi sẽ phản hồi', 'khôi phục', 'cấp quyền',
];

const INTRO = 'Hướng dẫn ngắn cho các chức năng đang có trên trang web NovaWay. Chọn một mục để đi tới phần tương ứng.';
const SECTION_LINKS: Record<string, string> = {
  'dang-nhap': 'Mở trang Đăng nhập',
  'phuong-tien': 'Mở Quản lý phương tiện',
  'vi-tri': 'Mở Vị trí trực tiếp',
  'lich-su': 'Mở Lịch sử chuyến đi',
  'quyen-rieng-tu': 'Mở trang Quyền riêng tư',
  'loi-thuong-gap': 'Đi tới mục Xem vị trí chuyến đi',
};

// Statements the acceptance criteria rest on, written out here (not read from
// helpContent.ts) so dropping or weakening one fails the test.
const REQUIRED = {
  // AC-WEBHELP-01: web only views a trip; the phone app starts and ends it;
  // an empty map is not proof there is no trip (WEB-G07).
  roles: [
    'Trang Vị trí trực tiếp chỉ dùng để xem chuyến đi đang diễn ra. Trang web không có nút bắt đầu hay kết thúc chuyến đi; việc bắt đầu và kết thúc chuyến đi thuộc ứng dụng NovaWay trên điện thoại.',
    'Thông báo này không chắc chắn rằng không có chuyến đi.',
  ],
  // AC-WEBHELP-02: add / edit / delete / set active, as the vehicles page does
  // it, and the active badge is not a trip.
  vehicles: [
    'Thêm xe: chọn “Thêm phương tiện”, chọn Loại xe (Xe máy hoặc Ô tô), nhập Biển số (bắt buộc) và Hãng/Dòng xe nếu muốn, rồi chọn “Lưu”.',
    'Sửa xe: chọn nút Sửa (biểu tượng bút chì) ở dòng của xe, chỉnh thông tin rồi chọn “Lưu”.',
    'Xoá xe: chọn nút Xoá (biểu tượng thùng rác), rồi chọn “Xoá” khi trang hỏi “Xoá phương tiện này?”. Chọn “Huỷ” nếu bạn đổi ý.',
    'Chọn “Đặt đang dùng” để đặt một xe làm xe đang dùng; xe đó có nhãn “Đang hoạt động”. Mỗi lúc chỉ có một xe ở trạng thái này: xe đang dùng trước đó sẽ tự bỏ nhãn. Xe mới thêm chưa phải xe đang dùng.',
    'Nhãn “Đang hoạt động” chỉ cho biết xe bạn đã chọn để dùng. Nhãn này không có nghĩa xe đang di chuyển hay đang có chuyến đi.',
  ],
  // H-02 / H-03 (review R02, R03): when the session is checked, and what a
  // failed check does and does not do. Source: useSessionCheck.ts:13–32
  // (on AppLayout mount), authSession.ts:131–149, 174–176, 192–195.
  session: [
    'Khi bạn mở hoặc tải lại trang web NovaWay ở một trang cần đăng nhập, hoặc ngay sau khi đăng nhập, NovaWay kiểm tra phiên đăng nhập với máy chủ. Chuyển giữa các trang trong ứng dụng không kiểm tra lại mỗi lần. Nếu máy chủ báo phiên không còn hợp lệ, bạn được đưa về trang Đăng nhập để đăng nhập lại.',
    'Nếu chưa kiểm tra được phiên (ví dụ mất mạng, máy chủ gặp sự cố hoặc phải chờ quá lâu), trang hiện thông báo kèm hai nút “Thử lại” và “Đăng nhập lại”. Những lỗi này tự chúng không đăng xuất bạn. Khi bạn chọn “Thử lại”, nếu máy chủ báo phiên không còn hợp lệ, bạn được đưa về trang Đăng nhập. Chọn “Đăng nhập lại” là chủ động bỏ phiên hiện tại để đăng nhập lại.',
  ],
  // N01: privacy is a link only while WEB-11's content gate is open.
  privacy: ['Mở trang Quyền riêng tư từ liên kết bên dưới.'],
  // AC-WEBHELP-03: network, expired session and a map without a position.
  errors: [
    'Không gửi mật khẩu hoặc mã đăng nhập của bạn cho bất kỳ ai. Chỉ nhập mật khẩu tại trang Đăng nhập.',
    'Mất mạng: trang có thể báo không tải được dữ liệu, hoặc báo chưa kiểm tra được phiên đăng nhập. Kiểm tra kết nối mạng rồi tải lại trang; nếu trang có nút “Thử lại”, bạn có thể chọn nút đó.',
    'Phiên hết hạn: nếu bạn được đưa về trang Đăng nhập, hãy đăng nhập lại bằng email và mật khẩu của bạn.',
    'Bản đồ chưa có vị trí: xem lại hướng dẫn trong mục Xem vị trí chuyến đi.',
  ],
};

interface ApiCall {
  method: string;
  path: string;
  token?: string;
  body: string | null;
}

interface FixtureOptions {
  token?: string | null;
  me?: 'ok' | 401 | 'network';
  email?: string;
  // Read on every /auth/me, so a test can change the answer mid-flow.
  control?: { me: 'ok' | 401 | 'network' };
}

// Seeds the token once per context (addInitScript re-runs on every load, so
// without the marker a reload would resurrect a token the app had cleared).
async function fixture(page: Page, options: FixtureOptions = {}) {
  const calls: ApiCall[] = [];
  const token = options.token === undefined ? TOKEN : options.token;
  if (token) {
    await page.addInitScript(
      ([key, value]) => {
        if (sessionStorage.getItem('__help_seeded')) return;
        sessionStorage.setItem('__help_seeded', '1');
        sessionStorage.setItem(key, value);
      },
      [TOKEN_KEY, token],
    );
  }
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
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    const path = new URL(request.url()).pathname;
    const bearer = request.headers()['authorization'];
    calls.push({ method: request.method(), path, token: bearer, body: request.postData() });
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
    const authorised = bearer === `Bearer ${TOKEN}`;
    if (path === '/api/auth/me' && request.method() === 'GET') {
      const me = options.control?.me ?? options.me;
      if (me === 'network') return route.abort('failed');
      if (me === 401 || !authorised) return json(401, { error_code: 'UNAUTHORIZED', message: 'fixture' });
      return json(200, { ...USER, email: options.email ?? USER.email });
    }
    // Read-only answers for the destination pages' own requests.
    if (authorised && request.method() === 'GET' && path === '/api/vehicles') return json(200, { vehicles: [] });
    if (authorised && request.method() === 'GET' && path === '/api/trips') return json(200, { trips: [] });
    return json(500, { error_code: 'UNEXPECTED_FIXTURE_REQUEST', message: 'Unexpected fixture request' });
  });
  return calls;
}

const main = (page: Page) => page.getByRole('main');
const heading = (page: Page) => main(page).getByRole('heading', { level: 1, name: 'Trợ giúp', exact: true });
const toc = (page: Page) => main(page).getByRole('navigation', { name: 'Mục lục trợ giúp' });
const tocLink = (page: Page, title: string) => toc(page).getByRole('link', { name: title, exact: true });
const sectionHeading = (page: Page, id: string) => main(page).locator(`h2#${id}`);
const mainLink = (page: Page, name: string) => main(page).getByRole('link', { name, exact: true });
const readToken = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

// Collects page errors and console errors. The global ErrorBoundary catches a
// render/effect exception (so there is no pageerror) and logs it with
// console.error, so both are watched.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 200)}`);
  });
  return errors;
}

const globalFallback = (page: Page) => page.getByRole('heading', { name: 'Đã có lỗi xảy ra', exact: true });

async function expectHelp(page: Page) {
  await expect(heading(page)).toBeVisible();
  await expect(toc(page)).toBeVisible();
  await expect(main(page).locator('[data-help-id]')).toHaveCount(HELP_SECTIONS.flatMap((s) => s.items).length);
}

// Every request while only the help page was open: the session check alone,
// GET /api/auth/me with the current Bearer and no body.
function onlySessionChecks(calls: ApiCall[]) {
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) expect(call).toEqual({ method: 'GET', path: '/api/auth/me', token: `Bearer ${TOKEN}`, body: null });
}

async function noSensitiveApis(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __sensitiveApiCalls: string[] }).__sensitiveApiCalls)).toEqual([]);
}

// The target is inside the visible part of <main> (below the mobile header,
// which sits outside main) and a hit-test at two points of its first line
// lands on the target itself — nothing covers it. The points sit inside the
// box rather than on its corner, where a rounded border is not hit-testable.
async function expectUncovered(target: Locator) {
  const report = await target.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const mainBox = el.closest('main')!.getBoundingClientRect();
    const y = rect.top + Math.min(rect.height / 2, 16);
    const points: [number, number][] = [
      [rect.left + Math.min(rect.width / 4, 24), y],
      [rect.left + rect.width / 2, y],
    ];
    const hits = points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit));
    });
    return {
      hits,
      belowMainTop: rect.top >= mainBox.top - 1,
      aboveViewportBottom: rect.top + Math.min(rect.height, 12) <= window.innerHeight + 1,
    };
  });
  expect(report).toEqual({ hits: [true, true], belowMainTop: true, aboveViewportBottom: true });
}

async function expectAtSection(page: Page, id: string) {
  await expect(page).toHaveURL(new RegExp(`/help#${id}$`));
  await expect(sectionHeading(page, id)).toBeFocused();
  await expectUncovered(sectionHeading(page, id));
}

// No horizontal page or main scroll; every text block and link of the page
// sits inside <main> (box and rendered glyphs), is not cut by its own box,
// is not truncated with an ellipsis, and every ancestor up to <main> contains
// it. overflow:hidden would fail the containment checks, not pass them.
async function expectLayoutReadable(page: Page) {
  const report = await main(page).evaluate((mainEl) => {
    const m = mainEl.getBoundingClientRect();
    const problems: string[] = [];
    for (const el of mainEl.querySelectorAll<HTMLElement>('h1, h2, p, li, a')) {
      const label = `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`;
      const r = el.getBoundingClientRect();
      if (!r.width) { problems.push(`${label}: no box`); continue; }
      if (r.left < m.left - 1 || r.right > m.right + 1) problems.push(`${label}: box outside main`);
      if (el.scrollWidth > el.clientWidth + 1) problems.push(`${label}: own horizontal overflow`);
      const style = getComputedStyle(el);
      if (style.textOverflow !== 'clip' || style.whiteSpace === 'nowrap') problems.push(`${label}: truncation style`);
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const glyphs of range.getClientRects()) {
        if (glyphs.width && (glyphs.left < m.left - 1 || glyphs.right > m.right + 1)) problems.push(`${label}: glyphs outside main`);
      }
      for (let node = el.parentElement; node && node !== mainEl; node = node.parentElement) {
        const box = node.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1) problems.push(`${label}: outside ${node.tagName}`);
      }
    }
    return {
      problems: [...new Set(problems)],
      documentScrolls: document.documentElement.scrollWidth > window.innerWidth,
      mainScrolls: mainEl.scrollWidth > mainEl.clientWidth + 1,
    };
  });
  expect(report).toEqual({ problems: [], documentScrolls: false, mainScrolls: false });
}

// Scrolls the target (and <main>) for real and checks it comes fully on screen
// with a hit-test on it, and that it is a 44px target.
async function reachableTarget(target: Locator) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect(target).toBeInViewport({ ratio: 0.99 });
  await expectUncovered(target);
  const box = await target.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function openAccountMenu(page: Page, email: string) {
  const opener = page.getByRole('button', { name: 'Mở menu điều hướng' });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('button', { name: `Tài khoản: ${email}` }).click();
}

async function tabUntil(page: Page, target: Locator, max = 60) {
  for (let step = 0; step < max; step += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('target never received focus by Tab');
}

async function itemTexts(page: Page) {
  return main(page).locator('[data-help-id]').allTextContents();
}

test.describe('FR-WEBHELP-01…03 / AC-WEBHELP-01…04 — content', () => {
  test('AC-WEBHELP-01: web only views a trip, the phone app starts and ends it; no Start control or instruction', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help');
    await expectHelp(page);

    const items = await itemTexts(page);
    expect(items).toContain(REQUIRED.roles[0]);
    expect(items.some((text) => text.endsWith(REQUIRED.roles[1]))).toBe(true);
    await expect(main(page).getByRole('button')).toHaveCount(0);
    const text = (await main(page).innerText()).toLowerCase();
    for (const phrase of ['bắt đầu chuyến đi', 'nhấn bắt đầu', 'bấm bắt đầu', 'chọn bắt đầu']) expect(text).not.toContain(phrase);
    onlySessionChecks(calls);
  });

  test('AC-WEBHELP-02: vehicle steps match the vehicles page and link to /vehicles', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help');
    await expectHelp(page);

    const section = main(page).getByRole('region', { name: 'Quản lý phương tiện', exact: true });
    const items = await section.locator('[data-help-id]').allTextContents();
    for (const statement of REQUIRED.vehicles) expect(items).toContain(statement);
    await expect(section.getByRole('link')).toHaveCount(1);
    await expect(section.getByRole('link', { name: 'Mở Quản lý phương tiện', exact: true })).toHaveAttribute('href', '/vehicles');
    onlySessionChecks(calls);
  });

  test('AC-WEBHELP-03: error help asks for no password, token or face image and promises no recovery or permission', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help');
    await expectHelp(page);

    const items = await itemTexts(page);
    for (const statement of [...REQUIRED.session, ...REQUIRED.errors]) expect(items).toContain(statement);
    const text = (await main(page).innerText()).toLowerCase();
    for (const forbidden of ['gửi mật khẩu cho', 'cung cấp mật khẩu', 'jwt', 'token', 'khuôn mặt', 'chụp ảnh', 'gửi ảnh', 'selfie', 'khôi phục', 'cấp quyền', 'cho phép vị trí', 'camera']) {
      expect(text, `help must not contain "${forbidden}"`).not.toContain(forbidden);
    }
    await expect(main(page).getByRole('link', { name: 'Đi tới mục Xem vị trí chuyến đi', exact: true })).toHaveAttribute('href', '#vi-tri');
    onlySessionChecks(calls);
    await noSensitiveApis(page);
  });

  test('AC-WEBHELP-04: no contact channel, ticket, chat, form or fake success; self-help and navigation only', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help');
    await expectHelp(page);

    const area = main(page);
    await expect(area.locator('form, input, textarea, select, button, [contenteditable="true"], img, iframe')).toHaveCount(0);
    const hrefs = await area.getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(hrefs.filter((href) => /^(mailto:|tel:|https?:|\/\/)/.test(href))).toEqual([]);
    const text = (await area.innerText()).toLowerCase();
    for (const forbidden of ['liên hệ', 'hotline', 'số điện thoại', 'tổng đài', 'hỗ trợ viên', 'gửi yêu cầu', 'ticket', 'chat', 'form', '@', 'đã gửi thành công', 'chúng tôi sẽ phản hồi']) {
      expect(text, `help must not contain "${forbidden}"`).not.toContain(forbidden);
    }
    onlySessionChecks(calls);
  });

  test('deep link: TOC and headings in order, every help item, only the expected links; only GET /auth/me', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);

    await page.goto('/help');

    await expectHelp(page);
    await expect(toc(page).getByRole('link')).toHaveText(SECTIONS.map(([, title]) => title));
    for (const [id, title] of SECTIONS) {
      await expect(tocLink(page, title)).toHaveAttribute('href', `#${id}`);
      await expect(sectionHeading(page, id)).toHaveText(title);
      await expect(main(page).getByRole('region', { name: title, exact: true })).toBeVisible();
    }
    await expect(main(page).getByRole('heading', { level: 2 })).toHaveText(['Mục lục', ...SECTIONS.map(([, title]) => title)]);

    const expectedItems = HELP_SECTIONS.flatMap((section) => section.items);
    const rendered = await main(page).locator('[data-help-id]').evaluateAll((els) =>
      els.map((el) => ({ id: el.getAttribute('data-help-id'), text: el.textContent })),
    );
    expect(rendered).toEqual(expectedItems.map(({ id, text }) => ({ id, text })));
    expect(rendered.map((item) => item.id)).toEqual(Array.from({ length: 26 }, (_, i) => `H-${String(i + 1).padStart(2, '0')}`));

    const hrefs = await main(page).getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(ALL_HREFS);

    // Exact visible text: the approved frame written out in this file plus the
    // H-xx items, nothing else (also the terminology check, see FORBIDDEN).
    const expectedLines = [
      'Trợ giúp', INTRO, 'Mục lục', ...SECTIONS.map(([, title]) => title),
      ...SECTIONS.flatMap(([id, title]) => [
        title,
        ...HELP_SECTIONS.find((section) => section.id === id)!.items.map((item) => item.text),
        SECTION_LINKS[id],
      ]),
    ];
    const visibleLines = (await main(page).innerText()).split('\n').map((line) => line.trim()).filter(Boolean);
    expect(visibleLines).toEqual(expectedLines);
    const privacy = main(page).getByRole('region', { name: 'Quyền riêng tư', exact: true });
    expect(await privacy.locator('[data-help-id]').allTextContents()).toEqual(REQUIRED.privacy);

    const area = main(page);
    await expect(area.locator('form, input, textarea, select, button, [contenteditable="true"], img, iframe')).toHaveCount(0);
    const text = (await area.innerText()).toLowerCase();
    for (const forbidden of FORBIDDEN) expect(text, `help must not contain "${forbidden}"`).not.toContain(forbidden);
    expect(text).not.toContain(USER.email);

    onlySessionChecks(calls);
    await noSensitiveApis(page);
  });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    test(`from the account menu at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

      await openAccountMenu(page, USER.email);
      await page.getByRole('menuitem', { name: 'Trợ giúp' }).click();

      await expect(page).toHaveURL(/\/help$/);
      await expectHelp(page);
      onlySessionChecks(calls);
    });
  }

  test('reload of /help#lich-su keeps route and hash and lands on that heading again', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = await fixture(page);
    await page.goto('/help#lich-su');
    await expectHelp(page);
    await expectAtSection(page, 'lich-su');
    const checksBefore = calls.length;

    await page.reload();

    await expectHelp(page);
    await expectAtSection(page, 'lich-su');
    expect(calls.length).toBeGreaterThan(checksBefore);
    onlySessionChecks(calls);
    expect(await readToken(page)).toBe(TOKEN);
  });
});

test.describe('AC-WEBHELP-05 — TOC, anchors and keyboard', () => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    test(`${viewport.width}×${viewport.height}: Tab/Shift+Tab walk the TOC in order, Enter lands on the heading, next Tab is that section's link`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page);
      await page.goto('/help');
      await expectHelp(page);

      await page.locator('body').focus();
      await tabUntil(page, tocLink(page, SECTIONS[0][1]));
      for (const [, title] of SECTIONS.slice(1)) {
        await page.keyboard.press('Tab');
        await expect(tocLink(page, title)).toBeFocused();
      }
      const ring = await tocLink(page, SECTIONS[5][1]).evaluate((el) => {
        const style = getComputedStyle(el);
        return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      });
      expect(ring).toBe(true);
      for (const [, title] of [...SECTIONS].reverse().slice(1, 3)) {
        await page.keyboard.press('Shift+Tab');
        await expect(tocLink(page, title)).toBeFocused();
      }

      await expect(tocLink(page, 'Lịch sử và thống kê chuyến đi')).toBeFocused();
      await page.keyboard.press('Enter');
      await expectAtSection(page, 'lich-su');

      await page.keyboard.press('Tab');
      const sectionLink = mainLink(page, 'Mở Lịch sử chuyến đi');
      await expect(sectionLink).toBeFocused();
      await expectUncovered(sectionLink);

      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/trip-history$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Lịch sử & Phân tích chuyến đi' })).toBeVisible();
      await noSensitiveApis(page);
      expect(calls.filter((call) => call.method !== 'GET')).toEqual([]);
    });
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    test(`${viewport.width}×${viewport.height}: every TOC entry focuses its heading below the header; Back returns to the previous section`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page);
      await page.goto('/help');
      await expectHelp(page);

      for (const [id, title] of SECTIONS) {
        await sectionHeading(page, 'dang-nhap').evaluate(() => document.querySelector('main')!.scrollTo(0, 0));
        await tocLink(page, title).focus();
        await page.keyboard.press('Enter');
        await expectAtSection(page, id);
      }

      await page.goBack();
      await expectAtSection(page, 'quyen-rieng-tu');
      await page.goForward();
      await expectAtSection(page, 'loi-thuong-gap');
      onlySessionChecks(calls);
    });
  }

  test('in-page link from "Lỗi thường gặp" goes to "Xem vị trí chuyến đi", also when it is already the current hash', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = await fixture(page);
    await page.goto('/help#loi-thuong-gap');
    await expectAtSection(page, 'loi-thuong-gap');

    await mainLink(page, 'Đi tới mục Xem vị trí chuyến đi').click();
    await expectAtSection(page, 'vi-tri');

    // Scroll away, then follow a link whose hash is already current.
    await main(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await tocLink(page, 'Xem vị trí chuyến đi').evaluate((el) => el.scrollIntoView());
    await tocLink(page, 'Xem vị trí chuyến đi').click();
    await expectAtSection(page, 'vi-tri');
    onlySessionChecks(calls);
  });

  test('deep link with an unknown hash shows the page without moving focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help#khong-co-muc-nay');
    await expectHelp(page);
    await expect(page).toHaveURL(/\/help#khong-co-muc-nay$/);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
    onlySessionChecks(calls);
  });

  // Review R01: a fragment is outside input. A malformed percent escape or an
  // incomplete UTF-8 sequence must be treated as "no target", not crash Help
  // into the global error screen.
  for (const fragment of ['%', '%E0%A4%A']) {
    test(`malformed fragment #${fragment}: Help stays, no global error, focus and token untouched, anchors still work`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      const errors = watchErrors(page);
      const calls = await fixture(page);

      await page.goto(`/help#${fragment}`);
      await expectHelp(page);
      await expect(globalFallback(page)).toHaveCount(0);
      expect(page.url().endsWith(`/help#${fragment}`)).toBe(true);
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
      expect(await readToken(page)).toBe(TOKEN);

      await tocLink(page, 'Lịch sử và thống kê chuyến đi').focus();
      await page.keyboard.press('Enter');
      await expectAtSection(page, 'lich-su');

      await page.goBack();
      await expectHelp(page);
      await expect(globalFallback(page)).toHaveCount(0);
      expect(page.url().endsWith(`/help#${fragment}`)).toBe(true);
      await page.goForward();
      await expectAtSection(page, 'lich-su');

      await page.goto(`/help#${fragment}`);
      await page.reload();
      await expectHelp(page);
      await expect(globalFallback(page)).toHaveCount(0);
      expect(await readToken(page)).toBe(TOKEN);

      expect(errors).toEqual([]);
      onlySessionChecks(calls);
    });
  }

  test('valid fragments: an encoded known section is focused; empty fragment and a non-help element id are not targets', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors = watchErrors(page);
    const calls = await fixture(page);

    // %76 is "v": #%76i-tri names the "vi-tri" section.
    await page.goto('/help#%76i-tri');
    await expectHelp(page);
    await expect(sectionHeading(page, 'vi-tri')).toBeFocused();
    await expectUncovered(sectionHeading(page, 'vi-tri'));

    for (const fragment of ['', 'main-content']) {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      await page.goto(`/help#${fragment}`);
      await expectHelp(page);
      await expect(globalFallback(page)).toHaveCount(0);
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
      expect(await main(page).evaluate((el) => el.scrollTop)).toBe(0);
    }

    expect(errors).toEqual([]);
    onlySessionChecks(calls);
  });
});

test.describe('FR-WEBHELP-01 / AC-WEBHELP-02, -05 — destinations go through the existing router and guard', () => {
  // `own`: requests the destination page itself is expected to make (its
  // business data); they are checked apart from the help page's traffic.
  const destinations = [
    { label: 'Mở trang Đăng nhập', url: /\/dashboard$/, heading: 'Dashboard', own: [] as string[] },
    { label: 'Mở Quản lý phương tiện', url: /\/vehicles$/, heading: 'Quản lý phương tiện', own: ['/api/vehicles'] },
    { label: 'Mở Vị trí trực tiếp', url: /\/start-trip$/, heading: null, own: ['/api/trips'] },
    { label: 'Mở Lịch sử chuyến đi', url: /\/trip-history$/, heading: 'Lịch sử & Phân tích chuyến đi', own: ['/api/trips', '/api/vehicles'] },
    { label: 'Mở trang Quyền riêng tư', url: /\/account\/privacy$/, heading: 'Quyền riêng tư', own: [] },
  ];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    for (const destination of destinations) {
      test(`${viewport.width}×${viewport.height}: "${destination.label}"`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const calls = await fixture(page);
        await page.goto('/help');
        await expectHelp(page);
        const helpCalls = calls.length;

        await reachableTarget(mainLink(page, destination.label));
        await mainLink(page, destination.label).click();

        await expect(page).toHaveURL(destination.url);
        if (destination.heading) {
          await expect(page.getByRole('heading', { level: 1, name: destination.heading, exact: true })).toBeVisible();
        } else {
          await expect(page.getByText('Chưa có chuyến đi nào đang diễn ra')).toBeVisible();
          await expect(main(page).getByRole('button', { name: /bắt đầu/i })).toHaveCount(0);
        }
        // The /login link uses the existing behaviour: a valid session is sent
        // on to the dashboard, the session is not ended.
        expect(await readToken(page)).toBe(TOKEN);

        onlySessionChecks(calls.slice(0, helpCalls));
        const after = calls.slice(helpCalls);
        for (const call of after) {
          expect(call.method).toBe('GET');
          expect(call.body).toBeNull();
          expect(call.token).toBe(`Bearer ${TOKEN}`);
          expect(['/api/auth/me', ...destination.own]).toContain(call.path);
        }
        for (const path of destination.own) await expect.poll(() => calls.some((call) => call.path === path)).toBe(true);
        await noSensitiveApis(page);
      });
    }
  }
});

test.describe('auth guard on /help (WEB-01 semantics unchanged)', () => {
  test('H-02: the session is checked when the protected area is opened or reloaded, not on every in-app page change', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    const checks = () => calls.filter((call) => call.path === '/api/auth/me').length;
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    const afterOpen = checks();
    expect(afterOpen).toBeGreaterThan(0);

    await openAccountMenu(page, USER.email);
    await page.getByRole('menuitem', { name: 'Trợ giúp' }).click();
    await expectHelp(page);
    await mainLink(page, 'Mở Quản lý phương tiện').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Quản lý phương tiện', exact: true })).toBeVisible();
    expect(checks()).toBe(afterOpen);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Quản lý phương tiện', exact: true })).toBeVisible();
    expect(checks()).toBeGreaterThan(afterOpen);
  });

  test('H-03: a network failure keeps the session; "Thử lại" that gets a current 401 ends it without "Đăng nhập lại"', async ({ page }) => {
    const control: { me: 'ok' | 401 | 'network' } = { me: 'network' };
    const calls = await fixture(page, { control });
    await page.goto('/help');
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    expect(await readToken(page)).toBe(TOKEN);

    control.me = 401;
    await page.getByRole('button', { name: 'Thử lại' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await readToken(page)).toBeNull();
    await expect(page.getByRole('heading', { name: 'Trợ giúp' })).toHaveCount(0);
    // Only session checks were made; "Đăng nhập lại" was never pressed.
    for (const call of calls) expect(call).toMatchObject({ method: 'GET', path: '/api/auth/me', body: null });
  });

  test('no token: deep link goes to /login without a session check or help content', async ({ page }) => {
    const calls = await fixture(page, { token: null });
    await page.goto('/help#vi-tri');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Trợ giúp' })).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test('401: session cleared, /login, no help content', async ({ page }) => {
    await fixture(page, { me: 401 });
    await page.goto('/help');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Trợ giúp' })).toHaveCount(0);
    expect(await readToken(page)).toBeNull();
  });

  test('network failure: WEB-01 error screen, token and route kept, no help content', async ({ page }) => {
    await fixture(page, { me: 'network' });
    await page.goto('/help');
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByRole('heading', { name: 'Trợ giúp' })).toHaveCount(0);
    expect(await readToken(page)).toBe(TOKEN);
  });
});

test.describe('WEB-T11 — reflow, text stress, resize, touch', () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 720 },
  ]) {
    test(`${viewport.width}×${viewport.height}: everything inside main, no horizontal scroll, every link reachable`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await fixture(page);
      await page.goto('/help');
      await expectHelp(page);

      await expectLayoutReadable(page);
      for (const link of await main(page).getByRole('link').all()) await reachableTarget(link);
      onlySessionChecks(calls);
    });
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 720 }]) {
    test(`CSS text stress (html 32px, not native zoom) ${viewport.width}×${viewport.height}, long account email in the shell`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Presentation stress for the shell only: local part 58, domain 48,
      // total 107 characters (asserted below) — inside the 64/255 limits.
      const longEmail = 'help.page.reader.with.a.rather.long.local.part.for.reflow1@help-centre-layout-checks.department.example.com';
      const [local, domain] = longEmail.split('@');
      expect([local.length, domain.length, longEmail.length]).toEqual([58, 48, 107]);
      const calls = await fixture(page, { email: longEmail });
      await page.goto('/help');
      await expectHelp(page);

      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });

      await expectLayoutReadable(page);
      for (const link of await main(page).getByRole('link').all()) await reachableTarget(link);
      await tocLink(page, 'Lỗi thường gặp').focus();
      await page.keyboard.press('Enter');
      await expectAtSection(page, 'loi-thuong-gap');
      onlySessionChecks(calls);
    });
  }

  test('resize across the 1024 shell breakpoint and orientation keeps route, hash, focus and reflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const calls = await fixture(page);
    await page.goto('/help#loi-thuong-gap');
    await expectAtSection(page, 'loi-thuong-gap');
    const link = mainLink(page, 'Đi tới mục Xem vị trí chuyến đi');
    await link.focus();

    for (const size of [
      { width: 1025, height: 800 }, { width: 1024, height: 800 }, { width: 1023, height: 800 },
      { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 },
      { width: 1023, height: 800 }, { width: 1024, height: 800 }, { width: 1280, height: 720 },
    ]) {
      await page.setViewportSize(size);
      await expect(page).toHaveURL(/\/help#loi-thuong-gap$/);
      await expect(link).toBeFocused();
      await expectLayoutReadable(page);
    }
    onlySessionChecks(calls);
  });

  test('touch/DPR2 at 390×844: tap TOC, tap in-page link, tap a route link', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2, baseURL });
    try {
      const page = await context.newPage();
      const calls = await fixture(page);
      await page.goto('/help');
      await expectHelp(page);
      expect(await page.evaluate(() => ({ touch: navigator.maxTouchPoints > 0, dpr: devicePixelRatio }))).toEqual({ touch: true, dpr: 2 });

      await reachableTarget(tocLink(page, 'Lỗi thường gặp'));
      await tocLink(page, 'Lỗi thường gặp').tap();
      await expectAtSection(page, 'loi-thuong-gap');

      await reachableTarget(mainLink(page, 'Đi tới mục Xem vị trí chuyến đi'));
      await mainLink(page, 'Đi tới mục Xem vị trí chuyến đi').tap();
      await expectAtSection(page, 'vi-tri');
      onlySessionChecks(calls);

      await reachableTarget(mainLink(page, 'Mở Vị trí trực tiếp'));
      await mainLink(page, 'Mở Vị trí trực tiếp').tap();
      await expect(page).toHaveURL(/\/start-trip$/);
      await expect(page.getByText('Chưa có chuyến đi nào đang diễn ra')).toBeVisible();
      await noSensitiveApis(page);
    } finally {
      await context.close();
    }
  });
});

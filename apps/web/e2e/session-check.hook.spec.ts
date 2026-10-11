import { expect, test, type Page } from '@playwright/test';

// WEB-01, independent review round 1, finding R01 (AC-WEBSESSION-03/09).
//
// The store-level tests cancel a check with the handle the store just gave
// them. The real hook is the thing that decides WHICH check a mount still
// owns by the time it unmounts — and after a retry that used to be the wrong
// one, so the retry's answer could still clear the token or set a user after
// the page was gone. These tests therefore mount the real hook
// (e2e/harness/sessionCheckHarness.tsx: real hook, store, service and API
// client) and unmount it for real.
//
// HARNESS, FIXTURE TRANSPORT — requests are held open and answered by the
// test, and the transport ignores AbortSignal on purpose: the app must stay
// correct even when an answer arrives for a request it already gave up on.
//
// Needs the Vite dev server (it imports source modules), so it does not run
// against a deployed site.
test.skip(!!process.env.E2E_WEB_BASE_URL, 'hook harness is served by the Vite dev server only');

const TOKEN_KEY = 'novaway_web_token';
const TOKEN_A = 'hook-fixture-token-a';
const USER_A = { id: '00000000-0000-4000-8000-00000000000a', email: 'hook-a@example.com' };
const USER_B = { id: '00000000-0000-4000-8000-00000000000b', email: 'hook-b@example.com' };

// What @vitejs/plugin-react injects into index.html; needed because this
// page is not index.html.
const HARNESS_HTML = `<!doctype html>
<html lang="vi">
  <body>
    <div id="root"></div>
    <script type="module">
      import { injectIntoGlobalHook } from '/@react-refresh';
      injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="/e2e/harness/sessionCheckHarness.tsx"></script>
  </body>
</html>`;

type LateAnswer = '401' | '200' | '500' | 'network';
const LATE_ANSWERS: LateAnswer[] = ['401', '200', '500', 'network'];

async function openHarness(page: Page, options: { strict?: boolean; mount?: string } = {}) {
  await page.clock.install();
  await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [TOKEN_KEY, TOKEN_A]);
  await page.route('**/__session-hook-harness*', (route) =>
    route.fulfill({ contentType: 'text/html', body: HARNESS_HTML }),
  );
  const query = new URLSearchParams({ mount: options.mount ?? 'a', strict: options.strict ? '1' : '0' });
  await page.goto(`/__session-hook-harness?${query}`);
  await page.waitForFunction(() => typeof window.sessionHarness !== 'undefined');
  await page.evaluate(() => window.sessionHarness.whenSettled());
}

// Mounts exactly these probes and waits until React has actually done it.
//
// Review round 2, finding R03: root.render() only schedules work, so the
// harness call returning proves nothing about the lifecycle — the old page may
// still be mounted and its effect cleanup not run yet. `mount` returns the
// harness's lifecycle barrier (see sessionCheckHarness.tsx): it resolves once
// the probes whose effects are set up are exactly `names`, i.e. after the real
// hook's cleanup ran for every page that went away and its effect ran for
// every page that arrived. Every mount/unmount in this file goes through here.
async function mountProbes(page: Page, names: string[]) {
  await page.evaluate((requested) => window.sessionHarness.mount(requested), names);
  await expect(page.locator('[data-probe]')).toHaveCount(names.length);
}

const state = (page: Page) => page.evaluate(() => window.sessionHarness.state());
const requestCount = (page: Page) => page.evaluate(() => window.sessionHarness.state().requests.length);
const waitForRequests = (page: Page, count: number) => expect.poll(() => requestCount(page)).toBe(count);
const status = (page: Page, name: string) => page.getByTestId(`${name}-status`);

async function answer(page: Page, index: number, late: LateAnswer, user = USER_A) {
  await page.evaluate(
    ([i, kind, body]) => {
      if (kind === 'network') return window.sessionHarness.fail(i as number);
      if (kind === '200') return window.sessionHarness.respond(i as number, 200, body);
      return window.sessionHarness.respond(i as number, Number(kind), { error_code: 'FIXTURE', message: 'fixture' });
    },
    [index, late, user] as const,
  );
}

// After an unmount nothing may change any more: no store notification, no
// user, token untouched, the abandoned request aborted — and no timer left
// to fire the 15s timeout later.
async function expectNothingChangesAfterUnmount(page: Page, late: LateAnswer, abandonedIndex: number) {
  // The barrier, enforced here as well so no caller can skip it: the unmount
  // and its effect cleanup must be finished BEFORE the state is read and
  // BEFORE the late answer is released. Otherwise this would be answering a
  // page that is still mounted, which is a different (and allowed) case.
  await page.evaluate(() => window.sessionHarness.whenSettled());
  await expect(page.locator('[data-probe]')).toHaveCount(0);

  const before = await state(page);
  expect(before.live, 'no probe is mounted any more').toEqual([]);
  // soft: keep going so one run also shows what the unaborted request then does.
  expect.soft(before.requests[abandonedIndex].aborted, 'request of the unmounted page is aborted').toBe(true);

  await answer(page, abandonedIndex, late);
  await page.waitForTimeout(200);
  await page.clock.fastForward(20_000);
  await page.waitForTimeout(200);

  const after = await state(page);
  expect.soft(after.token, 'token is untouched').toBe(TOKEN_A);
  expect.soft(after.snapshot.user, 'no user is set').toBeNull();
  expect.soft(after.snapshot, 'session state is unchanged').toEqual(before.snapshot);
  expect.soft(after.notifications, 'no store notification after unmount').toBe(before.notifications);
}

test.describe('the real hook: unmount cancels the check this mount owns, including a retry', () => {
  for (const late of LATE_ANSWERS) {
    test(`first check fails → retry → unmount → late ${late} from the retry changes nothing`, async ({
      page,
    }) => {
      await openHarness(page);
      await waitForRequests(page, 1);
      await answer(page, 0, '500');
      await expect(status(page, 'a')).toHaveText('error');

      await page.getByRole('button', { name: 'Retry a' }).click();
      await waitForRequests(page, 2);
      await expect(status(page, 'a')).toHaveText('checking');

      await mountProbes(page, []);

      await expectNothingChangesAfterUnmount(page, late, 1);
    });
  }

  test('first check times out → retry → unmount → late 401 from the retry changes nothing', async ({ page }) => {
    await openHarness(page);
    await waitForRequests(page, 1);
    await page.clock.fastForward(15_000);
    await expect(status(page, 'a')).toHaveText('error');

    await page.getByRole('button', { name: 'Retry a' }).click();
    await waitForRequests(page, 2);
    await mountProbes(page, []);

    await expectNothingChangesAfterUnmount(page, '401', 1);
  });

  test('several retries → unmount → late 200 from the last retry changes nothing', async ({ page }) => {
    await openHarness(page);
    await waitForRequests(page, 1);
    await answer(page, 0, '500');
    await expect(status(page, 'a')).toHaveText('error');

    for (const index of [1, 2]) {
      await page.getByRole('button', { name: 'Retry a' }).click();
      await waitForRequests(page, index + 1);
      await answer(page, index, 'network');
      await expect(status(page, 'a')).toHaveText('error');
    }
    await page.getByRole('button', { name: 'Retry a' }).click();
    await waitForRequests(page, 4);
    await mountProbes(page, []);

    await expectNothingChangesAfterUnmount(page, '200', 3);
  });

  test('unmount while the first check is still pending → late 401 changes nothing', async ({ page }) => {
    await openHarness(page);
    await waitForRequests(page, 1);

    await mountProbes(page, []);

    await expectNothingChangesAfterUnmount(page, '401', 0);
  });

  for (const late of ['401', '200'] as const) {
    test(`StrictMode: first check fails → retry → unmount → late ${late} changes nothing`, async ({ page }) => {
      await openHarness(page, { strict: true });
      // StrictMode runs the effect twice: the first check is cancelled by the
      // simulated unmount, the second one is the mount's real check.
      await waitForRequests(page, 2);
      expect((await state(page)).requests[0].aborted).toBe(true);
      expect((await state(page)).requests[1].aborted).toBe(false);
      await answer(page, 1, '500');
      await expect(status(page, 'a')).toHaveText('error');

      await page.getByRole('button', { name: 'Retry a' }).click();
      await waitForRequests(page, 3);
      await mountProbes(page, []);

      await expectNothingChangesAfterUnmount(page, late, 2);
    });
  }
});

test.describe('the real hook: an old mount cleaning up never cancels the check of the mount that took over', () => {
  test('new page mounts first, old page unmounts afterwards: the new check survives and decides', async ({
    page,
  }) => {
    await openHarness(page);
    await waitForRequests(page, 1);
    await answer(page, 0, '500');
    await page.getByRole('button', { name: 'Retry a' }).click();
    await waitForRequests(page, 2);

    // Page b mounts while a (with its retry pending) is still there.
    await mountProbes(page, ['a', 'b']);
    await waitForRequests(page, 3);
    expect((await state(page)).requests[1].aborted).toBe(true); // a's retry was superseded by b's check

    // Now a goes away. Its cleanup must leave b's check alone. mountProbes
    // returns only after a's cleanup ran, so "not aborted" below is a
    // statement about what the cleanup did, not about it not having run yet.
    await mountProbes(page, ['b']);
    const afterOldPageLeft = await state(page);
    expect(afterOldPageLeft.live).toEqual(['b']);
    expect(afterOldPageLeft.requests[2].aborted).toBe(false);

    // a's abandoned retry answers late: ignored.
    await answer(page, 1, '401');
    await page.waitForTimeout(200);
    expect((await state(page)).token).toBe(TOKEN_A);
    await expect(status(page, 'b')).toHaveText('checking');

    // b's own check decides.
    await answer(page, 2, '200', USER_B);
    await expect(status(page, 'b')).toHaveText('authenticated');
    await expect(page.getByTestId('b-user')).toHaveText(USER_B.email);
    expect((await state(page)).token).toBe(TOKEN_A);
  });

  test('old page unmounts and new page mounts in the same commit: the new check is valid', async ({ page }) => {
    await openHarness(page);
    await waitForRequests(page, 1);
    await answer(page, 0, '500');
    await page.getByRole('button', { name: 'Retry a' }).click();
    await waitForRequests(page, 2);

    await mountProbes(page, ['b']);
    await waitForRequests(page, 3);
    const swapped = await state(page);
    expect(swapped.live).toEqual(['b']);
    expect(swapped.requests[1].aborted).toBe(true);
    expect(swapped.requests[2].aborted).toBe(false);

    await answer(page, 1, '200', USER_A); // a's retry, late
    await page.waitForTimeout(200);
    await expect(status(page, 'b')).toHaveText('checking');

    await answer(page, 2, '401');
    await expect(status(page, 'b')).toHaveText('unauthenticated');
    expect((await state(page)).token).toBeNull(); // the 401 that counts is b's own
  });

  test('StrictMode: the mount that took over keeps its check when the old one cleans up', async ({ page }) => {
    await openHarness(page, { strict: true });
    await waitForRequests(page, 2);
    await answer(page, 1, '500');
    await page.getByRole('button', { name: 'Retry a' }).click();
    await waitForRequests(page, 3);

    await mountProbes(page, ['a', 'b']);
    await waitForRequests(page, 5); // b's effect also runs twice
    await mountProbes(page, ['b']);

    // 0: a's StrictMode throwaway check (cancelled). 1: a's real check, which
    // completed with the 500 above, so it was never aborted. 2: a's retry,
    // superseded by b. 3: b's StrictMode throwaway check. 4: b's real check —
    // still running after a's cleanup.
    const afterSwap = await state(page);
    expect(afterSwap.live).toEqual(['b']);
    expect(afterSwap.requests.map((request) => request.aborted)).toEqual([true, false, true, true, false]);

    await answer(page, 4, '200', USER_B);
    await expect(status(page, 'b')).toHaveText('authenticated');
  });
});

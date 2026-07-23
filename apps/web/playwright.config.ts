import { defineConfig, devices } from '@playwright/test';

// docs/TEST_STRATEGY.md §3 — E2E gate for the golden flow. Assumes backend
// + Postgres/PostGIS are already running locally (docker compose up -d,
// pnpm --filter @novaway/backend start:dev) — this config only manages the
// web dev server, since Playwright's webServer can't bootstrap a database.
//
// R2-5 (docs/roadmap/SPRINT_R2_PRODUCT_COMPLETION.md) — when E2E_WEB_BASE_URL
// points at a real deployed site (the e2e-staging.yml workflow), there is
// nothing to spawn locally: `webServer` must be omitted entirely, not just
// pointed at the remote URL. Otherwise `reuseExistingServer: !process.env.CI`
// is false in CI, forcing Playwright to spawn `pnpm dev` anyway even though
// the configured url is already live remotely (wasted process, and it opens
// a local port nothing else in the job needs).
const isTargetingRemoteSite = !!process.env.E2E_WEB_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_WEB_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: isTargetingRemoteSite
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});

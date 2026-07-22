import { defineConfig, devices } from '@playwright/test';

// docs/TEST_STRATEGY.md §3 — E2E gate for the golden flow. Assumes backend
// + Postgres/PostGIS are already running locally (docker compose up -d,
// pnpm --filter @novaway/backend start:dev) — this config only manages the
// web dev server, since Playwright's webServer can't bootstrap a database.
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
  webServer: {
    command: 'pnpm dev',
    url: process.env.E2E_WEB_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

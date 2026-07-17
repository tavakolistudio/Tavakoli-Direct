import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Assumes Postgres + Redis are up, migrations applied, and the DB
 * seeded (`pnpm db:migrate && pnpm db:seed`). The web server is started here.
 * See docs/TESTING.md.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:3000',
    locale: 'fa-IR',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

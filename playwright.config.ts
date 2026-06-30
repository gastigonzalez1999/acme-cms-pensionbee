import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for full-stack E2E tests.
 *
 * webServer boots both the API and the Vite dev server before running tests.
 * The API serves real content from content/ and template.html at the repo root.
 *
 * For local runs: use `npm run test:e2e` from the repo root.
 * In CI: the e2e job builds the API first, then runs with CI=true (which
 * disables reuseExistingServer so a fresh server is always started).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // In CI the build step runs first; start:prod serves the compiled dist.
      // Locally start:dev rebuilds on the fly (no separate build step needed).
      command: process.env.CI
        ? 'node apps/api/dist/main'
        : 'npm run start:dev --workspace=apps/api',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        // Resolve content and template relative to the repo root (which is
        // process.cwd() when Playwright boots the server from here).
        CONTENT_DIR: 'content',
        TEMPLATE_PATH: 'template.html',
        NODE_ENV: 'development',
      },
    },
    {
      command: 'npm run dev --workspace=apps/web',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

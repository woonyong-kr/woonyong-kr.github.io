import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 35_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4177', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', grep: /@core/, use: { browserName: 'firefox' } },
    { name: 'webkit', grep: /@core/, use: { browserName: 'webkit' } },
  ],
  webServer: { command: 'node scripts/serve-test-site.mjs', url: 'http://127.0.0.1:4177', reuseExistingServer: false },
});

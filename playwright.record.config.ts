import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './recording',
  timeout: 120000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    launchOptions: { slowMo: 300 },
  },
  webServer: {
    command: 'node scripts/serve.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

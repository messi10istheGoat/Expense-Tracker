import { defineConfig } from '@playwright/test';
import finance from './playwright.config';
export default defineConfig({
  ...finance,
  testMatch: 'local.spec.ts',
  timeout: 60_000,
  testIgnore: [],
  outputDir: 'test-results/local',
  use: { ...finance.use, baseURL: process.env.LOCAL_TEST_BASE_URL || 'http://127.0.0.1:5176' },
  webServer: {
    command: 'npm run dev -- --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
  },
});

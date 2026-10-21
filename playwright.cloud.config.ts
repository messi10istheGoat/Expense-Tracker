import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'cloud.spec.ts',
  outputDir: 'test-results-cloud',
  timeout: 60000,
  testIgnore: [],
  use: { ...base.use, baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command:
      'VITE_SUPABASE_URL=https://spendwise-test.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_fixture npm run dev -- --port 5174',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
  },
});

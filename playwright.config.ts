import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://localhost:5174/'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  // Specs share one live Supabase project; concurrent sign-ups made parallel runs flaky.
  workers: 1,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 30_000 },
})

import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The remote build environment ships a pinned Chromium; local machines use Playwright's own.
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env['PW_CHROMIUM_PATH'] ?? (existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1600, height: 900 },
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});

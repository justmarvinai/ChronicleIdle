import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The remote build environment ships a pinned Chromium; local machines use Playwright's own.
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
  process.env['PW_CHROMIUM_PATH'] ?? (existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  /*
   * One browser at a time, everywhere. The suite drives a WebGL battle stage through swiftshader,
   * and Playwright's default (half the CPUs) puts two of those side by side: they starve each
   * other until a click on a visible, enabled button times out, a session crashes, or a boss race
   * that takes 35 s alone runs past a seven-minute budget. Wall-clock is the cheaper thing to
   * spend.
   */
  workers: 1,
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

import { expect, type Page } from '@playwright/test';

/** Driver chatter from software-rendered WebGL on CI runners; the game never logs these. */
const IGNORED = [/^\[\.WebGL-/, /GPU stall/, /Download the React DevTools/];

/** Collects console errors/warnings and page errors so a test can assert there were none. */
export function collectConsole(page: Page): string[] {
  const problems: string[] = [];
  const push = (kind: string, text: string): void => {
    if (!IGNORED.some((re) => re.test(text))) problems.push(`[${kind}] ${text}`);
  };
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') push(message.type(), message.text());
  });
  page.on('pageerror', (error) => push('pageerror', error.message));
  return problems;
}

/** Screen transitions cross-fade for ~300 ms; wait them out before clicking through a new screen. */
export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(450);
}

export async function gotoTitle(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
  await settle(page);
}

/** Title → New Chronicle → name → Emberhold. */
export async function startChronicle(page: Page, name = 'Marvin'): Promise<void> {
  await gotoTitle(page);
  await page.getByTestId('btn-new-chronicle').click();
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('begin-chronicle').click();
  await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/** Opens the settings dialog from the top bar and selects a tab by its label. */
export async function openSettingsTab(page: Page, tab: string): Promise<void> {
  await page.getByTestId('topbar-settings').click();
  await expect(page.getByTestId('dialog-settings')).toBeVisible();
  await page.getByRole('tab', { name: tab }).click();
}

export async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

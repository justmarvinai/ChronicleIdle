import { expect, type Page } from '@playwright/test';

/**
 * Browser chatter the game never logs: software-WebGL driver messages on CI runners, and
 * Chromium's advisories about the two first-paint preload hints (`vite.config.ts`
 * `preloadBootImages`). Once the service worker controls the page it serves those images itself,
 * and on a slow runner the boot takes longer than the "used within a few seconds" window — the
 * hint still warms the cache on a first visit, which is what it is there for.
 */
const IGNORED = [
  /^\[\.WebGL-/,
  /GPU stall/,
  /Download the React DevTools/,
  /A preload for .* is not used because it is a cross-world service worker resource mismatch/,
  /was preloaded using link preload but not used within a few seconds/,
];

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

/** Starter slugs offered on the binding screen (`STARTER_IDS` without the `champ.` prefix). */
export type StarterSlug = 'sister_maelis' | 'ser_corvin' | 'reva_ashblade';

/** Title → New Chronicle → name → bind a starter → Emberhold. */
export async function startChronicle(
  page: Page,
  name = 'Marvin',
  starter: StarterSlug = 'ser_corvin',
): Promise<void> {
  await gotoTitle(page);
  await page.getByTestId('btn-new-chronicle').click();
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('begin-chronicle').click();
  await bindStarter(page, starter);
}

/** On the starter screen: bind one of the three Rares and wait for the hub. */
export async function bindStarter(page: Page, starter: StarterSlug = 'ser_corvin'): Promise<void> {
  await expect(page.getByTestId('screen-starter')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  await page.getByTestId(`bind-${starter}`).click();
  await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/** Title → Import → `.chronicle` file → confirm → the chronicle's entry screen. */
export async function importChronicleFile(page: Page, file: string): Promise<void> {
  await gotoTitle(page);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTestId('btn-import').click(),
  ]);
  await chooser.setFiles(file);
  await expect(page.getByTestId('dialog-import-confirm')).toBeVisible();
  await page.getByTestId('confirm-import').click();
  await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/** Hub → Champions hotspot → the Champions index. */
export async function openChampions(page: Page): Promise<void> {
  await page.getByTestId('hotspot-champions').click();
  await expect(page.getByTestId('screen-champions')).toBeVisible({ timeout: 20_000 });
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

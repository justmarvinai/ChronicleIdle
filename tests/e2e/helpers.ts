import { join } from 'node:path';
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

/**
 * Eldric's panel is modal while he is speaking (`TUTORIAL.md`): read the line and press Continue.
 * Every new chronicle walks the first chapter, so the helpers below press it where it appears.
 *
 * Naming the step matters. Lessons follow one another as the player acts, and pressing Continue at
 * the moment one hands over to the next would answer the wrong line — so the wait is for *this*
 * lesson to be the one speaking, and the press is only done when it has stopped.
 */
export async function eldricContinue(page: Page, step?: string): Promise<void> {
  const overlay = page.getByTestId('tutorial-overlay');
  if (step) await expect(overlay).toHaveAttribute('data-step', step, { timeout: 30_000 });
  await expect(overlay).toHaveAttribute('data-phase', 'dialogue', { timeout: 30_000 });
  const spoken = step ?? (await currentLesson(page));
  const button = page.getByTestId('tutorial-continue');
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await button.click();
  /*
   * The press arms the lesson's action, finishes it outright (a line that only asks to be read), or
   * hands straight over to the next one — a lesson whose own action is already done, like the name
   * of a chronicle begun over another. Any of the three means *this* line has stopped speaking,
   * which is what the caller is waiting for.
   */
  await expect
    .poll(
      async () => {
        const now = await lessonState(page);
        if (now.step === null) return 'gone';
        if (now.step !== spoken) return 'moved';
        return now.phase ?? 'gone';
      },
      { timeout: 10_000 },
    )
    .not.toBe('dialogue');
}

/** Reads out whatever lesson is speaking, if one is — a reload resumes the lesson it was on. */
export async function continueIfLesson(page: Page): Promise<void> {
  const now = await lessonState(page);
  if (now.step === null || now.phase !== 'dialogue') return;
  await eldricContinue(page);
}

/** A chronicle at the hub with the tutorial behind it, for the suites that are about other things. */
export async function freshChronicle(page: Page): Promise<void> {
  await importChronicleFile(page, join(import.meta.dirname, '..', 'fixtures', 'saves', 'fresh.chronicle'));
}

/**
 * The lesson the overlay is showing and which beat it is on, read straight off the DOM: a lesson
 * ends the moment its action lands, so a locator read can race the element's own removal.
 */
async function lessonState(page: Page): Promise<{ step: string | null; phase: string | null }> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="tutorial-overlay"]');
    return el
      ? { step: el.getAttribute('data-step'), phase: el.getAttribute('data-phase') }
      : { step: null, phase: null };
  });
}

/** The lesson the overlay is showing, or null when Eldric has nothing to say. */
export async function currentLesson(page: Page): Promise<string | null> {
  return (await lessonState(page)).step;
}

/** Title → New Chronicle → name → bind a starter → Emberhold, through the tutorial's first beats. */
export async function startChronicle(
  page: Page,
  name = 'Marvin',
  starter: StarterSlug = 'ser_corvin',
): Promise<void> {
  await gotoTitle(page);
  await page.getByTestId('btn-new-chronicle').click();
  // 1.1 — "Every chronicle begins with a name."
  await eldricContinue(page, 'tut.1.1');
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('begin-chronicle').click();
  await bindStarter(page, starter);
}

/** On the starter screen: read 1.2, bind one of the three Rares and wait for the hub. */
export async function bindStarter(page: Page, starter: StarterSlug = 'ser_corvin'): Promise<void> {
  await expect(page.getByTestId('screen-starter')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  // A chronicle begun over another one hears 1.1 here rather than at the name, so read whatever
  // is speaking until the binding's own lesson is.
  for (let attempt = 0; attempt < 3 && (await currentLesson(page)) !== 'tut.1.2'; attempt += 1) {
    await continueIfLesson(page);
    await settle(page);
  }
  // 1.2 — "Choose the champion you bind first."
  await eldricContinue(page, 'tut.1.2');
  await page.getByTestId(`bind-${starter}`).click();
  await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  // 1.3 — "To the crossing!" only points from here on, so the hub is the player's own again.
  await eldricContinue(page, 'tut.1.3');
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
  await continueIfLesson(page);
  await page.getByTestId('hotspot-champions').click();
  await expect(page.getByTestId('screen-champions')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/** Opens the settings dialog from the top bar and selects a tab by its label. */
export async function openSettingsTab(page: Page, tab: string): Promise<void> {
  await continueIfLesson(page);
  await page.getByTestId('topbar-settings').click();
  await expect(page.getByTestId('dialog-settings')).toBeVisible();
  await page.getByRole('tab', { name: tab }).click();
}

export async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

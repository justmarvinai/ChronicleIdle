import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Eternal Tower (docs/design/ETERNAL_TOWER.md) in a production build. The Path fixture is the
 * chronicle the tower is built for: Intro mastered — which is the only thing the gate asks for —
 * and a party at 6★ that can take the first floor. It is also written at an older save version,
 * so this run walks the 13 → 14 migration on its way in and finds a full ring of keys.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

/** Auto on and the fastest speed this chronicle has earned, so the floor fights itself. */
async function runItself(page: Page): Promise<void> {
  await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const auto = page.getByTestId('battle-auto');
  if ((await auto.getAttribute('aria-pressed')) !== 'true') await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  const speed = page.getByTestId('battle-speed');
  if (((await speed.textContent()) ?? '').includes('1')) await speed.click();
}

test.describe('the Eternal Tower', () => {
  // One floor at ×2 with the full stage and its FX; a software renderer needs the room.
  test.setTimeout(420_000);

  test('opens on a cleared Intro, climbs a floor for its spoils, and seals it behind you', async ({
    page,
  }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // The header carries what the whole roster is worth, under the experience bar.
    const power = page.getByTestId('account-power');
    await expect(power).toContainText('Account Power');
    const before = Number(
      (((await power.textContent()) ?? '').match(/([\d,]+)\s*$/)?.[1] ?? '0').replaceAll(',', ''),
    );
    expect(before).toBeGreaterThan(0);

    // A card of its own on Game Modes, open because Intro is behind this chronicle.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('mode-tower')).toContainText('A hundred floors');
    await page.getByTestId('enter-tower').click();
    await expect(page.getByTestId('screen-tower')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // A tower nobody has entered: no season yet, no climb, and a full ring of keys.
    await expect(page.getByTestId('tower-season')).toContainText('Not begun');
    await expect(page.getByTestId('tower-climb')).toContainText('0 of 100');
    await expect(page.getByTestId('tower-keys')).toContainText('10 / 10');
    await expect(page.getByTestId('tower-key-next')).toContainText('Full');

    // The ladder: floor 1 open, everything above it sealed, and the owner's odds on the boss
    // floors — the first of them and the hundredth.
    await expect(page.getByTestId('tower-floor-1')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('tower-floor-2')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('tower-odds-10')).toContainText('Ancient 0.1 %');
    await expect(page.getByTestId('tower-odds-100')).toContainText('Ancient 5 % · Sacred 0.65 %');

    // Climbing floor 1: the key is charged on the way in, before a blow is struck.
    await page.getByTestId('tower-climb-next').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('start-battle').click();
    await runItself(page);

    // The floor falls, and the result says what it paid rather than counting stars.
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
    await settle(page);
    const outcome = page.getByTestId('tower-outcome');
    await expect(outcome).toContainText('Floor 1');
    await expect(page.getByTestId('tower-outcome-climb')).toContainText('higher than you have ever been');
    await expect(page.getByTestId('tower-outcome-rewards')).toContainText('Gold');

    // Back to the tower: the climb has moved, floor 1 is behind the player and floor 2 is open.
    await page.getByTestId('result-tower').click();
    await expect(page.getByTestId('screen-tower')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('tower-climb')).toContainText('1 of 100');
    await expect(page.getByTestId('tower-best')).toContainText('1');
    await expect(page.getByTestId('tower-floor-1')).toHaveAttribute('data-state', 'cleared');
    await expect(page.getByTestId('tower-floor-2')).toHaveAttribute('data-state', 'next');
    // Nine keys left, and the clock has started on the tenth.
    await expect(page.getByTestId('tower-keys')).toContainText('9 / 10');
    await expect(page.getByTestId('tower-key-next')).toContainText(/\dm/);
    // The season began with that first attempt, not with the save.
    await expect(page.getByTestId('tower-season')).toContainText('No. 1');
    await expect(page.getByTestId('tower-resets')).toContainText(/29d/);

    // And it survives a reload, because the climb is in the save.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('nav-battle').click();
    await settle(page);
    await page.getByTestId('enter-tower').click();
    await expect(page.getByTestId('tower-climb')).toContainText('1 of 100', { timeout: 20_000 });

    expect(problems).toEqual([]);
  });
});

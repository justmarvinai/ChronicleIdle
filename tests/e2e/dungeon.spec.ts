import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, runItself, settle } from './helpers';

/**
 * The Dungeons (docs/design/DUNGEONS.md) in a production build.
 *
 * The Path fixture is written at an older save version, so this run walks the migration that adds
 * the dungeon ladder and its team row on the way in — and then finds four keeps untouched, which
 * is the migration doing its job as well as the screens'.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

test.describe('the Dungeons', () => {
  // One run at ×2 with the full stage and its FX; a software renderer needs the room.
  test.setTimeout(420_000);

  test('takes the first rung of Cindervault and comes back with gear', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // A card of its own on Game Modes, between the campaign and the bosses.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('mode-dungeons')).toContainText('Five keeps');
    await expect(page.getByTestId('note-dungeons')).toHaveText('4 keeps open · never entered');
    await page.getByTestId('enter-dungeons').click();
    await expect(page.getByTestId('screen-dungeons')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // Five cards, each saying what it holds — which is the only question the overview answers.
    await expect(page.getByTestId('dungeon-sets-cindervault')).toContainText('Ember Guard');
    await expect(page.getByTestId('dungeon-sets-ashenreach')).toContainText('Swiftfoot');
    await expect(page.getByTestId('note-dungeon-cindervault')).toHaveText('Never entered');

    // The Gilded Veil is shut, and says why on the card rather than only on its button: a mode a
    // player can see coming is a mode they can want.
    await expect(page.getByTestId('dungeon-sealed-gilded_veil')).toHaveText(
      'Sealed until there are necklaces, rings and trinkets to find.',
    );
    await expect(page.getByTestId('enter-dungeon-gilded_veil')).toHaveText('Awaiting accessories');

    // Cindervault: its keeper, its four sets, and twenty rungs with only the first one open.
    await page.getByTestId('enter-dungeon-cindervault').click();
    await expect(page.getByTestId('screen-dungeon')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('dungeon-keeper')).toContainText('The Cinder Warden');
    await expect(page.getByTestId('dungeon-sets')).toContainText('Bulwark');
    await expect(page.getByTestId('dungeon-deepest')).toHaveText('Nothing cleared here yet');
    await expect(page.getByTestId('dungeon-stage-1')).toHaveAttribute('data-next', 'true');
    await expect(page.getByTestId('dungeon-stage-2')).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('dungeon-stage-2')).toContainText('Clear stage 1 first');

    // A rung's price says what it buys: stars and energy rise together down the ladder.
    await expect(page.getByTestId('dungeon-stars-1')).toHaveText('1–2★');
    await expect(page.getByTestId('dungeon-stage-1')).toContainText('8 energy');
    await expect(page.getByTestId('dungeon-stars-20')).toHaveText('5–6★');
    await expect(page.getByTestId('dungeon-stage-20')).toContainText('13 energy');

    // Hard is a tab, not a screen, and it explains its own gate where the gate is met.
    await page.getByTestId('dungeon-tab-hard').click();
    await settle(page);
    await expect(page.getByTestId('dungeon-hard-locked')).toHaveText('Clear Normal stage 20 to open Hard');
    await page.getByTestId('dungeon-tab-normal').click();
    await settle(page);

    // Descending: the energy is charged on the way in, and the button names it.
    await page.getByTestId('dungeon-enter-1').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('start-battle')).toContainText('8 ⚡');
    await page.getByTestId('start-battle').click();
    await runItself(page);

    // The warden falls, and the result reports the haul rather than counting stars.
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
    await settle(page);
    const outcome = page.getByTestId('dungeon-outcome');
    await expect(outcome).toContainText('Cindervault');
    await expect(outcome).toContainText('Normal 1');
    // Every clear pays a piece, always — a gear farm that sometimes pays nothing is one nobody runs.
    await expect(page.getByTestId('dungeon-outcome-count')).toContainText('piece');
    await expect(page.getByTestId('dungeon-outcome-spoils')).toContainText('gold');
    await expect(page.getByTestId('dungeon-outcome-first')).toHaveText('First clear — stage 2 opens.');

    // Back into the keep, on the tab the run was spent on: one rung behind, the next open.
    await page.getByTestId('result-dungeon').click();
    await expect(page.getByTestId('screen-dungeon')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('dungeon-deepest')).toHaveText('Deepest cleared: Normal 1');
    await expect(page.getByTestId('dungeon-stage-1')).toContainText('Cleared');
    await expect(page.getByTestId('dungeon-stage-2')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('dungeon-stage-2')).toHaveAttribute('data-next', 'true');

    // And the climb survives a reload, because the ladder is two numbers in the save.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('nav-battle').click();
    await settle(page);
    await expect(page.getByTestId('note-dungeons')).toHaveText('4 keeps open · deepest Normal 1');
    await page.getByTestId('enter-dungeons').click();
    await expect(page.getByTestId('note-dungeon-cindervault')).toHaveText('Deepest: Normal 1', {
      timeout: 20_000,
    });

    expect(problems).toEqual([]);
  });
});

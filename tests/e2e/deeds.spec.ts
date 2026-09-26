import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { closeDialog, collectConsole, eldricContinue, importChronicleFile, settle } from './helpers';

/**
 * The Hall of Deeds (docs/design/ACHIEVEMENTS.md) in a production build, on the chronicle
 * `tools/fixtures/deeds-chronicle.ts` writes: level 13, the Hall's lesson still unheard, and nine
 * achievement tiers and one challenge already met — 105 renown once claimed, the first two ranks
 * and the Bronze frame the second one hangs up.
 */
const DEEDS = join(import.meta.dirname, '..', 'fixtures', 'saves', 'deeds.chronicle');

test.describe('the Hall of Deeds', () => {
  test.setTimeout(180_000);

  test('taught on the hub, a tier claimed by hand, the rest in one press, and the frame worn', async ({
    page,
  }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, DEEDS);

    // The lesson points at the Hall's own button, which says what is waiting inside.
    await eldricContinue(page, 'tut.6.10');
    const door = page.getByTestId('nav-deeds');
    await expect(door).toContainText('10');
    await door.click();
    await expect(page.getByTestId('screen-deeds')).toBeVisible();
    await settle(page);
    const claimAll = page.getByTestId('deeds-claim-all');
    await expect(claimAll).toHaveText(/Claim all \(10\)/);
    await expect(page.getByTestId('deeds-renown')).toHaveText('0');

    // One tier by hand: the first of Stand-breaker's two, and the card moves on to the second.
    await page.getByTestId('achievement-claim-achievement.stand_breaker').click();
    await expect(page.getByTestId('achievement-tier-achievement.stand_breaker')).toHaveText('II');
    await expect(page.getByTestId('deeds-renown')).toHaveText('5', { timeout: 5_000 });
    await expect(page.getByTestId('deeds-rank-1')).toHaveAttribute('data-state', 'locked');

    // The rest in one press: every tier, the challenge, and the two ranks they reach.
    await expect(claimAll).toHaveText(/Claim all \(9\)/);
    await claimAll.click();
    await expect(claimAll).toBeDisabled();
    await expect(page.getByTestId('deeds-renown')).toHaveText('105', { timeout: 5_000 });
    await expect(page.getByTestId('deeds-rank')).toHaveText('Page');
    await expect(page.getByTestId('deeds-rank-2')).toHaveAttribute('data-state', 'claimed');
    await expect(page.getByTestId('deeds-rank-3')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('achievement-tier-achievement.stand_breaker')).toHaveText('III');

    // The challenge is sealed on its own ledger.
    await page.getByTestId('deeds-tab-challenges').click();
    await expect(page.getByTestId('challenge-done-challenge.lone_blade')).toBeVisible();

    // Back on the hub the dot is gone: nothing is owed.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('nav-deeds')).not.toContainText(/\d/);

    // The second rank hung up the Bronze frame: worn from the profile, it rings the header too.
    await page.getByTestId('profile-chip').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await page.getByTestId('choose-frame').click();
    await expect(page.getByTestId('dialog-frame-picker')).toBeVisible();
    await expect(page.getByTestId('frame-frame.silver')).toBeDisabled();
    await page.getByTestId('frame-frame.bronze').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await expect(page.getByTestId('profile-portrait')).toHaveAttribute('data-frame', 'frame.bronze');
    await closeDialog(page);
    await expect(page.getByTestId('profile-chip-frame')).toHaveAttribute('data-frame', 'frame.bronze');
    expect(problems).toEqual([]);
  });
});

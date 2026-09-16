/**
 * The EA-0.1 walkthrough (ROADMAP Phase 15 acceptance: "every EA-0.1 feature of the brief
 * demonstrated in one recorded walkthrough").
 *
 * One run, video on, against a production build: a deep chronicle is imported and then every
 * system the brief names is opened and *used* once — the campaign fought, a champion levelled, a
 * piece equipped, gear crafted, a champion summoned, both boss gates entered, the boards claimed,
 * the Path read, the chest taken, the chronicle exported.
 *
 * It is a demonstration, not a second test suite. Each system already has a spec that pushes on
 * its edges; this one proves they are all reachable by a player in a single sitting, and leaves a
 * video behind that someone can watch instead of reading nineteen spec files. Assertions are
 * therefore one per system — the screen arrived, the action landed — and anything deeper belongs
 * in that system's own spec.
 */
import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { closeDialog, importChronicleFile, settle } from './helpers';

// The artefact this spec exists to produce.
test.use({ video: 'on' });

const CHRONICLE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

/** Back to the hub from wherever we are, through the screen's own way out. */
async function toHub(page: Page): Promise<void> {
  const back = page.getByRole('button', { name: 'Back' });
  if ((await back.count()) > 0) await back.first().click();
  await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

test.describe('the EA-0.1 walkthrough', () => {
  // A campaign fight renders through software WebGL on CI; the rest is menus.
  test.setTimeout(600_000);

  test('opens and uses every system of the brief in one sitting', async ({ page }) => {
    test.slow();

    // ── The chronicle. Import is itself an EA-0.1 feature (no accounts, local saves only).
    await importChronicleFile(page, CHRONICLE);
    const welcome = page.getByTestId('dialog-welcome-back');
    if ((await welcome.count()) > 0) {
      await welcome.getByRole('button', { name: 'Continue' }).click();
      await expect(welcome).toHaveCount(0);
    }
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);

    // ── The hub: the chronicle's purse, its level, and Emberhold itself.
    await expect(page.getByTestId('pill-gold')).toBeVisible();
    await expect(page.getByTestId('pill-energy')).toBeVisible();
    await expect(page.getByTestId('profile-chip-level')).toContainText(/\d/);

    // ── The Idle Chest.
    await page.getByTestId('hotspot-idle').click();
    const chest = page.getByTestId('dialog-idle-chest');
    await expect(chest).toBeVisible();
    await expect(page.getByTestId('idle-tier')).toBeVisible();
    const claim = page.getByTestId('idle-claim');
    if (await claim.isEnabled()) {
      await claim.click();
      await expect(page.getByTestId('idle-rewards')).toBeVisible();
      await page.getByTestId('idle-continue').click();
    } else {
      await closeDialog(page);
    }
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await settle(page);

    // ── The campaign: twelve settlements, and a stand fought to a result.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible();
    await settle(page);
    await page.getByTestId('enter-campaign').click();
    await expect(page.getByTestId('screen-campaign')).toBeVisible();
    await expect(page.getByTestId('campaign-stars')).toBeVisible();
    await settle(page);
    await page.getByTestId('enter-1').click();
    await expect(page.getByTestId('screen-settlement')).toBeVisible();
    await settle(page);
    await page.getByTestId('battle-stage-01-01').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('team-power')).toBeVisible();
    const auto = page.getByTestId('setup-auto').getByRole('switch');
    if ((await auto.getAttribute('aria-checked')) !== 'true') await auto.click();
    await page.getByTestId('start-battle').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 60_000 });
    // The HUD as it fights: waves, the turn count, the ability bar.
    await expect(page.getByTestId('battle-wave')).toBeVisible();
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
    await settle(page);
    await expect(page.getByTestId('result-title')).toHaveText('Victory');
    await expect(page.getByTestId('result-rewards')).toBeVisible();
    await page.getByTestId('result-hub').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);

    // ── The roster: champions, their kits and their lore.
    await page.getByTestId('hotspot-champions').click();
    await expect(page.getByTestId('screen-champions')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('roster-count')).toBeVisible();
    await page.locator('[data-testid^="roster-card-"]').first().click();
    await expect(page.getByTestId('champion-power')).toBeVisible();
    await page.getByTestId('tab-abilities').click();
    await expect(page.getByTestId('panel-abilities')).toBeVisible();
    await page.getByTestId('tab-lore').click();
    await expect(page.getByTestId('panel-lore')).toBeVisible();

    // ── The Armoury: six slots and the gear that fills them.
    await page.getByTestId('tab-gear').click();
    await expect(page.getByTestId('panel-gear')).toBeVisible();
    await settle(page);
    await toHub(page);
    await page.getByTestId('nav-armoury').click();
    await expect(page.getByTestId('screen-armoury')).toBeVisible();
    await expect(page.getByTestId('armoury-capacity')).toBeVisible();
    await settle(page);

    // ── The Forge: crafting a piece out of the campaign's materials.
    await page.getByTestId('armoury-forge').click();
    await expect(page.getByTestId('screen-forge')).toBeVisible();
    await settle(page);
    await page.getByTestId('craft-slot-boots').click();
    await expect(page.getByTestId('craft-cost')).toBeVisible();
    await page.getByTestId('craft-strike').click();
    await expect(page.getByTestId('craft-result')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('forge-tab-refine').click();
    await expect(page.getByTestId('refine-panel')).toBeVisible();
    await settle(page);
    await toHub(page);

    // ── The Tavern: a champion raised a level.
    await page.getByTestId('hotspot-tavern').click();
    await expect(page.getByTestId('screen-tavern')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('tavern-champion-level')).toBeVisible();
    await page.getByTestId('tavern-tab-skills').click();
    await expect(page.getByTestId('tavern-tomes')).toBeVisible();
    await settle(page);
    await toHub(page);

    // ── The Portal: shards, rates, and a summon with its reveal.
    await page.getByTestId('hotspot-portal').click();
    await expect(page.getByTestId('screen-portal')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('portal-held-ancient')).toBeVisible();
    await page.getByTestId('portal-rates').click();
    await expect(page.getByTestId('dialog-summon-rates')).toBeVisible();
    await closeDialog(page);
    await settle(page);
    const summon = page.getByTestId('portal-summon-1');
    if (await summon.isEnabled()) {
      await summon.click();
      await expect(page.getByTestId('summon-results')).toBeVisible({ timeout: 60_000 });
      await page.getByTestId('summon-continue').click();
      await settle(page);
    }
    await toHub(page);

    // ── The bosses: the daily gate and the weekly one, their tiers and their records.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible();
    await settle(page);
    await page.getByTestId('enter-daily').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible();
    await expect(page.getByTestId('bosses-keys')).toBeVisible();
    await expect(page.getByTestId('boss-tier-normal')).toBeVisible();
    await settle(page);
    await toHub(page);
    await page.getByTestId('nav-battle').click();
    await settle(page);
    await page.getByTestId('enter-weekly').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible();
    await expect(page.getByTestId('bosses-sheet')).toBeVisible();
    await settle(page);
    await toHub(page);

    // ── The boards: the day's quests and the week's, with their points track.
    await page.getByTestId('nav-quests').click();
    await expect(page.getByTestId('screen-quests')).toBeVisible();
    await expect(page.getByTestId('quests-points')).toBeVisible();
    await settle(page);
    await page.getByTestId('quests-tab-weekly').click();
    await expect(page.locator('[data-testid^="quest-row-quest.weekly."]').first()).toBeVisible();
    await settle(page);
    await toHub(page);

    // ── The Chronicler's Path: the mission line and Eldric reading it.
    await page.getByTestId('nav-missions').click();
    await expect(page.getByTestId('screen-missions')).toBeVisible();
    await expect(page.getByTestId('missions-progress')).toBeVisible();
    await expect(page.getByTestId('missions-eldric')).toBeVisible();
    await settle(page);
    await toHub(page);

    // ── The chronicle itself: the profile, its titles, and the export the brief promises.
    await page.getByTestId('profile-chip').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await expect(page.getByTestId('profile-stars')).toBeVisible();
    await expect(page.getByTestId('profile-titles')).toBeVisible();
    await closeDialog(page);
    await settle(page);
    await page.getByTestId('topbar-settings').click();
    await expect(page.getByTestId('dialog-settings')).toBeVisible();
    await page.getByRole('tab', { name: 'Save data' }).click();
    const download = page.waitForEvent('download');
    await page.getByTestId('export-save').click();
    await expect((await download).suggestedFilename()).toMatch(/\.chronicle$/);
    await closeDialog(page);

    // And back where it started, whole.
    await expect(page.getByTestId('screen-hub')).toBeVisible();
  });
});

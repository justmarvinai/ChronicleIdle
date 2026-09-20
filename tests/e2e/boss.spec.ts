import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The boss fixture is a level-20 chronicle with a four-champion party at 4★40
 * (`tools/fixtures/boss-chronicle.ts`) — enough to put a fifth of Gravemaw's Easy pool down with
 * one key, so the chest ladder and the damage that accumulates across keys are both visible in a
 * production build. (The 8→9 migration itself is covered by `tests/fixtures/saves/v8.json` in the
 * unit suite; this fixture is written at the current save version.)
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'boss.chronicle');
const EASY_POOL = 250_000;

/** The pool's remaining HP on the arena's boss bar — the race's progress, mid-fight. */
async function bossHpLeft(page: Page): Promise<number> {
  const text = (await page.getByTestId('boss-bar').textContent()) ?? '';
  const match = /([\d,]+)\s*\/\s*250000/.exec(text);
  return match?.[1] ? Number(match[1].replaceAll(',', '')) : EASY_POOL;
}

/** The banked damage the tier card prints, as a number. */
async function bankedDamage(page: Page): Promise<number> {
  const text = (await page.getByTestId('boss-tier-easy').textContent()) ?? '';
  const match = /([\d,]+) of 250,000/.exec(text);
  if (!match?.[1]) throw new Error(`no damage in tier card: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

/**
 * Auto on and the fastest speed this chronicle has earned, so a race runs itself. Both settings
 * persist once set, so the second fight of the run starts where the first left it — and ×2 is this
 * chronicle's ceiling, since it has not cleared Normal (`CAMPAIGN.md` §8).
 */
async function runItself(page: Page): Promise<void> {
  await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const auto = page.getByTestId('battle-auto');
  if ((await auto.getAttribute('aria-pressed')) !== 'true') await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  const speed = page.getByTestId('battle-speed');
  if (((await speed.textContent()) ?? '').includes('1')) await speed.click();
  await expect(speed).toContainText('2');
}

/**
 * One key, spent: the race runs itself until the pool has taken `damage`, then the party retreats
 * and the damage banks all the same (BOSSES.md §1). A race to its own turn limit is a fifty-turn
 * fight — minutes of software-rendered stage on a shared runner — and what this suite is here to
 * prove is the wiring around it, not the engine's turn loop (`period.test.ts` holds that).
 */
async function spendKeyUntil(page: Page, damage: number): Promise<void> {
  await page.getByTestId('bosses-fight').click();
  await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  await page.getByTestId('start-battle').click();
  await runItself(page);

  // The arena says what a boss is: a pool, what it shrugs off, and how close the enrage is.
  await expect(page.getByTestId('boss-bar')).toContainText(String(EASY_POOL));
  await expect(page.getByTestId('boss-unshakeable')).toBeVisible();
  await expect(page.getByTestId('boss-enrage')).toContainText('Enrages in');

  await expect
    .poll(() => bossHpLeft(page), { timeout: 300_000, intervals: [2_000] })
    .toBeLessThanOrEqual(EASY_POOL - damage);
  await page.getByTestId('battle-pause').click();
  await page.getByTestId('pause-retreat').click();
  await page.getByTestId('pause-retreat-confirm').click();
  await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 120_000 });
  await settle(page);
}

/** The bosses live behind Battle now, not on the hub (the owner's third batch). */
async function openBossGate(page: Page, mode: 'daily' | 'weekly'): Promise<void> {
  await page.getByTestId('nav-battle').click();
  await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  await page.getByTestId(`enter-${mode}`).click();
  await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

test.describe('the daily boss', () => {
  // Two races at ×2 with the full stage and its FX; a software renderer needs the room.
  test.setTimeout(600_000);

  test('spends both keys into one pool, and pays a chest once', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // Battle leads to the gate, and the mode card wears the boss's state: two keys, unspent.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('note-daily')).toHaveText('Keys 2/2');
    await page.getByTestId('enter-daily').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // A fresh period: two keys, an empty pool, every chest locked and no record yet.
    await expect(page.getByTestId('bosses-keys')).toContainText('2/2');
    await expect(page.getByTestId('boss-tier-easy')).toContainText('0 of 250,000');
    await expect(page.getByTestId('boss-chest-easy-5')).toBeDisabled();
    await expect(page.getByTestId('boss-record-easy')).toContainText('Nobody here has faced Gravemaw');

    // The mechanics sheet is the fight's rules in writing (BOSSES.md §4).
    await page.getByTestId('bosses-sheet').click();
    await expect(page.getByTestId('boss-sheet-immunities')).toContainText('Stun');
    await expect(page.getByTestId('boss-sheet-rotation')).toContainText('A1');
    await page.keyboard.press('Escape');
    await settle(page);

    // ── The first key: enough damage for the first chest, then out ────────────
    await spendKeyUntil(page, 13_000);
    await expect(page.getByTestId('result-boss-damage')).not.toHaveText('0');
    await expect(page.getByTestId('result-boss-total')).toContainText('The pool now holds');
    await expect(page.getByTestId('result-boss-record')).toBeVisible();

    await page.getByTestId('result-gate').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    const afterOneKey = await bankedDamage(page);
    expect(afterOneKey).toBeGreaterThan(12_500);
    await expect(page.getByTestId('bosses-keys')).toContainText('1/2');
    await expect(page.getByTestId('boss-record-easy')).toContainText('Best');
    await expect(page.getByTestId('boss-records')).toContainText(afterOneKey.toLocaleString('en-US'));

    // ── The chest that damage earned, once ────────────────────────────────────
    const chest = page.getByTestId('boss-chest-easy-5');
    await expect(chest).toBeEnabled();
    await chest.click();
    await expect(page.getByTestId('pill-gold')).toContainText('105K');
    await expect(chest).toBeDisabled();

    // ── The second key: a single hit is enough, and it still banks ────────────
    await spendKeyUntil(page, 1);
    await expect(page.getByTestId('result-boss')).toBeVisible();

    await page.getByTestId('result-gate').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    // Both keys went into the same pool (BOSSES.md §1), and there are none left to spend.
    expect(await bankedDamage(page)).toBeGreaterThan(afterOneKey);
    await expect(page.getByTestId('bosses-keys')).toContainText('0/2');
    await expect(page.getByTestId('bosses-status')).toContainText('No keys left');
    await expect(page.getByTestId('bosses-fight')).toBeDisabled();
    await expect(page.getByTestId('boss-chest-easy-5')).toBeDisabled();

    // The period survives a reload: the pool, the spent keys and the taken chest are all saved.
    const banked = await bankedDamage(page);
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await openBossGate(page, 'daily');
    expect(await bankedDamage(page)).toBe(banked);
    await expect(page.getByTestId('bosses-keys')).toContainText('0/2');
    await expect(page.getByTestId('boss-chest-easy-5')).toBeDisabled();

    expect(problems).toEqual([]);
  });
});

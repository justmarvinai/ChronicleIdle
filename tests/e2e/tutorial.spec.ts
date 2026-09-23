import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  collectConsole,
  currentLesson,
  eldricContinue,
  importChronicleFile,
  settle,
  speedUpBattle,
  startChronicle,
} from './helpers';

/**
 * Eldric's onboarding (docs/design/TUTORIAL.md, ROADMAP Phase 14 acceptance):
 *
 * - the first chapter is walked end to end, from the naming to the Chronicler's Provisions, inside
 *   the six minutes the design gives it;
 * - a later chapter can be waved off, and the chronicle is whole afterwards.
 *
 * Both run against a production build, through the save the first one writes and the file the
 * second one imports.
 */
const SKIP_SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'tutorial.chronicle');

/** Reads the lesson out and presses Continue, when the overlay is showing one. */
async function readLesson(page: Page, step: string): Promise<void> {
  await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-step', step, {
    timeout: 30_000,
  });
  await eldricContinue(page);
  await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-phase', 'action');
}

/** Off the victory panel: the result screen lands on the world map. */
async function backToMap(page: Page): Promise<void> {
  // Three stands is a level, and a level-up is a dialog over the panel.
  const levelUp = page.getByTestId('level-up-continue');
  if (await levelUp.count()) {
    await levelUp.click();
    await settle(page);
  }
  await page.getByTestId('result-campaign').click();
  await expect(page.getByTestId('screen-campaign')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/** Thornwood Crossing's stand list. */
async function enterSettlement(page: Page): Promise<void> {
  await page.getByTestId('enter-1').click();
  await expect(page.getByTestId('screen-settlement')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

/**
 * One stand, cleared from the stand list. Auto is asked for and the fastest speed a fresh
 * chronicle has is set (×2, `CAMPAIGN.md` §1), but the loop answers a turn itself whenever one
 * opens: what this test needs is the stand to fall so the lesson can move on, and whether the
 * policy steers it is `battle.spec.ts`'s subject, not this one's. A wait that only watches for the
 * result cannot tell a slow fight from a fight nobody is playing, and on CI that difference cost
 * the whole budget three runs running.
 */
async function clearStand(page: Page, stage: string): Promise<void> {
  await page.getByTestId(stage).click();
  await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  const auto = page.getByTestId('setup-auto').getByRole('switch');
  if ((await auto.getAttribute('aria-checked')) !== 'true') await auto.click();
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 20_000 });
  // The setting is remembered, so only the first of these fights presses it — and a stand the
  // party walks over can be won before the press lands, which `speedUpBattle` forgives.
  await speedUpBattle(page);

  const result = page.getByTestId('screen-battle-result');
  const open = page.locator('[data-testid="ability-a1"][data-ready="true"]');
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if ((await result.count()) > 0) break;
    if ((await open.count()) > 0) await spendAnyTurn(page);
    else await page.waitForTimeout(500);
  }
  await expect(result).toBeVisible({ timeout: 60_000 });
}

/** An enemy the reticle will actually take — a fallen one is no longer a target. */
function livingEnemy(page: Page) {
  return page.locator('[data-testid^="plate-w"][data-targetable="true"]').first();
}

/**
 * Answers the open turn with one ability and a target. A press can be refused for reasons the
 * fight owns — the ability needs no target, the turn resolved as the click landed, a lesson opened
 * over it — and none of those is what a tutorial test is asserting, so they are let go.
 */
async function spend(page: Page, ability: ReturnType<Page['getByTestId']>): Promise<void> {
  await ability.click({ timeout: 5_000 }).catch(() => undefined);
  const enemy = livingEnemy(page);
  if (await enemy.count()) await enemy.click({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

/**
 * The ability in `slot` while it can be pressed. Counting this is a snapshot of the bar as it
 * stands; asking a button whether it is disabled waits for the button, and the bar changes hands
 * between two such questions often enough — the turn passes to a champion with fewer abilities,
 * or a lesson opens — that a wait for a button that had gone once ran out a whole walk.
 */
function pressable(page: Page, slot: 'a1' | 'a2' | 'a3' | 'a4') {
  return page.locator(`[data-testid="ability-${slot}"][data-ready="true"]`);
}

/** Spends the acting champion's turn on the ability the lesson is about. */
async function spendTurn(page: Page, slot: 'a1' | 'a2'): Promise<void> {
  const ability = page.getByTestId(`ability-${slot}`);
  await expect(ability).toBeVisible({ timeout: 30_000 });
  await spend(page, ability);
}

/**
 * Plays the fight on until Eldric reaches `step`, pressing the ability the lesson is waiting for
 * whenever its champion is up and spending anyone else's turn on whatever they have ready.
 *
 * A single press is not enough to build this on. `spend` lets a refused press go — the turn can
 * resolve as the click lands, a lesson can open over it — and on a loaded machine that happens
 * often enough to matter. Pressing once and then spending every later turn on A1 leaves a lesson
 * that is waiting for A2 waiting forever, which is a stall rather than a slow run: the fight keeps
 * going, the overlay never moves, and the only thing that ends it is the budget. So the lesson
 * moving on is what ends this loop, and the taught ability is offered every turn until it does.
 */
async function playUntilLesson(page: Page, step: string, slot: 'a1' | 'a2'): Promise<void> {
  for (let turn = 0; turn < 24; turn += 1) {
    if ((await currentLesson(page)) === step) return;
    const taught = pressable(page, slot);
    if ((await taught.count()) > 0) await spend(page, taught);
    else await spendAnyTurn(page);
  }
}

/** Spends whatever the champion whose turn it is has ready. */
async function spendAnyTurn(page: Page): Promise<void> {
  for (const slot of ['a1', 'a2', 'a3', 'a4'] as const) {
    const ability = pressable(page, slot);
    if ((await ability.count()) === 0) continue;
    await spend(page, ability);
    return;
  }
  await page.waitForTimeout(500);
}

test.describe('the tutorial', () => {
  /*
   * The longest scripted run in the suite by a wide margin: the naming, the binding, four
   * screens, a battle played turn by turn to a victory, and then two whole stands more, because
   * the lesson that teaches free play only ends when the third stand falls.
   *
   * The budget was never the whole story here. Twice the walk ran out of it while something was
   * quietly stuck rather than slow: a lesson waiting for a press that was refused once and never
   * offered again (`playUntilLesson`), and a stand nobody was playing (`clearStand`). Both now
   * end by doing the thing rather than by waiting for it. The walk takes 2.8 minutes in this
   * container and 4.4 with six busy loops on its four cores, so fifteen minutes is room for a
   * runner having a much worse day than that.
   */
  test.setTimeout(900_000);

  test('walks the first chapter from the naming to the Provisions', async ({ page }) => {
    const problems = collectConsole(page);

    // 1.1 and 1.2 — the name and the binding, both taught by the helper.
    await startChronicle(page, 'Marvin', 'ser_corvin');

    // 1.3 — Emberhold stays the player's own while the pointer rests on the gate.
    expect(await currentLesson(page)).toBe('tut.1.3');
    await expect(page.getByTestId('tutorial-spotlight')).toBeVisible();
    await page.getByTestId('hotspot-campaign').click();
    await settle(page);
    await page.getByTestId('enter-campaign').click();
    await expect(page.getByTestId('screen-campaign')).toBeVisible({ timeout: 20_000 });

    // 1.4 — the settlement, then the stand.
    await readLesson(page, 'tut.1.4');
    await page.getByTestId('enter-1').click();
    await expect(page.getByTestId('screen-settlement')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('battle-stage-01-01').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });

    // 1.5 — the team is placed; all that is left is to begin.
    await readLesson(page, 'tut.1.5');
    await page.getByTestId('start-battle').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 20_000 });

    // 1.6 — the first turn of the player's own: an ability, then a target.
    await readLesson(page, 'tut.1.6');
    await expect(page.getByTestId('tutorial-spotlight')).toBeVisible();
    await spendTurn(page, 'a1');

    // 1.7 — the second wave, on a champion who has a second ability. Until that moment arrives
    // Eldric says nothing and the fight is the player's own, which is what this plays out.
    await playUntilLesson(page, 'tut.1.7', 'a1');
    await readLesson(page, 'tut.1.7');

    // 1.8 — handing the fight over. A2 is what this lesson is waiting for, so it is offered every
    // turn until Eldric moves on rather than pressed once and hoped for.
    await playUntilLesson(page, 'tut.1.8', 'a2');
    await readLesson(page, 'tut.1.8');
    await page.getByTestId('battle-auto').click();

    // 1.9 — the spoils, read on the victory panel. Handing a fight to auto and waiting for its
    // result is the suite's slowest single wait: the rest of the stand plays out at ×1, event by
    // event, through a software renderer. Every other spec budgets 300 s for it (`battle.spec.ts`,
    // `progression`, `tower`, `walkthrough`) and this file's own `clearStage` helper 120 s; 60 s
    // was the outlier, and on a slow runner the fight was still going when it ran out.
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
    await expect(page.getByTestId('result-title')).toContainText('Victory');
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-step', 'tut.1.9', {
      timeout: 30_000,
    });
    await eldricContinue(page);

    // 1.10 — free play until the third stand falls: nothing is dimmed and nothing is blocked.
    await backToMap(page);
    await enterSettlement(page);
    await readLesson(page, 'tut.1.10');
    await expect(page.getByTestId('tutorial-hint')).toBeVisible();

    // Two more stands, fought on auto — the lesson waits them out.
    await clearStand(page, 'battle-stage-01-02');
    await backToMap(page);
    await enterSettlement(page);
    await clearStand(page, 'battle-stage-01-03');
    await backToMap(page);

    // 1.11 — five hundred measures of energy, counted up on the pill while he names them.
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-step', 'tut.1.11', {
      timeout: 30_000,
    });
    /*
     * The pill *counts up* to its new value, so its text is whatever frame it happens to be
     * drawing. `data-amount` carries the wallet it is heading for, which is the fact under test —
     * and `toHaveAttribute` retries, where a one-shot `textContent()` read races the animation.
     */
    await expect
      .poll(async () => Number(await page.getByTestId('pill-energy').getAttribute('data-amount')))
      .toBeGreaterThan(400);
    await eldricContinue(page);

    // The chapter is over: whatever Eldric says next belongs to a later one.
    await settle(page);
    const next = await currentLesson(page);
    expect(next === null || next.startsWith('tut.2.')).toBe(true);
    expect(problems).toEqual([]);
  });

  test('waves a lesson off without leaving the chronicle stuck', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SKIP_SAVE);

    // The chronicle stands at the Hall with the Path's lesson open. The Path is chapter 2 now:
    // the missions open at level 1, so Eldric names them straight after the first stand.
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-step', 'tut.2.1', {
      timeout: 30_000,
    });
    await expect(page.getByTestId('tutorial-lesson')).toContainText('Chapter 2');

    // A reload resumes the lesson it was on, because the lesson is a fact about the save.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    // Coming back also brings the Welcome Back report, which is a dialog over the hub.
    const welcome = page.getByTestId('dialog-welcome-back');
    if (await welcome.isVisible()) await welcome.getByRole('button', { name: 'Continue' }).click();
    await expect(welcome).toBeHidden();
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-step', 'tut.2.1', {
      timeout: 30_000,
    });
    await page.getByTestId('tutorial-skip').click();

    // Eldric goes quiet, the chapter's own Provision is still handed over, and the game is whole.
    await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 20_000 });
    // The fixture stands at its cap of 110; the Path's chapter carries 250 over it. Read off
    // `data-amount` rather than the pill's text, which is still counting up to it.
    await expect(page.getByTestId('pill-energy')).toHaveAttribute('data-amount', '360');
    await settle(page);
    await page.getByTestId('nav-missions').click();
    await expect(page.getByTestId('screen-missions')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('mission-card-mission.01.01')).toBeVisible();
    await page.getByTestId('topbar-settings').click();
    await expect(page.getByTestId('dialog-settings')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(problems).toEqual([]);
  });
});

/**
 * Sending the company into the passage in hand (docs/design/UNWRITTEN.md §4.2, §6).
 *
 * The plan is drawn from the expedition — the fight as it stands, its foes bent by the rules, each
 * champion's wounds and inscriptions — and the battle is started from it. The settle is left with
 * the eager session module, which the battle screen calls when the fight ends; this module lives
 * in the Unwritten's chunk, so the battle screen never has to import it.
 */
import { maxBattleSpeed } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { clearBossSession } from '@state/boss-session';
import { clearBrewerySession } from '@state/brewery-session';
import { progressOf } from '@state/campaign';
import { clearCampaignSession } from '@state/campaign-session';
import { clearDungeonSession } from '@state/dungeon-session';
import { palaceBonusOf } from '@state/palace';
import { useGameStore } from '@state/store';
import { clearTowerSession } from '@state/tower-session';
import { holdUnwrittenFight } from '@state/unwritten-session';
import { clearAftermath, noteAftermath } from '@state/unwritten/aftermath';
import { planUnwrittenFight, unwrittenCommands } from '@state/unwritten/commands';

/** Starts the battle for the passage in hand with these members, and enters the battle screen. */
export function launchUnwrittenFight(fielded: readonly string[], control?: 'manual' | 'auto'): Result<void> {
  const { save, actions } = useGameStore.getState();
  if (!save) return fail('invalid_argument', 'No chronicle loaded');
  const plan = planUnwrittenFight(fielded, Date.now());
  if (!plan.ok) return plan;
  // One fight settles through one mode: nothing another mode left behind may claim this one.
  clearCampaignSession();
  clearBossSession();
  clearTowerSession();
  clearBrewerySession();
  clearDungeonSession();
  clearAftermath();
  const speed = Math.min(save.settings.battleSpeed, maxBattleSpeed(progressOf(save))) as BattleSpeed;
  const started = battleController.start({
    encounterId: plan.value.encounter.id,
    encounter: plan.value.encounter,
    enemyById: plan.value.enemyById,
    shaping: plan.value.shaping,
    instanceIds: plan.value.fielded,
    // The company's Echoes stand beside the roster for this fight only.
    roster: { ...save.roster, ...plan.value.echoes },
    inventory: save.inventory,
    palace: palaceBonusOf(save.palace.nodes),
    control: control ?? (save.settings.autoBattle ? 'auto' : 'manual'),
    speed,
    seed: plan.value.seed,
    awaitPresenter: true,
  });
  if (!started.ok) return started;
  holdUnwrittenFight((outcome) => {
    const settled = unwrittenCommands.settle(outcome);
    if (!settled.ok) return;
    noteAftermath({
      fight: outcome.kind,
      fell: outcome.units.flatMap((unit) =>
        unit.side === 'ally' && !unit.alive && unit.instanceId ? [unit.instanceId] : [],
      ),
      illuminated: settled.value.receipt.illuminated,
      ended: settled.value.receipt.ended,
      paid: settled.value.changes,
    });
  });
  actions.push({ name: 'battle' });
  return ok(undefined);
}

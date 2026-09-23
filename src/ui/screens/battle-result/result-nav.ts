/**
 * Where the result screen's presses lead (docs/tech/UI_DESIGN.md §5.10). Every exit ends the fight
 * and clears every run's session, so the next fight is charged and seeded on its own; each then
 * rebuilds the stack a player would have walked to get where the press sends them.
 */
import { content } from '@content/registry';
import type { StagePointer } from '@engine/campaign/progress';
import type { DungeonDifficulty } from '@content/balance/dungeon';
import type { Element } from '@content/champions/types';
import { battleController } from '@state/battle/index';
import { clearBossSession } from '@state/boss-session';
import { clearBrewerySession } from '@state/brewery-session';
import { clearCampaignSession } from '@state/campaign-session';
import { clearDungeonSession } from '@state/dungeon-session';
import type { GameActions } from '@state/store';
import { clearTowerSession } from '@state/tower-session';
import { launchCampaignRun } from '@ui/flows/campaign';

/** Ends the fight and forgets every run it belonged to. */
export function endFight(): void {
  battleController.end();
  clearCampaignSession();
  clearBossSession();
  clearTowerSession();
  clearBrewerySession();
  clearDungeonSession();
}

/** The places a result can send the player, beyond the modes' own screens. */
export type ResultExit = 'hub' | 'campaign' | 'team' | 'palace' | 'tavern' | 'champions' | 'portal';

/**
 * Leaves for `exit`. *Team* goes back to the stand's setup through the campaign and its settlement,
 * so the back button retraces the way in; without a stand in flight it stops at the campaign.
 */
export function leaveResult(
  actions: GameActions,
  exit: ResultExit,
  stand: { pointer: StagePointer; encounterId: string } | null,
): void {
  endFight();
  actions.resetStack({ name: 'hub' });
  if (exit === 'hub') return;
  if (exit === 'palace' || exit === 'tavern' || exit === 'champions' || exit === 'portal') {
    actions.push({ name: exit });
    return;
  }
  actions.push({ name: 'campaign' });
  if (exit === 'campaign' || !stand) return;
  actions.push({ name: 'settlement', settlement: stand.pointer.settlement });
  actions.push({ name: 'battle-setup', encounterId: stand.encounterId });
}

/**
 * The same stand again with the same team and the same number of runs; the setup screen sits under
 * the fight, so a back press from it lands where a new start would have.
 */
export function replayStand(
  actions: GameActions,
  stand: { pointer: StagePointer; encounterId: string; cost: number },
  team: readonly string[],
  requested: number,
): void {
  battleController.end();
  clearCampaignSession();
  actions.resetStack({ name: 'hub' });
  actions.push({ name: 'campaign' });
  actions.push({ name: 'settlement', settlement: stand.pointer.settlement });
  actions.push({ name: 'battle-setup', encounterId: stand.encounterId });
  const result = launchCampaignRun({ pointer: stand.pointer, instanceIds: [...team], repeat: requested });
  if (!result.ok) actions.toast('error', 'campaignRun.insufficientEnergy', { cost: stand.cost });
}

/** The next stand's setup, with the stand selected on its settlement's list. */
export function nextStand(actions: GameActions, next: StagePointer): void {
  battleController.end();
  clearCampaignSession();
  actions.resetStack({ name: 'hub' });
  actions.push({ name: 'campaign' });
  actions.push({ name: 'settlement', settlement: next.settlement });
  actions.selectStage(next);
  const ref = content.settlementByIndex(next.settlement)?.stages[next.stage - 1];
  if (ref) actions.push({ name: 'battle-setup', encounterId: `encounter.${ref.id}.${next.difficulty}` });
}

/** Back to the boss gate the key was spent at. */
export function backToGate(actions: GameActions, bossId: string | null): void {
  endFight();
  actions.resetStack({ name: 'hub' });
  if (bossId) actions.push({ name: 'bosses', boss: bossId });
}

/** Back to the tower, which opens on the floor the climb stands at. */
export function backToTower(actions: GameActions): void {
  endFight();
  actions.resetStack({ name: 'hub' });
  actions.push({ name: 'tower' });
}

/** Back into the keep the run was spent in, on the tab it was spent on. */
export function backToKeep(actions: GameActions, slug: string | null, difficulty: DungeonDifficulty): void {
  endFight();
  actions.resetStack({ name: 'hub' });
  actions.push(slug ? { name: 'dungeon', dungeon: slug, difficulty } : { name: 'dungeons' });
}

/** Back into the hall the run was spent in, so the day's next run is one press away. */
export function backToHall(actions: GameActions, hall: Element | null): void {
  endFight();
  actions.resetStack({ name: 'hub' });
  actions.push(hall ? { name: 'brewery', hall } : { name: 'brewery' });
}

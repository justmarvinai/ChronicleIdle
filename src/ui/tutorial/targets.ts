/**
 * The one map from the script's targets to the elements they live on (ADR-042).
 *
 * The script names *what* to point at; this file is the only place that knows *where* that is. The
 * record is exhaustive over `TutorialTarget`, so a target the script uses and this file does not
 * know is a compile error rather than a spotlight that never appears — and every selector is an
 * existing `data-testid`, which is why no screen has to know the tutorial exists.
 *
 * A prefix selector stands for a family of elements (every unit plate, whichever are on the
 * stage); the overlay takes the union of what it finds.
 */
import type { TutorialTarget } from '@content/tutorial/types';

const testId = (id: string): string => `[data-testid="${id}"]`;
/** Every element whose test id starts with `prefix` — one target, many elements. */
const family = (prefix: string): string => `[data-testid^="${prefix}"]`;

export const TARGET_SELECTOR: Readonly<Record<TutorialTarget, string>> = {
  'name.input': testId('name-input'),
  'name.begin': testId('begin-chronicle'),
  'starter.cards': testId('starter-cards'),

  'hub.campaign': testId('hotspot-campaign'),
  'hub.champions': testId('hotspot-champions'),
  'hub.tavern': testId('hotspot-tavern'),
  'hub.portal': testId('hotspot-portal'),
  'hub.forge': testId('hotspot-forge'),
  'hub.hall': testId('hotspot-hall'),
  'hub.idle': testId('hotspot-idle'),
  'hub.mine': testId('hotspot-mine'),
  'hub.deeds': testId('nav-deeds'),
  'hub.quests': testId('nav-quests'),
  'hub.missions': testId('nav-missions'),
  'topbar.energy': testId('pill-energy'),

  'modes.campaign': testId('mode-campaign'),
  'campaign.settlement1': testId('settlement-1'),
  'settlement.stage1': testId('stage-01-01'),
  'settlement.stage2': testId('stage-01-02'),
  'setup.team': testId('setup-team'),
  'setup.start': testId('start-battle'),
  'setup.repeat': testId('auto-repeat'),
  'setup.instant': testId('instant'),
  'deeds.claimAll': testId('deeds-claim-all'),

  'battle.ability1': testId('ability-a1'),
  'battle.ability2': testId('ability-a2'),
  // Both sides: a target may be an ally as easily as an enemy.
  'battle.units': family('plate-'),
  'battle.auto': testId('battle-auto'),
  'battle.speed': testId('battle-speed'),
  // The stars sit in the result's crest and the spoils in its side panel: 1.9 points at both.
  'result.stars': testId('result-stars'),
  'result.rewards': testId('result-rewards'),

  'tavern.roster': testId('tavern-rail'),
  'tavern.brews': testId('brew-row'),
  'tavern.upgrade': testId('tavern-upgrade'),
  'tavern.rankTab': testId('tavern-tab-rank'),
  'tavern.skillsTab': testId('tavern-tab-skills'),

  'champions.roster': testId('roster-rail'),
  'champions.gearTab': testId('tab-gear'),
  'champions.weaponSlot': testId('gear-slot-weapon'),
  'champions.armoury': testId('gear-open-armoury'),
  'gear.picker': testId('gear-picker-list'),
  'gear.equip': testId('gear-equip'),
  'armoury.racks': testId('armoury-racks'),
  'armoury.upgrade': testId('gear-upgrade-1'),

  'portal.shard': testId('portal-shard-ancient'),
  'portal.summon': testId('portal-summon-1'),
  'summon.card': testId('summon-card-0'),

  'quests.login': testId('quest-claim-quest.daily.login'),
  'quests.track': testId('quests-points'),
  'idle.claim': testId('idle-claim'),
  'mine.collect': testId('mine-collect'),
  'mine.dig': testId('mine-next'),
  'missions.card': testId('mission-claim-mission.01.01'),

  'forge.craftTab': testId('forge-tab-craft'),
  'forge.refineTab': testId('forge-tab-refine'),
  'boss.keys': testId('bosses-keys'),
  'boss.sheet': testId('bosses-sheet'),
};

/** Every element a target stands for, in document order. */
export function targetElements(target: TutorialTarget): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(TARGET_SELECTOR[target])];
}

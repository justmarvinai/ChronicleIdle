/**
 * The Chronicler's Path in the save (docs/design/QUESTS_MISSIONS.md §4).
 *
 * The line is derived from what has been claimed (`@engine/missions/path`), so this module is the
 * three things that *write*: claiming the open mission — which pays it and opens the next one with
 * a fresh baseline — taking a finished chapter's chest, and naming the 6★ Legendary piece Eldric
 * leaves behind. All three are once-only, and all three refuse rather than pay twice.
 */
import { content } from '@content/registry';
import type { CurrencyAmount } from '@content/currencies/types';
import { GEAR_SLOTS, type ChampionId, type GearSlot } from '@content/champions/types';
import type { ChapterChestDef, MissionDef } from '@content/missions/types';
import { cloneInstance, createInstance, instanceIdFor } from '@engine/champions/instance';
import type { ChampionInstance } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';
import type { CurrencyChange } from '@engine/economy/wallet';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance } from '@engine/gear/instance';
import { clonePiece } from '@engine/gear/instance';
import { missionBaselineKeys, pathView, type PathView } from '@engine/missions/path';
import { counter, bumpCounter } from '@engine/progression/counters';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { Rng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { GOAL_LOOKUPS } from './goal-lookups';
import { payCurrencies } from './payout';

/** The feature that opens the Path on the hub (`ECONOMY.md` §4). */
const FEATURE = 'missions' as const;

export interface MissionsState extends PathView {
  unlocked: boolean;
  unlockLevel: number;
  /** The piece Eldric's gift was struck as, when it has been taken. */
  gearChoice: string | null;
  /** True once the last chapter's chest is taken and there is nothing left to name. */
  giftTaken: boolean;
}

/** Everything the Chronicler's Path screen and the hub's dot read. */
export function missionsState(save: SaveGame, now: number): MissionsState {
  const view = pathView(content.missionChapters, save.missions, {
    save,
    now,
    lookups: GOAL_LOOKUPS,
  });
  const finale = content.missionChapters[content.missionChapters.length - 1];
  return {
    ...view,
    unlocked: isFeatureUnlocked(FEATURE, save.profile.level),
    unlockLevel: unlockLevel(FEATURE),
    gearChoice: save.missions.gearChoice,
    giftTaken: finale ? save.missions.chests.includes(finale.index) : false,
  };
}

/** Quests and chests the Path owes — the dot on the hub's Missions button. */
export function missionsClaimable(save: SaveGame, now: number): number {
  const state = missionsState(save, now);
  if (!state.unlocked) return 0;
  return (state.active?.status === 'claimable' ? 1 : 0) + state.claimableChests.length;
}

export interface MissionClaim {
  mission: MissionDef;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** The mission that just opened, or null when that was the last page. */
  next: MissionDef | null;
  /** True when this claim finished the chapter, so its chest is now waiting. */
  chapterComplete: boolean;
}

/**
 * Claims the mission the Path is on. The id is required: a second press carries the id of a
 * mission that is no longer open, so it is refused rather than paying the next one by accident.
 */
export function applyMissionClaim(save: SaveGame, missionId: string, now: number): Result<MissionClaim> {
  const state = missionsState(save, now);
  if (!state.unlocked) return fail('locked', `The Path opens at level ${state.unlockLevel}`);
  const active = state.active;
  if (!active || active.mission.id !== missionId) {
    const known = content.missionById(missionId);
    if (!known) return fail('invalid_argument', `No mission ${missionId}`);
    if (save.missions.claimed.includes(missionId))
      return fail('invalid_argument', 'That mission is already claimed');
    return fail('invalid_argument', 'That mission is not the one the Path is on');
  }
  if (active.status !== 'claimable') return fail('invalid_argument', 'That mission is not finished');

  save.missions.claimed.push(active.mission.id);
  const currencies = [...active.mission.rewards];
  const changes = payCurrencies(save, currencies, now);
  bumpCounter(save, 'missions.claimed');

  // The next page opens on the counters as they stand now: its own goal measures from here.
  const after = missionsState(save, now);
  save.missions.baseline = baselineFor(save, after.active?.mission ?? null);
  return ok({
    mission: active.mission,
    currencies,
    changes,
    next: after.active?.mission ?? null,
    chapterComplete: after.chapters.some(
      (chapter) => chapter.chapter.index === active.mission.chapter && chapter.complete,
    ),
  });
}

/**
 * The counters a mission measures, snapshotted as it opens. Only the keys its own goal reads are
 * stored, so a save carries the smallest baseline that can answer it.
 */
function baselineFor(save: SaveGame, mission: MissionDef | null): Record<string, number> {
  if (!mission) return {};
  const baseline: Record<string, number> = {};
  for (const key of missionBaselineKeys(mission)) baseline[key] = counter(save, key);
  return baseline;
}

export interface ChapterChestClaim {
  chapter: number;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** Eldric, when this was the chest that hands him over. */
  champion: ChampionInstance | null;
  /** True when the chest owes a 6★ Legendary piece the chronicle still has to name. */
  gift: boolean;
}

/** Takes a finished chapter's chest. Once per chapter, and only once its twelve are claimed. */
export function applyChapterChestClaim(
  save: SaveGame,
  chapterIndex: number,
  now: number,
): Result<ChapterChestClaim> {
  const state = missionsState(save, now);
  if (!state.unlocked) return fail('locked', `The Path opens at level ${state.unlockLevel}`);
  const chapter = state.chapters.find((view) => view.chapter.index === chapterIndex);
  if (!chapter) return fail('invalid_argument', `No chapter ${chapterIndex}`);
  if (chapter.chestClaimed) return fail('invalid_argument', 'That chest is already taken');
  if (!chapter.complete) return fail('invalid_argument', 'The chapter is not finished');

  save.missions.chests.push(chapterIndex);
  bumpCounter(save, 'missions.chests');
  const chest: ChapterChestDef = chapter.chapter.chest;
  const currencies = [...chest.currencies];
  const changes = payCurrencies(save, currencies, now);
  const champion = chest.champion ? grantChampion(save, chest.champion, now) : null;
  return ok({
    chapter: chapterIndex,
    currencies,
    changes,
    champion,
    gift: chest.gearChoice !== undefined,
  });
}

/** Adds the champion a chest hands over, the way a summon would. */
function grantChampion(save: SaveGame, championId: ChampionId, now: number): ChampionInstance | null {
  const def = content.championById(championId);
  if (!def) return null;
  const serial = save.counters.instances + 1;
  const instance = createInstance(def, {
    instanceId: instanceIdFor(def.id, serial),
    now,
    source: 'mission',
  });
  save.roster[instance.instanceId] = cloneInstance(instance);
  save.counters.instances = serial;
  save.summon.unseen.push(instance.instanceId);
  return instance;
}

/**
 * Strikes Eldric's parting gift: a 6★ Legendary piece in the slot and set the chronicle names
 * (`QUESTS_MISSIONS.md` §4). Once — the piece's own id is kept, so a second press is refused even
 * if the first one's toast was missed.
 */
export function applyMissionGearChoice(
  save: SaveGame,
  input: { slot: GearSlot; setId: string; now: number; rng: Rng },
): Result<GearInstance> {
  const finale = content.missionChapters[content.missionChapters.length - 1];
  const gift = finale?.chest.gearChoice;
  if (!finale || !gift) return fail('content_invalid', 'The Path has no parting gift');
  if (save.missions.gearChoice !== null) return fail('invalid_argument', 'The gift is already struck');
  if (!save.missions.chests.includes(finale.index))
    return fail('invalid_argument', 'The last chapter’s chest has not been taken');
  if (!GEAR_SLOTS.includes(input.slot)) return fail('invalid_argument', `No slot ${input.slot}`);
  if (!content.gearSetById(input.setId)) return fail('invalid_argument', `No set ${input.setId}`);

  const serial = save.counters.gear + 1;
  const piece = generateGear(
    {
      serial,
      slot: input.slot,
      setId: input.setId,
      rarity: gift.rarity,
      stars: gift.stars,
      source: 'mission',
      now: input.now,
    },
    input.rng,
  );
  save.counters.gear = serial;
  save.inventory[piece.instanceId] = piece;
  save.missions.gearChoice = piece.instanceId;
  return ok(clonePiece(piece));
}

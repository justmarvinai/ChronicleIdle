/**
 * Roster reducers (docs/tech/ARCHITECTURE.md §3.1): pure functions over the save's roster and
 * instance counter. They never throw for rule violations; they return `Result`.
 */
import { fail, ok, type Result } from '@engine/errors';
import type { Rng } from '@engine/rng/rng';
import {
  type ChampionDef,
  type ChampionId,
  type ObtainSource,
  PARTY_SIZE_CAMPAIGN,
  STARTER_IDS,
  STARTING_COMPANION_IDS,
} from './imports';
import { createInstance, instanceIdFor, type ChampionInstance, type Roster } from './instance';
import { levelCap, maxStars } from './stats';

export interface RosterState {
  roster: Roster;
  counters: { instances: number };
}

export interface ChampionLookup {
  championById(id: ChampionId): ChampionDef | undefined;
}

export interface AddResult {
  state: RosterState;
  instance: ChampionInstance;
}

/** Adds one copy of `defId`; ids come from the running counter so they never collide. */
export function addChampion(
  state: RosterState,
  content: ChampionLookup,
  defId: ChampionId,
  source: ObtainSource,
  now: number,
): Result<AddResult> {
  const def = content.championById(defId);
  if (!def) return fail('content_invalid', `Unknown champion ${defId}`);
  const serial = state.counters.instances + 1;
  const instance = createInstance(def, { instanceId: instanceIdFor(defId, serial), now, source });
  return ok({
    state: {
      roster: { ...state.roster, [instance.instanceId]: instance },
      counters: { ...state.counters, instances: serial },
    },
    instance,
  });
}

/**
 * The chosen starter plus the tutorial companions (TUTORIAL.md 1.2 and 1.5), in that order. The
 * first stand's team is the starter and the companions ahead of the rest, as many as a campaign
 * party holds — Bran and Wenna fight, Gil waits — so the lesson's line matches the seats it shows.
 */
export function seedStartingRoster(
  state: RosterState,
  content: ChampionLookup,
  starter: ChampionId,
  now: number,
): Result<{ state: RosterState; starterInstanceId: string; firstTeam: string[] }> {
  if (!(STARTER_IDS as readonly string[]).includes(starter))
    return fail('invalid_argument', `${starter} is not a starter`);
  if (Object.keys(state.roster).length > 0) return fail('invalid_argument', 'roster already seeded');
  let current = state;
  const seeded: string[] = [];
  for (const id of [starter, ...STARTING_COMPANION_IDS]) {
    const added = addChampion(current, content, id, 'starter', now);
    if (!added.ok) return added;
    current = added.value.state;
    seeded.push(added.value.instance.instanceId);
  }
  return ok({
    state: current,
    starterInstanceId: seeded[0] ?? '',
    firstTeam: seeded.slice(0, PARTY_SIZE_CAMPAIGN),
  });
}

function updateInstance(
  state: RosterState,
  instanceId: string,
  patch: (instance: ChampionInstance) => ChampionInstance,
): Result<RosterState> {
  const instance = state.roster[instanceId];
  if (!instance) return fail('invalid_argument', `Unknown champion instance ${instanceId}`);
  return ok({ ...state, roster: { ...state.roster, [instanceId]: patch(instance) } });
}

/** Locked champions can never be consumed as food or rank-up material. */
export function setLocked(state: RosterState, instanceId: string, locked: boolean): Result<RosterState> {
  return updateInstance(state, instanceId, (i) => ({ ...i, locked }));
}

/** Favourites sort first and are protected like locked champions. */
export function setFavourite(
  state: RosterState,
  instanceId: string,
  favourite: boolean,
): Result<RosterState> {
  return updateInstance(state, instanceId, (i) => ({ ...i, favourite }));
}

/** Copies of a definition currently owned. */
export function countOwned(roster: Roster, defId: ChampionId): number {
  let n = 0;
  for (const instance of Object.values(roster)) if (instance.defId === defId) n++;
  return n;
}

/**
 * A seeded roster for perf tests and the debug panel: `count` copies with random stars (within
 * the rarity's range) and levels (within the tier's cap), favourites and locks sprinkled in.
 */
export function generateRoster(
  state: RosterState,
  content: ChampionLookup,
  ids: readonly ChampionId[],
  count: number,
  rng: Rng,
  now: number,
): Result<RosterState> {
  let current = state;
  for (let i = 0; i < count; i++) {
    const id = rng.pick(ids);
    const added = addChampion(current, content, id, 'summon', now - i * 60_000);
    if (!added.ok) return added;
    const def = content.championById(id);
    const instance = added.value.instance;
    const stars = rng.int(instance.stars, def ? maxStars(def.rarity) : instance.stars);
    const level = rng.int(1, levelCap(stars));
    current = {
      ...added.value.state,
      roster: {
        ...added.value.state.roster,
        [instance.instanceId]: {
          ...instance,
          stars,
          level,
          favourite: rng.chance(0.08),
          locked: rng.chance(0.12),
        },
      },
    };
  }
  return ok(current);
}

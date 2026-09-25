/**
 * The way there (docs/tech/UI_DESIGN.md §4): where a mission or a quest is played, and where a
 * currency comes from or goes, as something a press can reach.
 *
 * Content names places (`@content/places/types`); this knows how to get to each one — its screen or
 * its dialog, the name a button says it with, and what has to be open first. A goal from the shared
 * DSL maps to one of them here too, so a mission card and a quest row can both say "Go to the
 * Tavern" without either knowing where the Tavern is.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { FeatureId } from '@content/balance/unlocks';
import type { PlaceId } from '@content/places/types';
import type { Goal } from '@content/quests/types';
import { content } from '@content/registry';
import { isSettlementUnlocked } from '@engine/campaign/progress';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { SaveGame } from '@engine/schema/save';
import { t, translate, type I18nKey } from '@i18n/index';
import { progressOf } from '@state/campaign';
import { isPalaceUnlocked } from '@state/palace';
import { isTowerUnlocked } from '@state/tower';
import type { DialogRoute, Route } from '@state/ui-types';

/** Where a press lands: a screen, or a dialog over whichever screen is up. */
export type PlaceWay = { route: Route } | { dialog: DialogRoute };

interface PlaceDef {
  /** i18n keys: the place as a list names it, and as "Go to …" names it. */
  name: I18nKey;
  to: I18nKey;
  glyph: GlyphKey;
  /** What must be open before the way is offered; progress-gated places are asked separately. */
  feature: FeatureId | null;
  /** Null for the places that are only a "where from": the clock, a level, a reset. */
  way: PlaceWay | null;
}

/** Every place, with the glyph its door wears on the hub (`hotspots.ts`, the bottom bar). */
export const PLACES: Readonly<Record<PlaceId, PlaceDef>> = {
  campaign: {
    name: 'place.campaign.name',
    to: 'place.campaign.to',
    glyph: 'glyph.crossed_swords',
    feature: 'campaign',
    way: { route: { name: 'campaign' } },
  },
  champions: {
    name: 'place.champions.name',
    to: 'place.champions.to',
    glyph: 'glyph.cloaked_figure',
    feature: 'champions',
    way: { route: { name: 'champions' } },
  },
  tavern: {
    name: 'place.tavern.name',
    to: 'place.tavern.to',
    glyph: 'glyph.health_potion',
    feature: 'tavern_level',
    way: { route: { name: 'tavern' } },
  },
  armoury: {
    name: 'place.armoury.name',
    to: 'place.armoury.to',
    glyph: 'glyph.ribcage_armor',
    feature: 'gear',
    way: { route: { name: 'armoury' } },
  },
  forge: {
    name: 'place.forge.name',
    to: 'place.forge.to',
    glyph: 'glyph.hammer_hit',
    feature: 'forge',
    way: { route: { name: 'forge' } },
  },
  portal: {
    name: 'place.portal.name',
    to: 'place.portal.to',
    glyph: 'glyph.arcane_symbol',
    feature: 'summoning',
    way: { route: { name: 'portal' } },
  },
  gargoyle: {
    name: 'place.gargoyle.name',
    to: 'place.gargoyle.to',
    glyph: 'glyph.flaming_skull',
    feature: 'daily_boss',
    way: { route: { name: 'bosses', boss: 'boss.gargoyle' } },
  },
  titan: {
    name: 'place.titan.name',
    to: 'place.titan.to',
    glyph: 'glyph.cursed_eye',
    feature: 'weekly_boss',
    way: { route: { name: 'bosses', boss: 'boss.titan' } },
  },
  tower: {
    name: 'place.tower.name',
    to: 'place.tower.to',
    glyph: 'glyph.holy_totem',
    feature: null,
    way: { route: { name: 'tower' } },
  },
  dungeons: {
    name: 'place.dungeons.name',
    to: 'place.dungeons.to',
    glyph: 'glyph.skull_wreath',
    feature: 'dungeons',
    way: { route: { name: 'dungeons' } },
  },
  brewery: {
    name: 'place.brewery.name',
    to: 'place.brewery.to',
    glyph: 'glyph.magic_flame',
    feature: 'brewery',
    way: { route: { name: 'brewery' } },
  },
  palace: {
    name: 'place.palace.name',
    to: 'place.palace.to',
    glyph: 'glyph.eagle_staff',
    feature: null,
    way: { route: { name: 'palace' } },
  },
  market: {
    name: 'place.market.name',
    to: 'place.market.to',
    glyph: 'glyph.trophy_cup',
    feature: 'market',
    way: { route: { name: 'market' } },
  },
  quests: {
    name: 'place.quests.name',
    to: 'place.quests.to',
    glyph: 'glyph.burning_scroll',
    feature: 'quests_daily',
    way: { route: { name: 'quests' } },
  },
  missions: {
    name: 'place.missions.name',
    to: 'place.missions.to',
    glyph: 'glyph.spell_book',
    feature: 'missions',
    way: { route: { name: 'missions' } },
  },
  login: {
    name: 'place.login.name',
    to: 'place.login.to',
    glyph: 'glyph.shooting_stars',
    feature: 'login_calendar',
    way: { dialog: { name: 'login' } },
  },
  idle_chest: {
    name: 'place.idle_chest.name',
    to: 'place.idle_chest.to',
    glyph: 'glyph.hourglass',
    feature: 'idle_chest',
    way: { dialog: { name: 'idle-chest' } },
  },
  regeneration: {
    name: 'place.regeneration.name',
    to: 'place.regeneration.name',
    glyph: 'glyph.hourglass',
    feature: null,
    way: null,
  },
  level_up: {
    name: 'place.level_up.name',
    to: 'place.level_up.name',
    glyph: 'glyph.celestial_body',
    feature: null,
    way: null,
  },
  daily_reset: {
    name: 'place.daily_reset.name',
    to: 'place.daily_reset.name',
    glyph: 'glyph.hourglass',
    feature: null,
    way: null,
  },
  weekly_reset: {
    name: 'place.weekly_reset.name',
    to: 'place.weekly_reset.name',
    glyph: 'glyph.hourglass',
    feature: null,
    way: null,
  },
};

/** A place a press can reach, in words and with the way there. */
export interface Destination {
  /** The place it belongs to, for the glyph and for asking whether it is open. */
  place: PlaceId;
  /** "Sunspire Bazaar", "Tavern" — the place as a card or a list heads it. */
  name: string;
  /** "Sunspire Bazaar", "the Tavern" — what follows "Go to". */
  to: string;
  way: PlaceWay;
}

/** Whether a chronicle may walk into a place yet: its level for most, its progress for two. */
export function placeOpen(save: SaveGame, place: PlaceId): boolean {
  switch (place) {
    case 'tower':
      return isTowerUnlocked(save);
    case 'palace':
      return isPalaceUnlocked(save);
    default: {
      const feature = PLACES[place].feature;
      return feature === null || isFeatureUnlocked(feature, save.profile.level);
    }
  }
}

/** A place as a destination, or null for one with nowhere to go (the clock, a reset). */
export function placeDestination(place: PlaceId): Destination | null {
  const def = PLACES[place];
  return def.way ? { place, name: t(def.name), to: t(def.to), way: def.way } : null;
}

/**
 * Where a goal is played (`@content/quests/types`): the settlement a stand is in, the boss a key is
 * spent on, the Tavern tab a rank is taken at, the Forge bench a piece is struck at. Null for the
 * goals that are nowhere — opening the game, the Path's own last page.
 *
 * A stand in a settlement the chronicle has not reached yet sends it to the map instead: the
 * settlement's own screen would only show it a locked door.
 */
export function goalDestination(goal: Goal, save: SaveGame): Destination | null {
  switch (goal.type) {
    case 'login':
    case 'all_previous':
      return null;
    case 'any': {
      for (const one of goal.goals) {
        const found = goalDestination(one, save);
        if (found) return found;
      }
      return null;
    }
    case 'clear_stage':
    case 'settlement_stars': {
      const settlement = content.settlementByIndex(goal.settlement);
      if (!settlement || !isSettlementUnlocked(progressOf(save), goal.settlement, goal.difficulty))
        return placeDestination('campaign');
      const name = translate(settlement.name);
      return {
        place: 'campaign',
        name,
        to: name,
        way: { route: { name: 'settlement', settlement: goal.settlement } },
      };
    }
    case 'clear_stages':
    case 'win_battles':
    case 'win_manual':
    case 'spend_energy':
    case 'difficulty_stars':
    case 'player_level':
      return placeDestination('campaign');
    case 'level_champion_times':
    case 'champion_reach_level':
      return tavern('level');
    case 'rank_up_times':
    case 'champion_reach_stars':
      return tavern('rank');
    case 'skill_upgrades':
    case 'all_skills_maxed':
      return tavern('skills');
    case 'gear_levels':
    case 'gear_reach_level':
      return placeDestination('armoury');
    case 'equip_pieces':
    case 'equip_full_set':
    case 'team_power':
      return placeDestination('champions');
    case 'craft':
      return forge('craft');
    case 'dismantle':
      return forge('dismantle');
    case 'gear_refine_times':
      return forge('refine');
    case 'summon':
    case 'own_champions':
      return placeDestination('portal');
    case 'claim_idle':
      return placeDestination('idle_chest');
    case 'boss_fights':
    case 'boss_damage':
    case 'boss_percent': {
      const boss = content.bossById(goal.boss);
      if (!boss) return null;
      const place: PlaceId = boss.feature === 'weekly_boss' ? 'titan' : 'gargoyle';
      const tier = goal.tier;
      return {
        ...destination(place),
        way: {
          route: tier ? { name: 'bosses', boss: goal.boss, tier } : { name: 'bosses', boss: goal.boss },
        },
      };
    }
    case 'complete_daily_quests_days':
      return { ...destination('quests'), way: { route: { name: 'quests', period: 'daily' } } };
  }
}

/** A place's words, for a way into it that is more particular than its door (a tab, a tier). */
function destination(place: PlaceId): Omit<Destination, 'way'> {
  return { place, name: t(PLACES[place].name), to: t(PLACES[place].to) };
}

function tavern(tab: 'level' | 'rank' | 'skills'): Destination {
  return { ...destination('tavern'), way: { route: { name: 'tavern', tab } } };
}

function forge(tab: 'craft' | 'dismantle' | 'refine'): Destination {
  return { ...destination('forge'), way: { route: { name: 'forge', tab } } };
}

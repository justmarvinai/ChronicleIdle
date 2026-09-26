/**
 * Where each currency comes from and what it is for (docs/design/ECONOMY.md §2), as places a
 * press can reach (`@content/places/types`). The Wallet reads these to say it — and to offer the
 * way to each — so a row here is a promise: every source listed must really pay the currency, every
 * place that pays it must be listed, and every use must really spend it. `flows.test.ts` holds the
 * sources to that against every reward table in the game, both ways. The order is the order the
 * Wallet lists them in, the most generous source and the main use first.
 */
import type { PlaceId } from '@content/places/types';
import type { CurrencyId } from './types';

export interface CurrencyFlow {
  sources: readonly PlaceId[];
  uses: readonly PlaceId[];
}

export const CURRENCY_FLOWS: Readonly<Record<CurrencyId, CurrencyFlow>> = {
  // Stage drops, the bosses, the chest's hourly purse, the Tower and the Dungeons, both boards and
  // the Path; the Gem Market's bundles carry some, and dismantling refunds a share.
  gold: {
    sources: [
      'campaign',
      'gargoyle',
      'idle_chest',
      'tower',
      'dungeons',
      'quests',
      'missions',
      'titan',
      'level_up',
      'login',
      'market',
      'forge',
    ],
    uses: ['tavern', 'armoury', 'forge', 'portal', 'market'],
  },
  // First clears and star chests, the boards, the Path, the bosses, every fifth level.
  gems: {
    sources: ['campaign', 'quests', 'missions', 'gargoyle', 'titan', 'level_up', 'login', 'idle_chest'],
    uses: ['portal', 'market'],
  },
  energy: {
    sources: [
      'regeneration',
      'level_up',
      'campaign',
      'idle_chest',
      'tower',
      'missions',
      'quests',
      'login',
      'market',
    ],
    uses: ['campaign', 'dungeons'],
  },
  key_daily: { sources: ['daily_reset'], uses: ['gargoyle'] },
  key_weekly: { sources: ['weekly_reset'], uses: ['titan'] },
  // Nothing grants keys yet (USER_QUESTIONS.md Q49): the clock is the only source.
  key_eternal: { sources: ['regeneration'], uses: ['tower'] },
  // The Portal's own exchange trades gold for Faded Shards and gems for the two above them.
  shard_faded: {
    sources: [
      'campaign',
      'dungeons',
      'quests',
      'idle_chest',
      'gargoyle',
      'missions',
      'login',
      'market',
      'portal',
    ],
    uses: ['portal'],
  },
  shard_ancient: {
    sources: [
      'campaign',
      'missions',
      'quests',
      'level_up',
      'gargoyle',
      'titan',
      'tower',
      'dungeons',
      'idle_chest',
      'login',
      'market',
      'portal',
    ],
    uses: ['portal'],
  },
  shard_sacred: {
    sources: [
      'campaign',
      'missions',
      'titan',
      'gargoyle',
      'level_up',
      'tower',
      'quests',
      'login',
      'market',
      'portal',
    ],
    uses: ['portal'],
  },
  shard_primordial: { sources: ['campaign', 'titan', 'missions'], uses: ['portal'] },
  // A settlement's stages and the chest farming it pay its own element's brew.
  brew_justice: {
    sources: ['brewery', 'campaign', 'idle_chest', 'tower', 'gargoyle', 'quests', 'market'],
    uses: ['tavern'],
  },
  brew_valor: {
    sources: ['brewery', 'campaign', 'idle_chest', 'tower', 'gargoyle', 'market'],
    uses: ['tavern'],
  },
  brew_faith: { sources: ['brewery', 'campaign', 'idle_chest', 'tower', 'market'], uses: ['tavern'] },
  brew_eclipse: { sources: ['brewery', 'campaign', 'idle_chest', 'tower', 'market'], uses: ['tavern'] },
  brew_universal: {
    sources: ['campaign', 'quests', 'missions', 'gargoyle', 'titan', 'tower', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_rare: { sources: ['quests', 'missions', 'gargoyle', 'login', 'market'], uses: ['tavern'] },
  tome_epic: {
    sources: ['campaign', 'gargoyle', 'titan', 'missions', 'quests', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_legendary: {
    sources: ['campaign', 'gargoyle', 'titan', 'missions', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_mythic: { sources: ['titan', 'missions'], uses: ['tavern'] },
  mat_scrap_iron: {
    sources: ['campaign', 'forge', 'idle_chest', 'quests', 'missions', 'login', 'market'],
    uses: ['forge'],
  },
  mat_ember_alloy: {
    sources: ['campaign', 'forge', 'gargoyle', 'idle_chest', 'missions', 'quests', 'login', 'market'],
    uses: ['forge'],
  },
  mat_starsteel: {
    sources: ['campaign', 'forge', 'titan', 'gargoyle', 'idle_chest', 'missions', 'login', 'market'],
    uses: ['forge'],
  },
  mat_arcane_dust: { sources: ['campaign', 'forge', 'quests', 'login', 'market'], uses: ['forge'] },
  mat_refining_core: {
    sources: ['campaign', 'forge', 'gargoyle', 'titan', 'missions', 'quests', 'login', 'market'],
    uses: ['forge'],
  },
  mat_glyph_sigil: {
    sources: ['campaign', 'gargoyle', 'titan', 'missions', 'quests', 'login', 'market'],
    uses: ['forge'],
  },
};

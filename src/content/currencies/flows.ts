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
  // Stage drops, the bosses, the chest's hourly purse, the Tower, the Dungeons and the Unwritten's
  // Tithe, both boards and the Path; the Gem Market's bundles carry some, and dismantling refunds a
  // share. Digging the Mine
  // deeper is paid in gold before anything else.
  gold: {
    sources: [
      'campaign',
      'gargoyle',
      'idle_chest',
      'tower',
      'dungeons',
      'unwritten',
      'quests',
      'missions',
      'titan',
      'level_up',
      'login',
      'market',
      'forge',
    ],
    uses: ['tavern', 'armoury', 'forge', 'portal', 'market', 'mine'],
  },
  // First clears and star chests, the boards, the Path, the bosses, every fifth level — the Mine,
  // which digs a few every hour of the day (MINE.md), and each Omen's seal in the Unwritten, once.
  gems: {
    sources: [
      'campaign',
      'quests',
      'missions',
      'gargoyle',
      'titan',
      'level_up',
      'login',
      'mine',
      'unwritten',
      'idle_chest',
    ],
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
  // The clock, and the Wallet's own gem refill (Q49), which is a press there rather than a place.
  key_eternal: { sources: ['regeneration'], uses: ['tower'] },
  // The Portal's own exchange trades gold for Faded Shards and gems for the two above them.
  shard_faded: {
    sources: [
      'campaign',
      'dungeons',
      'quests',
      'idle_chest',
      'gargoyle',
      'titan',
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
      'unwritten',
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
      'unwritten',
      'quests',
      'login',
      'market',
      'portal',
    ],
    uses: ['portal'],
  },
  shard_primordial: { sources: ['campaign', 'titan', 'missions', 'unwritten'], uses: ['portal'] },
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
    sources: ['campaign', 'quests', 'missions', 'gargoyle', 'titan', 'tower', 'unwritten', 'login', 'market'],
    uses: ['tavern'],
  },
  // The Unwritten's Tithe pays tomes every week, Legendary ones from Omen 8 (UNWRITTEN.md §14.2).
  tome_rare: {
    sources: ['quests', 'missions', 'unwritten', 'gargoyle', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_epic: {
    sources: ['campaign', 'unwritten', 'gargoyle', 'titan', 'missions', 'quests', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_legendary: {
    sources: ['campaign', 'unwritten', 'gargoyle', 'titan', 'missions', 'login', 'market'],
    uses: ['tavern'],
  },
  tome_mythic: { sources: ['titan', 'missions'], uses: ['tavern'] },
  // The Forge's metals are what the Mine is dug with (MINE.md §4): the pile that had nowhere else to go.
  mat_scrap_iron: {
    sources: ['campaign', 'forge', 'idle_chest', 'quests', 'missions', 'login', 'market'],
    uses: ['forge', 'mine'],
  },
  mat_ember_alloy: {
    sources: ['campaign', 'forge', 'gargoyle', 'idle_chest', 'missions', 'quests', 'login', 'market'],
    uses: ['forge', 'mine'],
  },
  mat_starsteel: {
    sources: ['campaign', 'forge', 'titan', 'gargoyle', 'idle_chest', 'missions', 'login', 'market'],
    uses: ['forge', 'mine'],
  },
  mat_arcane_dust: { sources: ['campaign', 'forge', 'quests', 'login', 'market'], uses: ['forge', 'mine'] },
  mat_refining_core: {
    sources: ['campaign', 'forge', 'gargoyle', 'titan', 'unwritten', 'missions', 'quests', 'login', 'market'],
    uses: ['forge', 'mine'],
  },
  // The Mine's deeper levels are the one steady supply (MINE.md §2); everything else is a chest.
  mat_glyph_sigil: {
    sources: ['campaign', 'mine', 'gargoyle', 'titan', 'unwritten', 'missions', 'quests', 'login', 'market'],
    uses: ['forge'],
  },
};

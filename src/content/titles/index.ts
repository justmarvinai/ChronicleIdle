/**
 * The titles a chronicle can wear. Order is display order: the first ones are early, the last are
 * the long haul (docs/design/ECONOMY.md §4, `CAMPAIGN.md` §7).
 */
import type { TitleDef } from './types';

const title = (slug: string, condition: TitleDef['condition'], version = 1): TitleDef => ({
  id: `title.${slug}`,
  name: `title.${slug}.name`,
  description: `title.${slug}.description`,
  condition,
  version,
});

export const TITLES: readonly TitleDef[] = [
  title('chronicler', { kind: 'level', level: 1 }),
  title('wayfarer', { kind: 'settlement_boss', settlement: 1, difficulty: 'intro' }),
  title('road_warden', { kind: 'settlement_boss', settlement: 5, difficulty: 'intro' }),
  title('gatebreaker', { kind: 'difficulty_cleared', difficulty: 'intro' }),
  title('collector', { kind: 'champions_owned', count: 10 }),
  title('seasoned', { kind: 'level', level: 25 }),
  title('lorekeeper', { kind: 'difficulty_cleared', difficulty: 'normal' }),
  title('chronicle_keeper', { kind: 'level', level: 50 }),
  title('undimmed', { kind: 'difficulty_cleared', difficulty: 'hard' }),
  // CAMPAIGN.md §7: the Hard all-3★ milestone.
  title('warden_of_veyrath', { kind: 'difficulty_mastered', difficulty: 'hard' }),
  title('loremaster', { kind: 'level', level: 100 }),
];

export const TITLE_BY_ID: Readonly<Record<string, TitleDef>> = Object.fromEntries(
  TITLES.map((t) => [t.id, t]),
);

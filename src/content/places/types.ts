/**
 * The places a chronicle can be sent (docs/tech/UI_DESIGN.md §4, "the way there"): where a
 * currency comes from and where it goes, named by the content that knows it. How to *reach* a
 * place — its screen, the dialog it opens, the level or the progress that opens it — is the UI's
 * business (`@ui/places/places`), so content never names a route.
 *
 * The last four are places only in the sense of "where it comes from": the clock, a level, a reset.
 * They are listed so a currency can say so, and they have nowhere to go.
 */
export const PLACE_IDS = [
  'campaign',
  'champions',
  'tavern',
  'armoury',
  'forge',
  'portal',
  'gargoyle',
  'titan',
  'tower',
  'dungeons',
  'brewery',
  'palace',
  'market',
  'quests',
  'missions',
  'login',
  'idle_chest',
  'regeneration',
  'level_up',
  'daily_reset',
  'weekly_reset',
] as const;

export type PlaceId = (typeof PLACE_IDS)[number];

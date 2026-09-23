/** The Chronicle Index (docs/tech/UI_DESIGN.md §5.20): the catalogue of everything the game holds. */
export const indexScreen = {
  'index.title': 'The Chronicle Index',
  'index.blurb': 'Everything written down, whether or not you have met it.',
  'index.found': '{found} of {total} champions found',
  'index.tab.champions': 'Champions',
  'index.tab.bestiary': 'Bestiary',
  'index.tab.sets': 'Gear Sets',
  'index.tab.statuses': 'Statuses',
  'index.filter.any': 'Any',
  'index.filter.foundOnly': 'Found only',
  'index.empty': 'Nothing here answers to that.',

  'index.page.found': 'In the chronicle — {count} copy or more',
  'index.page.unfound': 'Not yet found.',
  'index.page.stats': 'Stats',
  'index.page.statsHint': 'At six stars and level 60, before gear.',

  'index.beast.boss': 'Boss',
  'index.beast.statsHint': 'What it brings to the first settlement; every stand after that scales it.',
  'index.archetype.raider': 'Raider',
  'index.archetype.marksman': 'Marksman',
  'index.archetype.brute': 'Brute',
  'index.archetype.warden': 'Warden',
  'index.archetype.hexer': 'Hexer',
  'index.archetype.mender': 'Mender',
  'index.archetype.boss': 'Boss',

  'index.set.pieces': '{pieces}-piece set',
  'index.set.homes': 'Favoured by: {homes}',
  'index.set.piecesOf': 'The six pieces of {set}',

  'index.status.buffs': 'Buffs',
  'index.status.debuffs': 'Debuffs',
  /** Stands in for the number an ability decides when the glossary has no cast to read. */
  'index.status.amount': 'X',
} as const;

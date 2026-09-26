/**
 * The three folios of an expedition (docs/design/UNWRITTEN.md §5, §6.1): the factions each one
 * remembers, the shape of its fights, its Warden and the page it is drawn on — each darker than
 * the last.
 */
import type { FolioDef } from './types';

export const FOLIOS: readonly FolioDef[] = [
  {
    id: 'folio.1',
    index: 1,
    name: 'unwritten.folio.1.name',
    factions: [
      'faction.thornwood_bandits',
      'faction.blighted_wildlife',
      'faction.greyhaven_corsairs',
      'faction.sand_cult',
    ],
    waves: [3, 3],
    escort: 2,
    warden: 'enemy.unwritten_ink_drowned_knight',
    wardenScale: 1,
    backdrop: 'bg.bg3',
    grade: 'rgba(38, 22, 58, 0.42)',
    surface: 'stone',
    version: 1,
  },
  {
    id: 'folio.2',
    index: 2,
    name: 'unwritten.folio.2.name',
    factions: [
      'faction.kingsroad_deserters',
      'faction.restless_dead',
      'faction.ashen_legion',
      'faction.frostvein_tribe',
    ],
    waves: [3, 4],
    escort: 2,
    warden: 'enemy.unwritten_hollow_cantor',
    wardenScale: 1.1,
    backdrop: 'bg.bg2',
    grade: 'rgba(12, 22, 52, 0.55)',
    surface: 'stone',
    version: 1,
  },
  {
    id: 'folio.3',
    index: 3,
    name: 'unwritten.folio.3.name',
    factions: [
      'faction.gladiator_shades',
      'faction.marsh_horrors',
      'faction.citadel_knights',
      'faction.eclipse_cult',
    ],
    waves: [4, 4],
    escort: 3,
    warden: 'enemy.unwritten_unwriter',
    wardenScale: 1.2,
    backdrop: 'bg.bg9',
    grade: 'rgba(28, 6, 40, 0.5)',
    surface: 'stone',
    version: 1,
  },
];

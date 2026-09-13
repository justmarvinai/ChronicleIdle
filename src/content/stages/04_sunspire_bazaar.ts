import faction from '@content/enemies/factions/04_sand_cult';
import { defineSettlement } from './dsl';

/** Settlement 4 — Sunspire Bazaar: a market city praying to the wrong light. */
export default defineSettlement({
  index: 4,
  slug: 'sunspire_bazaar',
  faction,
  backdrop: 'bg.bg4',
  grade: 'rgba(52, 34, 10, 0.42)',
  surface: 'stone',
  setPool: ['gear_set.executioner', 'gear_set.truesight'],
  stages: [
    { mix: ['raider', 'hexer'] },
    { mix: ['hexer', 'marksman', 'raider'] },
    { mix: ['raider', 'warden', 'hexer'] },
    { mix: ['brute', 'hexer', 'marksman'] },
    { mix: ['hexer', 'hexer', 'warden'] },
    { mix: ['mender', 'raider', 'hexer'] },
    { mix: ['warden', 'brute', 'hexer', 'marksman'] },
    { mix: ['hexer', 'mender', 'brute'] },
    { mix: ['hexer', 'warden', 'mender', 'marksman'] },
    { mix: ['hexer', 'brute', 'warden'], adds: ['hexer', 'mender'] },
  ],
});

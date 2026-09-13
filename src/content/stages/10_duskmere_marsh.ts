import faction from '@content/enemies/factions/10_marsh_horrors';
import { defineSettlement } from './dsl';

/** Settlement 10 — Duskmere Marsh: the water remembers every village it took. */
export default defineSettlement({
  index: 10,
  slug: 'duskmere_marsh',
  faction,
  backdrop: 'bg.bg3',
  grade: 'rgba(20, 34, 22, 0.5)',
  surface: 'water',
  setPool: ['gear_set.bulwark', 'gear_set.keen_eye'],
  stages: [
    { mix: ['raider', 'hexer'] },
    { mix: ['hexer', 'mender', 'raider'] },
    { mix: ['brute', 'hexer', 'marksman'] },
    { mix: ['mender', 'hexer', 'brute'] },
    { mix: ['hexer', 'hexer', 'mender'] },
    { mix: ['warden', 'mender', 'hexer'] },
    { mix: ['hexer', 'brute', 'mender', 'marksman'] },
    { mix: ['mender', 'warden', 'hexer'] },
    { mix: ['hexer', 'mender', 'mender', 'brute'] },
    { mix: ['hexer', 'mender', 'brute'], adds: ['mender', 'hexer'] },
  ],
});

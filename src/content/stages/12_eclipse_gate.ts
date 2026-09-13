import faction from '@content/enemies/factions/12_eclipse_cult';
import { defineSettlement } from './dsl';

/** Settlement 12 — The Eclipse Gate: the rift itself, and the herald who keeps it open. */
export default defineSettlement({
  index: 12,
  slug: 'eclipse_gate',
  faction,
  backdrop: 'bg.bg9',
  grade: 'rgba(26, 14, 40, 0.5)',
  surface: 'stone',
  setPool: ['gear_set.relentless', 'gear_set.lifedrinker'],
  stages: [
    { mix: ['raider', 'hexer'] },
    { mix: ['hexer', 'marksman', 'raider'] },
    { mix: ['brute', 'hexer', 'warden'] },
    { mix: ['hexer', 'mender', 'brute'] },
    { mix: ['warden', 'hexer', 'marksman'] },
    { mix: ['mender', 'brute', 'hexer'] },
    { mix: ['hexer', 'warden', 'brute', 'mender'] },
    { mix: ['marksman', 'hexer', 'mender'] },
    { mix: ['brute', 'warden', 'hexer', 'mender'] },
    { mix: ['hexer', 'warden', 'brute'], adds: ['warden', 'mender'] },
  ],
});

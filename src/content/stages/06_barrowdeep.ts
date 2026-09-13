import faction from '@content/enemies/factions/06_restless_dead';
import { defineSettlement } from './dsl';

/** Settlement 6 — Barrowdeep: the tomb under the hill, and its unquiet tenants. */
export default defineSettlement({
  index: 6,
  slug: 'barrowdeep',
  faction,
  backdrop: 'bg.bg3',
  grade: 'rgba(18, 20, 30, 0.5)',
  surface: 'stone',
  setPool: ['gear_set.retaliation', 'gear_set.ironhide'],
  stages: [
    { mix: ['raider', 'hexer'] },
    { mix: ['hexer', 'raider', 'brute'] },
    { mix: ['brute', 'hexer', 'marksman'] },
    { mix: ['mender', 'raider', 'hexer'] },
    { mix: ['hexer', 'mender', 'warden'] },
    { mix: ['brute', 'hexer', 'mender'] },
    { mix: ['mender', 'mender', 'hexer', 'brute'] },
    { mix: ['warden', 'hexer', 'marksman'] },
    { mix: ['hexer', 'mender', 'brute', 'warden'] },
    { mix: ['hexer', 'mender', 'brute'], adds: ['mender', 'hexer'] },
  ],
});

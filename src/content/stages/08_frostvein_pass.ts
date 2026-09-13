import faction from '@content/enemies/factions/08_frostvein_tribe';
import { defineSettlement } from './dsl';

/** Settlement 8 — Frostvein Pass: the only way over the mountains, and it is held. */
export default defineSettlement({
  index: 8,
  slug: 'frostvein_pass',
  faction,
  backdrop: 'bg.bg2',
  grade: 'rgba(16, 28, 44, 0.5)',
  surface: 'stone',
  setPool: ['gear_set.immortal', 'gear_set.swiftfoot'],
  stages: [
    { mix: ['raider', 'brute'] },
    { mix: ['brute', 'marksman', 'raider'] },
    { mix: ['raider', 'hexer', 'brute'] },
    { mix: ['brute', 'brute', 'warden'] },
    { mix: ['hexer', 'brute', 'mender'] },
    { mix: ['warden', 'brute', 'marksman'] },
    { mix: ['brute', 'mender', 'hexer', 'warden'] },
    { mix: ['marksman', 'brute', 'mender'] },
    { mix: ['brute', 'warden', 'hexer', 'mender'] },
    { mix: ['brute', 'warden', 'mender'], adds: ['brute', 'mender'] },
  ],
});

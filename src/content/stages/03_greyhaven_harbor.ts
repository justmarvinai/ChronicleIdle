import faction from '@content/enemies/factions/03_greyhaven_corsairs';
import { defineSettlement } from './dsl';

/** Settlement 3 — Greyhaven Harbor: the port pays its dues to the fleet now. */
export default defineSettlement({
  index: 3,
  slug: 'greyhaven_harbor',
  faction,
  backdrop: 'bg.bg8',
  grade: 'rgba(14, 26, 40, 0.45)',
  surface: 'wood',
  setPool: ['gear_set.keen_eye', 'gear_set.warding'],
  stages: [
    { mix: ['raider', 'marksman'] },
    { mix: ['marksman', 'raider', 'warden'] },
    { mix: ['raider', 'brute', 'marksman'] },
    { mix: ['warden', 'marksman', 'raider'] },
    { mix: ['hexer', 'marksman', 'brute'] },
    { mix: ['mender', 'raider', 'marksman'] },
    { mix: ['marksman', 'marksman', 'hexer', 'warden'] },
    { mix: ['brute', 'mender', 'marksman'] },
    { mix: ['hexer', 'warden', 'marksman', 'mender'] },
    { mix: ['marksman', 'warden', 'hexer'], adds: ['marksman', 'mender'] },
  ],
});

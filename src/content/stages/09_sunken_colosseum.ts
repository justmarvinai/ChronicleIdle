import faction from '@content/enemies/factions/09_gladiator_shades';
import { defineSettlement } from './dsl';

/** Settlement 9 — The Sunken Colosseum: the crowd drowned; the bouts did not stop. */
export default defineSettlement({
  index: 9,
  slug: 'sunken_colosseum',
  faction,
  backdrop: 'bg.bg1',
  grade: 'rgba(30, 26, 14, 0.46)',
  surface: 'water',
  setPool: ['gear_set.stunlock', 'gear_set.executioner'],
  stages: [
    { mix: ['raider', 'warden'] },
    { mix: ['raider', 'marksman', 'warden'] },
    { mix: ['warden', 'raider', 'brute'] },
    { mix: ['raider', 'raider', 'mender'] },
    { mix: ['brute', 'warden', 'hexer'] },
    { mix: ['marksman', 'raider', 'mender'] },
    { mix: ['warden', 'brute', 'raider', 'hexer'] },
    { mix: ['hexer', 'mender', 'raider'] },
    { mix: ['raider', 'warden', 'mender', 'brute'] },
    { mix: ['raider', 'warden', 'brute'], adds: ['warden', 'mender'] },
  ],
});

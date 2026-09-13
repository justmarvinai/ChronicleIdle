import faction from '@content/enemies/factions/07_ashen_legion';
import { defineSettlement } from './dsl';

/** Settlement 7 — Ashfall Plains: a battlefield that has been burning for a century. */
export default defineSettlement({
  index: 7,
  slug: 'ashfall_plains',
  faction,
  backdrop: 'bg.bg6',
  grade: 'rgba(48, 18, 10, 0.44)',
  surface: 'dirt',
  setPool: ['gear_set.warcry', 'gear_set.relentless'],
  stages: [
    { mix: ['raider', 'marksman'] },
    { mix: ['raider', 'raider', 'brute'] },
    { mix: ['brute', 'marksman', 'raider'] },
    { mix: ['raider', 'warden', 'marksman'] },
    { mix: ['hexer', 'raider', 'brute'] },
    { mix: ['mender', 'raider', 'raider'] },
    { mix: ['raider', 'brute', 'warden', 'mender'] },
    { mix: ['marksman', 'hexer', 'brute'] },
    { mix: ['raider', 'raider', 'mender', 'hexer'] },
    { mix: ['raider', 'brute', 'warden'], adds: ['raider', 'mender'] },
  ],
});

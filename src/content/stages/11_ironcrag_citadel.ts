import faction from '@content/enemies/factions/11_citadel_knights';
import { defineSettlement } from './dsl';

/** Settlement 11 — Ironcrag Citadel: the fortress that decided who deserves the gate. */
export default defineSettlement({
  index: 11,
  slug: 'ironcrag_citadel',
  faction,
  backdrop: 'bg.bg5',
  grade: 'rgba(22, 24, 34, 0.46)',
  surface: 'stone',
  setPool: ['gear_set.retaliation', 'gear_set.warding'],
  stages: [
    { mix: ['warden', 'raider'] },
    { mix: ['warden', 'marksman', 'raider'] },
    { mix: ['brute', 'warden', 'marksman'] },
    { mix: ['warden', 'warden', 'mender'] },
    { mix: ['hexer', 'warden', 'brute'] },
    { mix: ['mender', 'warden', 'marksman'] },
    { mix: ['warden', 'brute', 'hexer', 'mender'] },
    { mix: ['marksman', 'warden', 'mender'] },
    { mix: ['warden', 'warden', 'mender', 'hexer'] },
    { mix: ['warden', 'brute', 'mender'], adds: ['warden', 'mender'] },
  ],
});

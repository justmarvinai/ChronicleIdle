import faction from '@content/enemies/factions/02_blighted_wildlife';
import { defineSettlement } from './dsl';

/** Settlement 2 — Millbrook Fields: the harvest turned, and so did what eats it. */
export default defineSettlement({
  index: 2,
  slug: 'millbrook_fields',
  faction,
  backdrop: 'bg.bg7',
  grade: 'rgba(48, 30, 14, 0.5)',
  surface: 'dirt',
  setPool: ['gear_set.ironhide', 'gear_set.swiftfoot'],
  stages: [
    { mix: ['raider', 'marksman'] },
    { mix: ['raider', 'brute'] },
    { mix: ['marksman', 'raider', 'brute'] },
    { mix: ['brute', 'warden', 'raider'] },
    { mix: ['hexer', 'raider', 'marksman'] },
    { mix: ['mender', 'brute', 'raider'] },
    { mix: ['warden', 'hexer', 'marksman'] },
    { mix: ['mender', 'hexer', 'brute'] },
    { mix: ['brute', 'brute', 'mender', 'marksman'] },
    { mix: ['brute', 'warden', 'hexer'], adds: ['brute', 'mender'] },
  ],
});

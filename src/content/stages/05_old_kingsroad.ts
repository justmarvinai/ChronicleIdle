import faction from '@content/enemies/factions/05_kingsroad_deserters';
import { defineSettlement } from './dsl';

/** Settlement 5 — The Old Kingsroad: the army that was sent here never came home. */
export default defineSettlement({
  index: 5,
  slug: 'old_kingsroad',
  faction,
  backdrop: 'bg.bg2',
  grade: 'rgba(34, 26, 20, 0.46)',
  surface: 'dirt',
  setPool: ['gear_set.lifedrinker', 'gear_set.ember_guard'],
  stages: [
    { mix: ['raider', 'warden'] },
    { mix: ['warden', 'raider', 'marksman'] },
    { mix: ['raider', 'brute', 'warden'] },
    { mix: ['warden', 'warden', 'marksman'] },
    { mix: ['brute', 'warden', 'hexer'] },
    { mix: ['mender', 'warden', 'raider'] },
    { mix: ['warden', 'brute', 'mender', 'marksman'] },
    { mix: ['hexer', 'warden', 'brute'] },
    { mix: ['warden', 'mender', 'hexer', 'brute'] },
    { mix: ['warden', 'brute', 'mender'], adds: ['warden', 'warden'] },
  ],
});

import faction from '@content/enemies/factions/01_thornwood_bandits';
import { defineSettlement } from './dsl';

/** Settlement 1 — Thornwood Crossing: the road out of Emberhold, and the first toll on it. */
export default defineSettlement({
  index: 1,
  slug: 'thornwood_crossing',
  faction,
  backdrop: 'bg.bg7',
  grade: 'rgba(24, 30, 18, 0.42)',
  surface: 'dirt',
  setPool: ['gear_set.ember_guard', 'gear_set.warcry'],
  stages: [
    { mix: ['raider'] },
    { mix: ['raider', 'marksman'] },
    { mix: ['marksman', 'raider'] },
    { mix: ['raider', 'brute'] },
    { mix: ['brute', 'marksman', 'raider'] },
    { mix: ['warden', 'raider', 'marksman'] },
    { mix: ['hexer', 'raider', 'warden'] },
    { mix: ['mender', 'brute', 'marksman'] },
    { mix: ['hexer', 'mender', 'raider', 'brute'] },
    { mix: ['brute', 'warden', 'marksman'], adds: ['warden', 'mender'] },
  ],
});

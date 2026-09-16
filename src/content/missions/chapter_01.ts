/**
 * Chapter 1 — First Steps: the first hour of a chronicle, one unlock at a time.
 *
 * The table this file prints is `docs/design/QUESTS_MISSIONS.md` §4; the lines themselves live in
 * `src/i18n/en/missions.ts`, keyed by where each mission sits.
 */
import { chapter, mission } from './dsl';

export default chapter({
  index: 1,
  missions: [
    // 1.1 Clear Thornwood Crossing 1-1 (Intro)
    mission({ type: 'clear_stage', settlement: 1, stage: 1, difficulty: 'intro' }, [
      { currency: 'gold', amount: 2_000 },
      { currency: 'energy', amount: 100 },
    ]),
    // 1.2 Win a battle in Manual mode
    mission({ type: 'win_manual', count: 1 }, [
      { currency: 'gold', amount: 1_000 },
      { currency: 'energy', amount: 150 },
    ]),
    // 1.3 Level a champion to 5
    mission({ type: 'champion_reach_level', level: 5, count: 1 }, [
      { currency: 'brew_universal', amount: 2 },
    ]),
    // 1.4 Clear Thornwood Crossing 1-3
    mission({ type: 'clear_stage', settlement: 1, stage: 3, difficulty: 'intro' }, [
      { currency: 'gold', amount: 3_000 },
    ]),
    // 1.5 Equip 3 gear pieces on one champion
    mission({ type: 'equip_pieces', count: 3 }, [{ currency: 'mat_scrap_iron', amount: 20 }]),
    // 1.6 Upgrade a gear piece to +4
    mission({ type: 'gear_reach_level', level: 4, count: 1 }, [{ currency: 'gold', amount: 3_000 }]),
    // 1.7 Summon a champion with a Faded Shard
    mission({ type: 'summon', count: 1, shard: 'faded' }, [{ currency: 'shard_faded', amount: 1 }]),
    // 1.8 Clear Thornwood Crossing 1-6
    mission({ type: 'clear_stage', settlement: 1, stage: 6, difficulty: 'intro' }, [
      { currency: 'gems', amount: 10 },
    ]),
    // 1.9 Reach chronicle level 4
    mission({ type: 'player_level', level: 4 }, [{ currency: 'energy', amount: 200 }]),
    // 1.10 Claim the Idle Chest
    mission({ type: 'claim_idle', count: 1 }, [{ currency: 'gold', amount: 5_000 }]),
    // 1.11 Complete 5 daily quests in one day
    mission({ type: 'complete_daily_quests_days', count: 1, quests: 5 }, [{ currency: 'gems', amount: 20 }]),
    // 1.12 Defeat Redcap Halvar (1-10 Intro)
    mission({ type: 'clear_stage', settlement: 1, stage: 10, difficulty: 'intro' }, [
      { currency: 'shard_ancient', amount: 1 },
      { currency: 'gold', amount: 5_000 },
      { currency: 'energy', amount: 300 },
    ]),
  ],
  chest: { currencies: [{ currency: 'shard_ancient', amount: 1 }] },
});

# Daily & Weekly Quests, and The Chronicler's Path

Related: `ECONOMY.md`, `docs/tech/UI_DESIGN.md` §5.14–5.15.

Quests and missions share one **goal DSL** evaluated against lifetime stat counters and state
predicates, so adding a quest is a data change.

## 1. Goal DSL

Shipped in 0.0.12 (the quests' own types, `src/content/quests/types.ts`): `login`, `any`,
`clear_stages`, `win_battles`, `win_manual`, `spend_energy`, `level_champion_times`,
`rank_up_times`, `skill_upgrades`, `gear_levels`, `gear_reach_level`, `craft`, `dismantle`,
`summon`, `claim_idle`, `boss_fights`, `complete_daily_quests_days`. The rest of the union below is
the planned shape the missions need (Phase 13) and arrives with them — a new goal type is a new
evaluator with a test, and for a counter goal a name in `COUNTER_KEYS` (ADR-040).

```ts
type Goal =
  | { type: 'clear_stages'; count: number; difficulty?: Difficulty; settlement?: number; onAuto?: boolean }
  | { type: 'clear_stage'; settlement: number; stage: number; difficulty: Difficulty; stars?: 1|2|3 }
  | { type: 'settlement_stars'; settlement: number; difficulty: Difficulty; stars: number }
  | { type: 'win_manual'; count: number }
  | { type: 'spend_energy'; amount: number }
  | { type: 'level_champion_times'; count: number }            // level-ups performed
  | { type: 'champion_reach_level'; level: number; count: number }
  | { type: 'rank_up_times'; count: number } | { type: 'champion_reach_stars'; stars: number; count: number }
  | { type: 'skill_upgrades'; count: number }
  | { type: 'gear_levels'; count: number } | { type: 'gear_reach_level'; level: number; count: number }
  | { type: 'gear_refine_times'; count: number } | { type: 'equip_full_set'; pieces: 4|6 }
  | { type: 'craft'; count: number; tier?: 1|2|3 } | { type: 'dismantle'; count: number }
  | { type: 'summon'; count: number; shard?: ShardId }
  | { type: 'own_champions'; count: number; rarity?: Rarity; element?: Element }
  | { type: 'boss_fights'; boss: BossId; count: number; tier?: string }
  | { type: 'boss_damage'; boss: BossId; tier: string; amount: number }
  | { type: 'boss_chest'; boss: BossId; tier: string; pct: number }
  | { type: 'player_level'; level: number }
  | { type: 'claim_idle'; count: number }
  | { type: 'complete_daily_quests_days'; count: number } | { type: 'daily_points'; points: number }
  | { type: 'unlock_speed'; speed: 3|4 } | { type: 'team_power'; power: number };
```

Progress for `count`-style goals is the **delta** of a lifetime counter against the moment the
board or the mission became active — for a quest, the period's own start — so old progress never
auto-completes new content. A state predicate (`gear_reach_level`, `champion_reach_level`,
`player_level`, `equip_full_set`…) is read live off the save instead, because it asks what the
chronicle *is*: bringing one piece from +12 to +16 counts once, not twice. `any` finishes on the
closest of several ways and is how "craft **or** dismantle" is expressed.

Nothing listens to events: the counters are written by the reducers that own the play, and the
board is a function of them, the save and the clock (ADR-040). A goal can therefore only name a
counter the game actually keeps, and `pnpm content:validate` enforces exactly that.

## 2. Daily quests (reset 00:00 local)

Ten quests; each completes for points and a small reward; points unlock five chests.

| # | Quest | Goal | Points | Reward |
| --- | --- | --- | --- | --- |
| 1 | Log in | automatic | 10 | 1 Faded Shard |
| 2 | Claim the Idle Chest | `claim_idle 1` | 10 | 5,000 Gold |
| 3 | Clear 5 campaign stages | `clear_stages 5` | 10 | 2 Elemental Brews (random) |
| 4 | Spend 60 energy | `spend_energy 60` | 10 | 40 Energy |
| 5 | Level up champions 3 times | `level_champion_times 3` | 10 | 3,000 Gold |
| 6 | Upgrade gear 5 levels | `gear_levels 5` | 10 | 5 Arcane Dust |
| 7 | Fight the Daily Boss twice | `boss_fights gravemaw 2` | 10 | 1 Rare Tome |
| 8 | Summon a champion | `summon 1` | 10 | 2,000 Gold |
| 9 | Win a battle in Manual mode | `win_manual 1` | 10 | 1 Universal Brew |
| 10 | Craft or dismantle 1 gear piece | `craft 1` or `dismantle 1` (either) | 10 | 10 Scrap Iron |

Chests: 20 pts → 3,000 Gold; 40 → 10 Gems + 2 Brews; 60 → 1 Faded Shard + 5 Ember Alloy;
80 → 20 Gems; 100 → 30 Gems + 2 Rare Tomes, and **1 Ancient Shard instead on every third claim of
it** (counted per chest for the life of the chronicle, so it is the third full board rather than
the third day of play). Quests that reference locked features are hidden until unlocked (their
points come from a replacement quest "Win 3 battles" until then), so 100 points are always
reachable — at every level a feature opens at, which is a test.

The board is read against the chronicle's level *now*, so a feature unlocked at four in the
afternoon is worth a row the same day and the stand-in shrinks by its points. The day a board is
finished is still counted once for the weekly quest that counts days (Q42).

## 3. Weekly quests (reset Monday 00:00 local)

| # | Quest | Goal | Points | Reward |
| --- | --- | --- | --- | --- |
| 1 | Complete daily quests on 5 days | `complete_daily_quests_days 5` | 20 | 50 Gems |
| 2 | Clear 60 campaign stages | `clear_stages 60` | 15 | 5 Universal Brews |
| 3 | Use 10 Daily Boss keys | `boss_fights gravemaw 10` | 15 | 2 Epic Tomes |
| 4 | Use 3 Weekly Boss keys | `boss_fights nyxara 3` | 15 | 1 Glyph Sigil |
| 5 | Summon 10 champions | `summon 10` | 10 | 1 Ancient Shard |
| 6 | Rank up a champion | `rank_up_times 1` | 10 | 20,000 Gold |
| 7 | Bring a gear piece to +12 | `gear_reach_level 12 1` | 10 | 10 Refining Cores |
| 8 | Claim the Idle Chest 7 times | `claim_idle 7` | 5 | 100 Energy |

Chests: 25 → 20k Gold; 50 → 1 Ancient Shard; 75 → 60 Gems + 1 Epic Tome; 100 → 1 Sacred Shard.

## 4. The Chronicler's Path (mission line)

Eldric's guided mission chain: **10 chapters × 12 missions = 120 missions**, sequential within a
chapter, chapters sequential. Missions mix easy "do the thing you just unlocked" steps with harder
long-term goals, exactly like the reference "Progress Missions" screen. Each chapter ends with a
chapter chest; the final mission grants **Eldric the Chronicler** (Legendary) plus a 6★ Legendary
gear piece of choice and 500 Gems.

Abbreviations: G = Gold, Gm = Gems, Br = Brews, AS/SS/PS = Ancient/Sacred/Primordial Shard,
RT/ET/LT/MT = Rare/Epic/Legendary/Mythic Tome, RC = Refining Cores, GS = Glyph Sigil, E = Energy.

### Chapter 1 — First Steps
| # | Mission | Reward |
| --- | --- | --- |
| 1.1 | Clear Thornwood Crossing 1-1 (Intro) | 2,000 G, 100 E |
| 1.2 | Win a battle in Manual mode | 1,000 G, 150 E |
| 1.3 | Level a champion to 5 | 2 Br |
| 1.4 | Clear Thornwood Crossing 1-3 | 3,000 G |
| 1.5 | Equip 3 gear pieces on one champion | 20 Scrap Iron |
| 1.6 | Upgrade a gear piece to +4 | 3,000 G |
| 1.7 | Summon a champion with a Faded Shard | 1 Faded Shard |
| 1.8 | Clear Thornwood Crossing 1-6 | 10 Gm |
| 1.9 | Reach player level 4 | 200 E |
| 1.10 | Claim the Idle Chest | 5,000 G |
| 1.11 | Complete 5 daily quests in one day | 20 Gm |
| 1.12 | Defeat Redcap Halvar (1-10 Intro) | 1 AS, 5,000 G, 300 E |

### Chapter 2 — The Fields and the Harbor
| # | Mission | Reward |
| --- | --- | --- |
| 2.1 | Clear Millbrook Fields 2-5 | 4,000 G |
| 2.2 | Own 6 champions | 2 Br |
| 2.3 | Level a champion to 15 | 4 Br |
| 2.4 | Earn 20 stars in Thornwood Crossing (Intro) | 15 Gm |
| 2.5 | Rank up a champion to 3★ | 8,000 G |
| 2.6 | Defeat The Sow of Millbrook (2-10) | 1 AS |
| 2.7 | Craft a gear piece | 10 Ember Alloy |
| 2.8 | Fight the Daily Boss (Easy) once | 1 RT |
| 2.9 | Equip a full 2-piece set | 5,000 G |
| 2.10 | Clear Greyhaven Harbor 3-5 | 20 Gm |
| 2.11 | Reach player level 10 | 250 E |
| 2.12 | Defeat Captain Morwenna Tide (3-10) | 1 AS, 1 ET |

### Chapter 3 — Sand and Road
| # | Mission | Reward |
| --- | --- | --- |
| 3.1 | Clear Sunspire Bazaar 4-5 | 6,000 G |
| 3.2 | Deal 250,000 damage to Gravemaw (Easy) in a day | 20 Gm |
| 3.3 | Upgrade a gear piece to +8 | 5 RC |
| 3.4 | Upgrade a skill | 1 RT |
| 3.5 | Own an Epic champion | 4 Br |
| 3.6 | Defeat High Zealot Qorath (4-10) | 1 AS |
| 3.7 | Clear The Old Kingsroad 5-5 | 8,000 G |
| 3.8 | Earn 30 stars in Millbrook Fields (Intro) | 25 Gm |
| 3.9 | Level a champion to 25 | 5 Br |
| 3.10 | Summon with an Ancient Shard | 1 AS |
| 3.11 | Reach player level 15 | 300 E |
| 3.12 | Defeat Ser Dagan the Oathbreaker (5-10) | 1 SS |

### Chapter 4 — Into the Barrow
| # | Mission | Reward |
| --- | --- | --- |
| 4.1 | Clear Barrowdeep 6-5 | 10,000 G |
| 4.2 | Fight the Weekly Boss once | 1 GS |
| 4.3 | Rank up a champion to 4★ | 15,000 G |
| 4.4 | Equip a full 4-piece set | 10 RC |
| 4.5 | Craft a Tier II gear piece | 15 Ember Alloy |
| 4.6 | Defeat The Barrow Wight (6-10) | 1 AS |
| 4.7 | Clear Ashfall Plains 7-5 | 12,000 G |
| 4.8 | Deal 1,000,000 damage to Gravemaw (Normal) in a day | 40 Gm |
| 4.9 | Level a champion to 30 | 6 Br |
| 4.10 | Complete 5 daily quests on 5 different days | 40 Gm |
| 4.11 | Own 12 champions | 1 ET |
| 4.12 | Defeat Warbrand Ulgrim (7-10) | 1 SS, 20 Gm |

### Chapter 5 — The Cold and the Arena
| # | Mission | Reward |
| --- | --- | --- |
| 5.1 | Clear Frostvein Pass 8-5 | 15,000 G |
| 5.2 | Upgrade a gear piece to +12 | 10 RC |
| 5.3 | Own a Legendary champion | 2 ET |
| 5.4 | Defeat Matriarch Yrsa Frostmaw (8-10) | 1 AS |
| 5.5 | Earn 30 stars in Greyhaven Harbor (Intro) | 30 Gm |
| 5.6 | Clear The Sunken Colosseum 9-5 | 18,000 G |
| 5.7 | Reach 2 % on Nyxara (Normal) | 60 Gm |
| 5.8 | Rank up a champion to 5★ | 30,000 G |
| 5.9 | Level a champion to 40 | 8 Br |
| 5.10 | Upgrade 5 skills | 2 ET |
| 5.11 | Reach player level 25 | 400 E |
| 5.12 | Defeat The Undefeated (9-10) | 1 SS |

### Chapter 6 — Marsh, Citadel, Gate
| # | Mission | Reward |
| --- | --- | --- |
| 6.1 | Clear Duskmere Marsh 10-5 | 20,000 G |
| 6.2 | Craft 5 gear pieces | 20 Ember Alloy |
| 6.3 | Refine a gear piece | 10 RC |
| 6.4 | Defeat Old Grandmother Mire (10-10) | 1 AS |
| 6.5 | Deal 5,000,000 damage to Gravemaw (Hard) in a day | 80 Gm |
| 6.6 | Clear Ironcrag Citadel 11-5 | 25,000 G |
| 6.7 | Bring a champion to 6★ | 100,000 G |
| 6.8 | Defeat Castellan Vaughn (11-10) | 1 SS |
| 6.9 | Own 3 Epic champions | 2 ET |
| 6.10 | Clear The Eclipse Gate 12-5 | 30,000 G |
| 6.11 | Reach player level 30 | 500 E |
| 6.12 | Defeat The Gatekeeper (12-10 Intro) — unlocks Normal | 1 PS, 100 Gm |

### Chapter 7 — Normal
| # | Mission | Reward |
| --- | --- | --- |
| 7.1 | Clear Thornwood Crossing 1-10 (Normal) | 30,000 G |
| 7.2 | Earn all 30 stars in Thornwood Crossing (Intro) | 50 Gm |
| 7.3 | Level a champion to 50 | 10 Br |
| 7.4 | Equip 6 gear pieces of 4★ or higher on one champion | 15 RC |
| 7.5 | Clear Sunspire Bazaar 4-10 (Normal) | 1 AS |
| 7.6 | Reach 12 % on Nyxara (Normal) | 100 Gm |
| 7.7 | Craft a Tier III gear piece | 10 Starsteel |
| 7.8 | Clear Barrowdeep 6-10 (Normal) | 1 SS |
| 7.9 | Upgrade a gear piece to +16 | 20 RC |
| 7.10 | Own 2 Legendary champions | 1 LT |
| 7.11 | Clear Ashfall Plains 7-10 (Normal) | 1 AS |
| 7.12 | Reach player level 40 | 100 Gm |

### Chapter 8 — The Long March
| # | Mission | Reward |
| --- | --- | --- |
| 8.1 | Clear Frostvein Pass 8-10 (Normal) | 40,000 G |
| 8.2 | Deal 20,000,000 damage to Gravemaw (Brutal) in a day | 150 Gm |
| 8.3 | Level a champion to 60 | 15 Br |
| 8.4 | Clear The Sunken Colosseum 9-10 (Normal) | 1 SS |
| 8.5 | Reach 25 % on Nyxara (Hard) | 1 GS, 100 Gm |
| 8.6 | Clear Duskmere Marsh 10-10 (Normal) | 1 AS |
| 8.7 | Own 20 champions | 2 LT |
| 8.8 | Clear Ironcrag Citadel 11-10 (Normal) | 1 SS |
| 8.9 | Have 3 champions at 6★ | 150,000 G |
| 8.10 | Earn 200 stars in Normal | 200 Gm |
| 8.11 | Reach player level 50 | 600 E |
| 8.12 | Defeat The Gatekeeper (12-10 Normal) — unlocks Hard and ×3 speed | 1 PS, 200 Gm |

### Chapter 9 — Hard
| # | Mission | Reward |
| --- | --- | --- |
| 9.1 | Clear Thornwood Crossing 1-10 (Hard) | 60,000 G |
| 9.2 | Earn all 360 stars in Intro | 1 SS |
| 9.3 | Clear Sunspire Bazaar 4-10 (Hard) | 1 SS |
| 9.4 | Reach 50 % on Nyxara (Hard) | 250 Gm |
| 9.5 | Have 6 gear pieces at +16 on one champion | 30 RC |
| 9.6 | Clear Ashfall Plains 7-10 (Hard) | 1 LT |
| 9.7 | Own 4 Legendary champions | 1 LT |
| 9.8 | Defeat Gravemaw (Brutal, 100 %) | 300 Gm |
| 9.9 | Clear Duskmere Marsh 10-10 (Hard) | 1 SS |
| 9.10 | Earn all 360 stars in Normal | 1 PS |
| 9.11 | Reach player level 60 | 800 E |
| 9.12 | Defeat The Gatekeeper (12-10 Hard) — unlocks ×4 speed | 1 PS, 400 Gm |

### Chapter 10 — The Last Page
| # | Mission | Reward |
| --- | --- | --- |
| 10.1 | Have 5 champions at 6★ level 60 | 200,000 G |
| 10.2 | Reach 12 % on Nyxara (Nightmare) | 300 Gm |
| 10.3 | Own a Mythic champion | 1 MT |
| 10.4 | Earn 200 stars in Hard | 1 SS |
| 10.5 | Fully upgrade all skills of a Legendary champion | 1 LT |
| 10.6 | Craft 20 Tier III gear pieces | 30 Starsteel |
| 10.7 | Reach 25 % on Nyxara (Nightmare) | 1 PS |
| 10.8 | Team power 150,000 | 400 Gm |
| 10.9 | Earn all 360 stars in Hard | 1 PS |
| 10.10 | Reach player level 75 | 1,000 E |
| 10.11 | Defeat Nyxara (Nightmare, 100 %) | 1 MT, 500 Gm |
| 10.12 | Complete every previous mission | **Eldric the Chronicler**, 6★ Legendary gear (choice), 500 Gm |

Chapter chests (on finishing a chapter): 1 → 1 AS; 2 → 1 AS + 50 Gm; 3 → 1 SS; 4 → 1 SS + 100 Gm;
5 → 1 SS + 1 GS; 6 → 1 PS; 7 → 1 PS + 200 Gm; 8 → 2 SS + 1 LT; 9 → 1 PS + 1 LT; 10 → (final reward).

## 5. Screens

- **Quests** (clones the "Missions/Quests" RSL layout): tabs Daily / Weekly; list of quest rows
  with progress bar, points and reward; top points track with five chest nodes; "Claim" per quest
  and per chest with reward burst; reset timer.
- **The Chronicler's Path** (clones `progress_missions_screen.png`): chapter tabs across the top;
  a horizontal carousel of mission cards (icon, title, description, progress bar, lock state,
  reward); bottom chapter-progress track with chest nodes; Eldric's portrait with a line of
  dialogue that changes per chapter.

## 6. Content shape

```ts
defineQuestSet({ id: 'quests.daily', period: 'daily', quests: [{ id: 'dq.login', goal: { type: 'login' }, points: 10, reward: [...] }, ...], chests: [{ points: 20, reward: [...] }, ...] });
defineMissionChapter({ id: 'missions.ch01', title: 'First Steps', missions: [{ id: 'm.1.1', goal: { type: 'clear_stage', settlement: 1, stage: 1, difficulty: 'intro' }, reward: [{ currency: 'gold', amount: 2000 }] }, ...], chest: [...] });
```

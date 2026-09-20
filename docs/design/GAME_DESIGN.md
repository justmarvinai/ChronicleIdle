# ChronicleIdle — Game Design Bible (EA-0.1)

Status: planning baseline. Every number here is a **default** that lives in `src/content/balance/*`
and may be tuned; the structure is the contract.

Related: `CHAMPIONS.md`, `BATTLE.md`, `CAMPAIGN.md`, `GEAR.md`, `ECONOMY.md`, `SUMMONING.md`,
`BOSSES.md`, `QUESTS_MISSIONS.md`, `TUTORIAL.md`.

---

## 1. Vision

You are a **Chronicler** in the broken world of **Veyrath**. From your settlement, **Emberhold**,
you bind champions out of the shattered pages of the world's history (summoning), forge their
arms, and march them through the twelve settlements the Eclipse has swallowed. The game is a
turn-based, speed-driven tactical RPG wrapped in an idle/incremental progression shell:
short sessions of decisions, long tails of accumulation.

### Pillars

1. **Collect and grow.** Champions are the heart. Every champion has an identity (rarity, element,
   role, kit, art) and a growth path (level → rank → skills → gear). Even food has a purpose.
2. **Real battles.** Speed-based turn meter, buffs/debuffs, cooldowns, elements, manual or auto.
   Battles are animated, readable and skippable at ×1–×4 speed.
3. **Always something to do.** Daily and weekly cadence (quests, bosses, idle chest), a long
   mission line, three campaign difficulties, farmable stages, crafting.
4. **Respect the player.** No accounts, no payments, no PvP. Energy and keys pace the day; nothing
   is gated behind money or other players.
5. **Feels like a game.** Fixed game viewport, textured chrome, ambient motion, sound, cut-ins.

### Session shape (target)

- **First session (30–40 min):** tutorial, choose starter, first 8–10 stages, first summon, first
  gear, first level-ups, see the idle chest and the mission line. Energy is deliberately abundant:
  the tutorial, early missions and first clears hand out roughly 3,000 energy over the first days
  so the opening weeks feel generous (`ECONOMY.md` §5.1).
- **Daily session (15–25 min):** claim idle chest, daily boss ×2 keys, daily quests, spend energy
  farming a target stage/set on auto-repeat, tavern upgrades, summon if shards.
- **Weekly:** weekly boss ×3 keys, weekly quests, featured banner rotation, push a new
  difficulty/settlement.
- **Monthly (once Intro is behind you):** climb the Eternal Tower for as long as the keys hold, then
  come back when the season turns and climb it again (`ETERNAL_TOWER.md`).
- **Long-term (weeks/months):** complete Hard, 6★ the roster, perfect gear, finish the Chronicler's
  Path, unlock ×4 speed, stand higher in the tower than last season.

## 2. Core loop

```
            ┌──────────────── Summon (shards) ───────────────┐
            │                                                 ▼
  Idle chest / quests / bosses / campaign drops ──▶ Currencies & materials ──▶ Tavern (level/rank/skills)
            ▲                                                 │                 Forge & Gear (equip/upgrade)
            │                                                 ▼
            └──────────── Stronger team ◀────── Beat harder content (campaign, bosses, tower) ──▶ Player XP → unlocks
```

Stall points are deliberate: a difficulty wall in the campaign pushes the player into bosses,
crafting and summoning, which feed back into the campaign. When the campaign itself runs out of
first clears, the Eternal Tower is the next number to raise, and it raises itself every thirty days.

## 3. Systems overview

| System | One-line summary | Doc |
| --- | --- | --- |
| Champions | 6 rarities, base/max stars, 4 elements, 4 roles, 8 stats, 1–4 abilities + passive (+ aura) | `CHAMPIONS.md` |
| Battle | Turn-meter combat, 3 v up to 4 in campaign and 4 v boss + adds, waves, status effects, manual/auto, ×1–×4 speed | `BATTLE.md` |
| Campaign | 12 settlements × 10 stages × Intro/Normal/Hard, farmable, 3-star ratings, drops | `CAMPAIGN.md` |
| Gear | 6 slots, 6 rarities, 1–6 stars, +0…+16, main/sub stats, 14 sets, refine, craft, dismantle | `GEAR.md` |
| Economy | 25 wallet currencies, energy, player level 1–100, idle chest, sources/sinks | `ECONOMY.md` |
| Summoning | 4 shard types, standard portal + featured banner, pity, deterministic rotation | `SUMMONING.md` |
| Bosses | Daily boss (4 tiers, 2 keys/day) and weekly boss (3 tiers, 3 keys/week), damage-threshold rewards | `BOSSES.md` |
| Eternal Tower | 100 floors climbed in order, every 10th a boss floor, keys on a 15-minute clock, a 30-day season | `ETERNAL_TOWER.md` |
| Quests | Daily (10) and weekly (8) quests → points → chests | `QUESTS_MISSIONS.md` |
| Missions | The Chronicler's Path: 10 chapters × 12 missions, final reward a Legendary champion | `QUESTS_MISSIONS.md` |
| Tutorial | Interactive scripted onboarding with Eldric Lorekeeper | `TUTORIAL.md` |
| Player level | XP from battles; unlocks features and raises energy cap | `ECONOMY.md` §4 |

## 4. World and naming canon

| Thing | Canon |
| --- | --- |
| World | Veyrath |
| Player home / hub | Emberhold |
| Guide NPC | Eldric Lorekeeper (uses `ui/misc_avatars/tutorial_npc_avatar.jpg`); also the final mission-line reward champion |
| Antagonist force | The Eclipse (a spreading un-light; its cult, its gate) |
| Elements | Justice (gold), Valor (crimson), Faith (azure), Eclipse (violet) |
| Element cycle | Justice → beats → Valor → beats → Faith → beats → Justice; Eclipse neutral both ways |
| Roles | Attack, Defense, Health, Support |
| Rarities | Common, Uncommon, Rare, Epic, Legendary, Mythic |
| Summon items | Faded Shard, Ancient Shard, Sacred Shard, Primordial Shard |
| Currencies | Gold, Gems (see `ECONOMY.md` for all 24) |
| Daily boss | Gravemaw, the Bone Tyrant |
| Weekly boss | Nyxara, Mother of Shadows |
| Mission line | The Chronicler's Path |
| Campaign settlements | Thornwood Crossing, Millbrook Fields, Greyhaven Harbor, Sunspire Bazaar, The Old Kingsroad, Barrowdeep, Ashfall Plains, Frostvein Pass, The Sunken Colosseum, Duskmere Marsh, Ironcrag Citadel, The Eclipse Gate |
| Difficulties | Intro, Normal, Hard |
| Version target | Early Access 0.1 = `0.1.0` |

## 5. Rarity philosophy (from the brief)

| Rarity | Base → max stars | Abilities | Purpose |
| --- | --- | --- | --- |
| Common | 1 → 2 | 1 | Food. Rank-up fodder and XP. Always summonable from Faded Shards. |
| Uncommon | 2 → 4 | 2 | Food, occasionally a stop-gap in the first hours. |
| Rare | 3 → 6 | 2 + passive | Mostly food; a few are situational specialists (starters live here). |
| Epic | 4 → 6 | 3 + passive | Always situational, rarely food. The backbone of mid-game teams. |
| Legendary | 5 → 6 | 4 + passive + aura | Good champions with a clear job; team-defining. |
| Mythic | 6 → 6 | 4 + passive + aura | All-rounders. One exists in EA-0.1. |

EA-0.1 roster: 3 Common, 3 Uncommon, 3 Rare, **7 Epic** (all seven finished models —
confirmed by the owner, Q1), 6 Legendary (one obtainable only from the mission
line), 1 Mythic. Total **23**.

## 6. Progression map (what unlocks when)

The Path is the exception to the ladder: it opens with the chronicle rather than at a level, because
it is what tells a new Chronicler what this world holds and in what order to reach for it — the
Arbiter's role in the games this one is in the family of. The tutorial teaches it second, straight
after the first stand.

| Player level | Unlock |
| --- | --- |
| 1 | Campaign (Intro), Champions, **The Chronicler's Path (missions)**, **Gear (equip/upgrade)**, battle speeds ×1/×2 |
| 2 | Tavern (level up) |
| 4 | Summoning Portal |
| 5 | Daily Quests, Idle Chest |
| 7 | Tavern: Rank up |
| 8 | Forge (crafting, dismantle) |
| 9 | Tavern: Skill upgrades |
| 10 | Daily Boss |
| 12 | Weekly Quests |
| 15 | Weekly Boss |
| 18 | Gear refine (star-up) |
| 20 | Auto-repeat ×25 (×10 from level 5) |
| 30 | Auto-repeat ×50 |
| — | **The Eternal Tower**: all 120 Intro stages cleared |
| — | Normal difficulty: all 120 Intro stages cleared |
| — | Hard difficulty: all 120 Normal stages cleared |
| — | ×3 speed: Normal complete; ×4 speed: Hard complete |

Idle-chest capacity bands are level driven (`ECONOMY.md` §5).

Gear opens with the chronicle rather than at level 3 (the owner's third batch): the first stands
drop a piece, and a chronicle that may not wear what it has just found is holding a reward it
cannot use.

Three unlocks are gated on **progress** rather than on a level, and they are the ones that mark the
end of a stretch of the game: Normal, Hard, and the Eternal Tower. A player who has cleared Intro
has run out of first clears; the tower is what is waiting for them (`ETERNAL_TOWER.md` §1).

## 7. Glossary

| Term | Meaning |
| --- | --- |
| Champion instance | A concrete owned copy of a champion definition (level, stars, skills, gear) |
| Rank / Stars | 1–6; rank-up consumes same-star champions ("food") |
| Turn meter (TM) | 0–100 % bar filled by SPD each tick; at 100 % the unit acts |
| Wave | A group of enemies in a stage; stages have 1–3 waves |
| Ability slot A1–A4 | A1 is the basic attack (no cooldown); A2–A4 have cooldowns |
| Passive | Always-on or triggered ability without a slot |
| Aura | Team-wide bonus if the champion is the leader (Legendary/Mythic only) |
| Buff / Debuff | Timed status effect; positive/negative; see `BATTLE.md` §5 |
| Keys | Daily/weekly boss entries; the Eternal Key is the tower's own (1 a floor, 10 held) |
| Shard | Summon token; four kinds |
| Brew | Champion XP consumable, one per element + universal |
| Tome | Skill-upgrade consumable, one per rarity Rare+ |
| Refine | Gear star-up |
| Idle chest | Offline/online accumulating reward chest |
| Chronicler's Path | Long mission line with escalating rewards |
| Chronicler's Provisions | Energy bundles granted by the tutorial chapters (500 + 4 × 250) |
| Floor | One fight in the Eternal Tower; every tenth is a boss floor |
| Season | The tower's thirty-day period; the climb resets, the best floor does not |

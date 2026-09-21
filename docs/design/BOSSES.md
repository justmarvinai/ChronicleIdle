# BOSSES.md — the Gargoyle and the Titan

Related: `BATTLE.md`, `ECONOMY.md`, `docs/tech/UI_DESIGN.md` §5.13.

Both bosses are damage races in the style of Raid's Demon Lord / Hydra, single player: the boss has
a colossal HP pool per tier, the player has a few keys per period, **damage accumulates across the
period**, and reward chests unlock at damage thresholds. There is no leaderboard; the "rank" panel
of the reference screen becomes a **personal records** panel (best damage per tier, best team).

### The two of them, and how they are reached

Two period bosses, each with a name and neither called after its clock (0.7.1):

| Boss | Opens | Keys | Gate | Its file |
| --- | --- | --- | --- | --- |
| **Gargoyle**, the Waking Stone | every day | 2 | chronicle level 10 | `content/bosses/gargoyle.ts` |
| **Titan**, the Sunless | every week | 3 | chronicle level 15 | `content/bosses/titan.ts` |

They are reached through **Battle → Bosses**, one card each in a menu of their own
(`docs/tech/UI_DESIGN.md` §5.13), rather than through a card apiece on Game Modes: two gates on
different clocks do not fit one card, and the menu is where each says its name, its cadence and the
keys it is holding.

The cadence is still what it was — the Gargoyle's pool and keys reset daily, the Titan's weekly —
but the words *daily boss* and *weekly boss* appear nowhere a player can read. A save calls them
`boss.gargoyle` and `boss.titan`; the chronicles that knew them by their old names are moved by the
save v17 migration, which carries the period's damage, the chests taken, every personal best, the
Palace's record of what each has paid, and the counters a quest measures.

## 1. Shared rules

- Battle uses the full battle system with the boss encounter's own turn limit; the fight ends when
  the team dies, the boss dies (100 % chest) or the turn limit is hit. Damage dealt is added to the
  period total for that tier regardless.
- Each key is one fight on a chosen tier. Keys reset at the period boundary and do not accumulate
  beyond the cap.
- Boss stats are fixed per tier (no campaign scaling). Bosses have high RES and ACC, immunity to
  Stun/Freeze/Sleep/Provoke/Fear (shown as "Unshakeable"), and take DoTs at full value —
  Poison/Bleed/Burn builds are the classic answer, as are DEF Down and Weaken.
- Both bosses **enrage**: after `enrageTurn` of its *own* turns, boss ATK grows +10 % every
  `enrageEvery` own turns, so a long race turns lethal instead of stalling. A boss takes roughly
  half the ally-turn limit in own turns (measured with `tools/sim`), so the first step has to land
  well inside that — the content validator rejects a threshold that never fires.
- Reward chests are claimed per tier once per period; unclaimed chests auto-claim at reset to the
  mailbox-free "Rewards" panel on next login.
- Records: best damage per tier and the team used; personal best banner in the UI.

## 2. The daily gate — Gargoyle, the Waking Stone

Unlocks at player level 10. Two keys per day. Backdrop: `bg3` (the dungeon gate) with bone-dust
particles; boss model: placeholder lizard ×2.0 scale, bone-white tint until a model exists.

Enrage: from its 12th own turn, +10 % ATK every 2 own turns (`enrageEvery: 2`).

| Tier | HP | ATK | DEF | SPD | RES | ACC | Turn limit | Enrage turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Easy | 250,000 | 900 | 700 | 100 | 60 | 60 | 50 | 12 |
| Normal | 2,000,000 | 1,600 | 1,100 | 105 | 90 | 90 | 50 | 12 |
| Hard | 12,000,000 | 2,600 | 1,500 | 110 | 120 | 120 | 50 | 12 |
| Brutal | 60,000,000 | 4,000 | 2,100 | 115 | 160 | 160 | 50 | 12 |

Kit (rotation `A1, A1, A2, A1, A3` then repeat; A3 starts on cooldown 4):
- A1 *Granite Fist* — `4.0 × ATK` single (highest-ATK ally), 50 % DEF Down 30 % (2).
- A2 *Stonequake* — `2.2 × ATK` all allies, 40 % Stun (1) — only lands on one target max.
- A3 *Devour* — `6.0 × ATK` single; heals Gargoyle 3 % of max HP per debuff on the target; places
  Heal Reduction 100 % (2).
- Passive *Weathered Stone* — takes 20 % less damage from crits; loses this after receiving 5
  distinct debuffs (once per fight; "Hide broken" callout).

Reward chests (per tier per day; thresholds as % of tier HP): 5 / 15 / 30 / 60 / 100 %.

| Tier | Chest 5 % | Chest 15 % | Chest 30 % | Chest 60 % | Chest 100 % |
| --- | --- | --- | --- | --- | --- |
| Easy | 5k Gold, 2 Justice/Valor Brews | 10k Gold, 1 Rare Tome | 20k Gold, 5 Ember Alloy | 30 Gems, 1 Faded Shard | 1 Ancient Shard, Rare gear 3★ |
| Normal | 15k Gold, 3 Brews | 25k Gold, 2 Rare Tomes | 40k Gold, 10 Ember Alloy, 3 Refining Cores | 60 Gems, 1 Epic Tome | 1 Ancient Shard, Epic gear 4★ |
| Hard | 40k Gold, 4 Brews | 60k Gold, 1 Epic Tome | 90k Gold, 15 Ember Alloy, 5 Refining Cores | 100 Gems, 2 Epic Tomes | 1 Sacred Shard, Legendary gear 5★ |
| Brutal | 100k Gold, 6 Brews | 150k Gold, 2 Epic Tomes | 200k Gold, 10 Starsteel, 8 Refining Cores | 200 Gems, 1 Legendary Tome | 1 Sacred Shard, 1 Glyph Sigil, Legendary gear 6★ |

Gear from bosses draws from all sets. Player XP per key: 150 / 300 / 600 / 1,200 by tier.

## 3. The weekly gate — Titan, the Sunless

Unlocks at player level 15. Three keys per week. Backdrop: `bg9` (the Eclipse Gate) with violet
fog; boss model: placeholder ×2.4 scale, violet tint; its two **Choristers** (adds) at ×1.2.

Enrage: from its 24th own turn, +10 % ATK every 3 own turns (`enrageEvery: 3`).

| Tier | HP | ATK | DEF | SPD | RES | ACC | Turn limit | Enrage turn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Normal | 5,000,000 | 2,200 | 1,300 | 108 | 100 | 100 | 100 | 24 |
| Hard | 40,000,000 | 3,600 | 1,900 | 114 | 140 | 140 | 100 | 24 |
| Nightmare | 250,000,000 | 5,500 | 2,600 | 120 | 180 | 180 | 100 | 24 |

Phases (by boss HP): **I ≥ 90 %**, **II 90–75 %**, **III < 75 %**. The thresholds are shallow
because this is a damage race and not a kill fight: measured against a finished roster, a key takes
an eighth of the pool with the chorus taxing half of every hit, so these are the marks a real key
passes — and the deeper ones the first draft printed meant its last two gears were never seen. Choristers revive at the start of each phase and every 12 of its own
turns, at 50 % HP; while a Chorister lives, Titan has Ally Protection 50 % from them (kill the
adds first or accept the split). A Chorister holds 2 % of the tier's pool — 100,000 / 800,000 /
5,000,000 HP — with ATK/DEF a little under hers and 8 SPD less. That is the size at which the
choice is real: a mid-endgame roster that clears them spends a fifth of its turns doing it, and one
that does not gives up half of every hit.

- A1 *Shadow Verse* — `3.6 × ATK` on two random allies, 40 % Weaken 25 % (2) on two of them
  (each effect rolls its own pair, as everywhere in the effect DSL).
- A2 *Dirge* (CD 3) — `2.6 × ATK` all allies; steals one buff from each.
- A3 *Eclipse Hymn* (CD 5, phase II+) — Fear (2) on all allies (50 % skip), Decrease TM 30 %.
- A4 *Titan's Embrace* (CD 6, phase III) — heals 5 % max HP, Block Debuffs (2) self; it and its
  chorus gain Counterattack (3).
- Choristers: A1 `2.8 × ATK` single; A2 (CD 4) heal Titan 2 % max HP.
- Passive *Un-light* — allies' healing is reduced by 30 % during phase III.

Reward chests (per tier per week; thresholds as % of tier HP): 2 / 5 / 12 / 25 / 50 / 100 %.

| Tier | 2 % | 5 % | 12 % | 25 % | 50 % | 100 % |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | 30k Gold, 4 Universal Brews | 60 Gems, 2 Epic Tomes | 1 Ancient Shard, 10 Refining Cores | 120 Gems, 1 Glyph Sigil | 1 Sacred Shard, 15 Starsteel | Legendary gear 6★, 1 Legendary Tome |
| Hard | 80k Gold, 8 Universal Brews | 120 Gems, 1 Legendary Tome | 2 Ancient Shards, 15 Refining Cores | 200 Gems, 2 Glyph Sigils | 1 Sacred Shard, 30 Starsteel | 1 Primordial Shard, Legendary gear 6★ |
| Nightmare | 200k Gold, 12 Universal Brews | 250 Gems, 2 Legendary Tomes | 1 Sacred Shard, 25 Refining Cores | 400 Gems, 3 Glyph Sigils | 2 Sacred Shards, 50 Starsteel | 1 Primordial Shard, 1 Mythic Tome, Mythic gear 6★ |

Player XP per key: 800 / 1,600 / 3,200.

Her tiers start at Normal on purpose: the weekly boss is a long-term target, not a farm. A roster
that has just unlocked it at level 15 will lose the fight early and bank a few thousand damage —
that still counts towards the week's pool, and the daily boss is where a mid-game roster earns.

## 4. Screen (clones `daily_weekly_boss_screen.png`)

Left: records panel (per tier: best damage, team avatars, date). Right: tier cards with the boss
portrait, HP bar showing the period's accumulated damage, "Damage: X / Y", chest row with claim
states (locked / claimable / claimed), the period timer ("Resets in 6h 21m"). Bottom-right:
**Battle (key icon ×1)**. An "i" opens the mechanics sheet (abilities, immunities, tips).

In the fight itself, the boss's pool bar carries three chips: **Unshakeable** (with the immunity
list on hover), the enrage — a countdown in its own turns before the first step, then
"Enraged ×N · +X % ATK" — and one chip per counting passive the party has broken, which lands with
a flash on the stage ("ARMOUR BROKEN") and a line in the battle log.

## 5. Content shape

```ts
defineBoss({
  id: 'boss.gargoyle', period: 'daily', keysPerPeriod: 2, unlockLevel: 10, backdrop: 'bg3',
  tiers: [{ id: 'easy', stats: {...}, turnLimit: 50, enrageTurn: 12, chests: [{ pct: 5, rewards: [...] }, ...] }, ...],
  enrageEvery: 2,
  kit: { abilities: [...], rotation: ['a1','a1','a2','a1','a3'], passives: [...] , immunities: ['stun','freeze','sleep','provoke','fear'] },
  adds: [], phases: [],
});
```

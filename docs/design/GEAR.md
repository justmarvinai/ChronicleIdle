# Gear

Related: `CHAMPIONS.md` §2 (stats), `CAMPAIGN.md` §7 (drops), `ECONOMY.md` (materials, gold),
`docs/tech/UI_DESIGN.md` §5.4 (champion gear panel), §5.11 (Forge).

Gear "behaves like champions": it has a **rarity**, **stars** and a **level**, and can be leveled and
refined (star-up). Six slots per champion.

## 1. Slots and main stats

| Slot | Main stat |
| --- | --- |
| Weapon | ATK (flat) |
| Helmet | HP (flat) |
| Shield | DEF (flat) |
| Gauntlets | one of HP %, ATK %, DEF %, C.RATE, C.DMG |
| Chestplate | one of HP %, ATK %, DEF %, RES, ACC |
| Boots | one of HP %, ATK %, DEF %, SPD |

Variable main stats are rolled at creation with weights (HP% 25, ATK% 25, DEF% 25, others split).

## 2. Rarity

| Rarity | Substats at +0 | Sub roll multiplier | Frame colour |
| --- | --- | --- | --- |
| Common | 0 | ×1.00 | grey |
| Uncommon | 1 | ×1.00 | green |
| Rare | 2 | ×1.00 | blue |
| Epic | 3 | ×1.00 | purple |
| Legendary | 4 | ×1.10 | gold |
| Mythic | 4 | ×1.25 | rose (animated shimmer) |

Level-up rolls at +4, +8, +12, +16: if the piece has fewer than 4 substats, a new one is added;
otherwise a random existing substat is increased by a roll.

## 3. Stars and level

Level 0–16. Main stat grows linearly from `+0` to `+16` values; percent and flat tables:

| Main stat | 1★ (+0 → +16) | 2★ | 3★ | 4★ | 5★ | 6★ |
| --- | --- | --- | --- | --- | --- | --- |
| ATK / DEF flat | 10 → 50 | 15 → 75 | 22 → 110 | 32 → 160 | 42 → 210 | 53 → 265 |
| HP flat | 150 → 750 | 240 → 1,200 | 350 → 1,750 | 520 → 2,600 | 660 → 3,300 | 820 → 4,100 |
| HP/ATK/DEF % | 7 → 13 | 10 → 19 | 14 → 26 | 18 → 34 | 24 → 45 | 32 → 60 |
| SPD | 3 → 11 | 4 → 15 | 6 → 22 | 8 → 30 | 10 → 37 | 12 → 45 |
| C.RATE % | 5 → 15 | 7 → 22 | 10 → 30 | 13 → 40 | 17 → 50 | 20 → 60 |
| C.DMG % | 7 → 20 | 10 → 30 | 14 → 40 | 18 → 53 | 23 → 66 | 26 → 80 |
| RES / ACC | 8 → 24 | 12 → 36 | 16 → 48 | 21 → 64 | 26 → 80 | 32 → 96 |

Substat roll ranges (per roll; multiplied by rarity multiplier), by star:

| Substat | 1–2★ | 3–4★ | 5★ | 6★ |
| --- | --- | --- | --- | --- |
| HP % / ATK % / DEF % | 2–4 | 3–6 | 4–8 | 6–10 |
| SPD | 1–2 | 2–3 | 2–4 | 3–6 |
| C.RATE % | 1–3 | 2–4 | 3–6 | 4–7 |
| C.DMG % | 2–4 | 3–5 | 4–7 | 5–8 |
| RES / ACC | 4–8 | 6–12 | 9–15 | 12–20 |
| HP flat | 60–120 | 100–200 | 150–300 | 200–400 |
| ATK / DEF flat | 4–8 | 6–12 | 9–18 | 12–25 |

A substat type appears at most once per piece and never duplicates the main stat.

### Level-up cost (gold), guaranteed success

```
cost(star, level) = LEVEL_COST_BASE[star] × (1 + 0.35 × level)
LEVEL_COST_BASE = { 1: 120, 2: 200, 3: 320, 4: 520, 5: 900, 6: 1,500 }
```
Total 0 → +16 for a 6★ piece ≈ 95k gold. Levelling is instant; multiple levels can be bought at
once ("+4" button) with a running total.

## 4. Refine (star-up)

Unlocked at player level 18. `n★ → (n+1)★` requires: one sacrificial piece of the **same slot and
same star** (any rarity, consumed), `Refining Cores × (n+1)`, gold `REFINE_GOLD[n]` =
{1: 2k, 2: 6k, 3: 15k, 4: 40k, 5: 90k}. The piece keeps rarity, level and substat values; its main
stat is re-based on the new star row. (Refined gear is therefore a little weaker than a native drop
of that star; it is a way to save a great substat roll.)

## 5. Sets (EA-0.1: 14)

A set bonus applies per complete group; 2-piece sets stack (three groups possible).

| Set | Pieces | Bonus | Home settlements |
| --- | --- | --- | --- |
| Ember Guard | 2 | +15 % HP | 1, 5 |
| Ironhide | 2 | +15 % DEF | 2, 6 |
| Warcry | 2 | +15 % ATK | 1, 7 |
| Swiftfoot | 2 | +12 % SPD | 2, 8 |
| Keen Eye | 2 | +12 % C.RATE | 3, 10 |
| Executioner | 2 | +20 % C.DMG | 4, 9 |
| Warding | 2 | +30 RES | 3, 11 |
| Truesight | 2 | +40 ACC | 4 |
| Lifedrinker | 4 | Heal 30 % of damage dealt | 5, 12 |
| Retaliation | 4 | 30 % chance to counterattack when hit | 6, 11 |
| Relentless | 4 | 18 % chance of an extra turn after an ability | 7, 12 |
| Immortal | 4 | +15 % HP; heal 3 % max HP at turn start | 8 |
| Stunlock | 4 | 18 % chance to Stun (1) on each hit | 9 |
| Bulwark | 4 | Shield 20 % max HP (3) at the start of each wave | 10 |

Set bonuses are data (`src/content/sets/*.ts`) using the passive shape from `BATTLE.md` §6.
Forge recipes can target a set with a Glyph Sigil (§6).

## 6. Crafting (The Forge)

Unlocked at player level 8. No timers; crafting is instant and animated (hammer strikes, sparks,
reveal). Recipe = slot + tier (+ optional Glyph Sigil to pick a set from the tier's pool).

| Tier | Materials | Gold | Rarity weights | Stars | Set pool |
| --- | --- | --- | --- | --- | --- |
| I — Scrap | 20 Scrap Iron + 5 Arcane Dust | 2,000 | C 40 / U 35 / R 20 / E 5 | 1–3★ (30/45/25) | any 2-piece set |
| II — Ember | 15 Ember Alloy + 10 Arcane Dust | 12,000 | R 45 / E 40 / L 15 | 3–5★ (30/45/25) | any set |
| III — Star | 10 Starsteel + 20 Arcane Dust | 60,000 | E 40 / L 50 / M 10 | 5–6★ (60/40) | any set |

Glyph Sigil: +1 per craft to choose the set. Crafted gear rolls exactly like a drop. Until the
weekly boss and the quests exist, the Sigil's supply is the 20-star chest of each difficulty
(`ECONOMY.md` §2, `USER_QUESTIONS.md` Q38).

### Dismantle

Returns materials by rarity: Common 2 Scrap; Uncommon 4 Scrap; Rare 6 Scrap + 2 Dust; Epic
4 Ember + 4 Dust; Legendary 3 Starsteel + 6 Dust + 1 Refining Core; Mythic 6 Starsteel + 10 Dust +
2 Refining Cores. Level invested refunds 20 % of gold spent. Multi-select with filters
(rarity ≤, stars ≤, level = 0, not equipped, not locked).

## 7. Inventory

- Capacity 400 pieces (Q in `USER_QUESTIONS.md`); warnings at 90 %; drops beyond capacity go to a
  temporary overflow (20) with a "manage inventory" prompt.
- Filters: slot, set, rarity, stars, main stat, substat, equipped/unequipped, locked.
  Sort: power, level, rarity, stars, newest.
- Lock toggle protects from dismantle and refine.
- Equip flow: from champion screen slot → filtered list → compare panel (before/after stats,
  set completion delta) → equip; swapping from another champion asks for confirmation.
- Gear piece card: frame by rarity, star row, level badge, main stat, substats, set icon, slot glyph.

## 8. Gear instance data

```
GearInstance {
  instanceId,                 // `gear-<n>` from the save's `counters.gear`
  slot, setId, rarity, stars, level,
  mainStat,                   // the identity only: its value follows from star and level (§3)
  subs: [{ stat, value, rolls }],
  equippedTo: championInstanceId | null, locked: boolean, acquiredAt, source
}
```

Nothing derived is stored: the main stat's value, the champion stats a piece grants and the
power it is worth are all recomputed on read (`CLAUDE.md` §5.5). A champion's worn pieces are
read from `champion.gear[slot]`, and `piece.equippedTo` names the wearer — the two are kept in
step by one reducer, so a slot always holds one piece and a piece always has one wearer.

# Campaign

Related: `BATTLE.md`, `GEAR.md` (sets and drops), `ECONOMY.md` (energy, XP), `docs/tech/UI_DESIGN.md`
§5.6–5.8 (map, stage list, battle setup).

## 1. Structure

- **12 settlements × 10 stages × 3 difficulties** (Intro, Normal, Hard) = 360 stages.
- Party size **3 champions** in every campaign battle (boss fights elsewhere use 4; `BATTLE.md` §1).
- Stages are farmable forever; there are no one-time battles.
- Stage 10 of every settlement is a **boss stage** (named boss + adds).
- Global stage index `g = (settlement − 1) × 10 + (stage − 1)` ∈ 0..119 drives enemy scaling.
- Unlocking: stage `n+1` unlocks when stage `n` is cleared; settlement `s+1` unlocks when the boss
  of `s` is cleared. **Normal** unlocks when all 120 Intro stages are cleared; **Hard** when all
  120 Normal stages are cleared. Battle speed ×3 unlocks with Normal complete, ×4 with Hard
  complete (`GAME_DESIGN.md` §6).
- The world map (`UI_DESIGN.md` §5.6) shows the twelve settlements on one illustrated map with a
  difficulty selector; the settlement screen lists its ten stages with stars, best turns, enemy
  preview, drop preview and the Battle button.

## 2. Energy cost

| Settlements | Intro | Normal | Hard |
| --- | --- | --- | --- |
| 1–4 | 4 | 6 | 8 |
| 5–8 | 5 | 7 | 9 |
| 9–12 | 6 | 8 | 10 |

Boss stages cost +1. Auto-repeat runs until energy is insufficient.

## 3. Stars

| Stars | Condition |
| --- | --- |
| ★ | Clear the stage |
| ★★ | Clear with no champion dying (revived champions count as died) |
| ★★★ | ★★ and finish within `turnLimit3Star` ally turns (default 25; boss stage 30) |

Hard defeat limit: 40 ally turns (50 on boss stages) → defeat.
Settlement rewards: at 10/20/30 total stars per settlement+difficulty a **star chest** is granted
(table in §7). "All 3★" on a whole difficulty grants a milestone chest.

## 4. Waves and composition

| Stage | Waves | Enemies per wave | Notes |
| --- | --- | --- | --- |
| 1–3 (Settlement 1 only) | 2 | 2, 2 | tutorial-friendly |
| 1–3 | 3 | 2, 3, 3 | |
| 4–6 | 3 | 3, 3, 4 | first Hexer/Mender appear |
| 7–9 | 3 | 3, 4, 4 | |
| 10 (boss) | 3 | 3, 4, boss + 2 adds | boss is `×1.8 HP, ×1.25 ATK/DEF` of its archetype, own kit |

Composition is declared per stage in content (`waves: [[...enemyIds], ...]`). Authoring rule:
each settlement introduces its faction's units progressively (see §6) so the player learns them.

## 5. Enemy archetypes

Bases are **Intro, index 0** values — what the very first stage fields; scaling per `BATTLE.md`
§4.5. Every faction re-skins these archetypes (name, tint, kit tweaks) — the placeholder
`teritorial_lizard` model is tinted per faction and scaled ×1.35 for bosses until faction models
exist. The bases are set by the balance pass in `tools/sim`, not by feel: they are the point where
the roster a new chronicle is given wins settlement 1 outright and starts losing by settlement 6.

| Archetype | Role | HP | ATK | DEF | SPD | C.RATE | C.DMG | RES | ACC | Kit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raider | Attack | 900 | 100 | 60 | 92 | 10 | 50 | 10 | 10 | A1 `3.0×ATK`; A2 (CD 3) `4.2×ATK` |
| Marksman | Attack | 775 | 105 | 50 | 98 | 15 | 60 | 10 | 15 | A1 `3.2×ATK` targets lowest HP; A2 (CD 4) `2.2×ATK` all |
| Brute | Health | 1,700 | 85 | 70 | 86 | 10 | 50 | 15 | 5 | A1 `2.8×ATK`, 25 % Weaken (2); A2 (CD 4) `5.0×ATK` + Stun 30 % |
| Warden | Defense | 1,225 | 70 | 125 | 88 | 10 | 50 | 20 | 5 | A1 `2.6×DEF`; A2 (CD 4) DEF Up 30 % all + Provoke self |
| Hexer | Support | 975 | 90 | 65 | 100 | 10 | 50 | 20 | 25 | A1 `2.8×ATK` 35 % ATK Down (2); A2 (CD 4) Poison all 60 % |
| Mender | Support | 1,050 | 80 | 70 | 96 | 10 | 50 | 20 | 15 | A1 `2.6×ATK`; A2 (CD 3) heal all 20 % |
| Stage boss | varies | archetype × 1.8 | × 1.25 | × 1.25 | +4 | 15 | 60 | 40 | 30 | 3 abilities, `startsOnCooldown` on A3, enrage +10 % ATK every 8 own turns |

Element per enemy is data; factions have a dominant element so team building matters (e.g. a
Valor faction is best fought with Justice champions).

## 6. The twelve settlements

Wallpapers refer to `/game/assets/wallpapers`. Tints are applied by the renderer (colour grading
overlay) to reuse backdrops until unique art exists. Sets refer to `GEAR.md` §5.

| # | Settlement | Theme / faction (dominant element) | Backdrop | Boss (stage 10) | Set drops |
| --- | --- | --- | --- | --- | --- |
| 1 | Thornwood Crossing | Forest road; Thornwood Bandits (Valor) | bg7 | Redcap Halvar, Bandit King | Ember Guard, Warcry |
| 2 | Millbrook Fields | Farmland; Blighted Wildlife (Faith) | bg7 dusk tint | The Sow of Millbrook (giant boar) | Ironhide, Swiftfoot |
| 3 | Greyhaven Harbor | Port town; Greyhaven Corsairs (Justice) | bg8 | Captain Morwenna Tide | Keen Eye, Warding |
| 4 | Sunspire Bazaar | Desert city; Sand Cult (Eclipse) | bg4 | High Zealot Qorath | Executioner, Truesight |
| 5 | The Old Kingsroad | Valley road; Kingsroad Deserters (Valor) | bg2 | Ser Dagan the Oathbreaker | Lifedrinker, Ember Guard |
| 6 | Barrowdeep | Ancient tomb; Restless Dead (Eclipse) | bg3 | The Barrow Wight | Retaliation, Ironhide |
| 7 | Ashfall Plains | Burning battlefield; Ashen Legion (Valor) | bg6 | Warbrand Ulgrim | Warcry, Relentless |
| 8 | Frostvein Pass | Mountain pass; Frostvein Tribe (Faith) | bg2 cold tint | Matriarch Yrsa Frostmaw | Immortal, Swiftfoot |
| 9 | The Sunken Colosseum | Drowned arena; Gladiator Shades (Justice) | bg1 | The Undefeated | Stunlock, Executioner |
| 10 | Duskmere Marsh | Swamp; Marsh Horrors (Eclipse) | bg3 green tint | Old Grandmother Mire | Bulwark, Keen Eye |
| 11 | Ironcrag Citadel | Fortress; Citadel Knights (Justice) | bg5 → bg6 | Castellan Vaughn | Retaliation, Warding |
| 12 | The Eclipse Gate | The rift; Eclipse Cult (Eclipse) | bg9 | The Gatekeeper (herald of Titan) | Relentless, Lifedrinker, + any |

Faction unit names (examples, content decides): Thornwood Bandits → Cutpurse (Raider), Poacher
(Marksman), Ox-Bandit (Brute), Shieldbearer (Warden), Hedge-Hexer (Hexer), Camp Medic (Mender).

## 7. Rewards

### Per victory

| Reward | Formula / table |
| --- | --- |
| Gold | `GOLD_BASE(120) × (1 + 0.06 × g) × DIFF_GOLD{intro 1, normal 2.2, hard 4}`; boss stage ×2 |
| Champion XP (each champion in party) | `CHAMP_XP_BASE(34) × energyCost × DIFF_XP{1, 1.5, 2}` |
| Player XP | `11 × energyCost × DIFF_XP{1, 1.5, 2}` |
| Gear drop chance | 22 % (boss 50 %), set chosen from the settlement's set list (60 %) or any (40 %) |
| Gear rarity at drop | Intro: C 46 / U 33 / R 21; Normal: C 34 / U 30 / R 27 / E 8 / L 1; Hard: C 28 / U 28 / R 28 / E 12 / L 3 / M 1 |
| Gear stars at drop | by **settlement**, not difficulty: `[⌈s/3⌉, ⌈s/2⌉+1]` clamped to 1–6★, so Thornwood drops 1–2★ and the twelfth settlement 4–6★ |
| Materials | Intro: Scrap Iron 2–4; Normal: Scrap 3–5 + Ember Alloy 1–2; Hard: Ember 2–3 + Starsteel 0–1; Arcane Dust 1–3 always |
| Faded Shard | 3 % (Intro), 4 % (Normal), 5 % (Hard) |
| Brews | 12 % chance of 1 brew matching the settlement's dominant element |

**A difficulty has a rarity ceiling.** Intro tops out at Rare, Normal opens Epic and a sliver of
Legendary, and only Hard mints a Mythic — a rarity above a row's ceiling is not a small number, it
is absent. The *stars* come from the settlement instead, so a stand deep in the map pays a big
piece wherever it is farmed and the difficulty decides only how good that piece is. Epic and better
are still reachable long before Hard: the Forge crafts them from the Ember tier up (`GEAR.md` §6)
and both bosses pay them by the chest (`BOSSES.md` §2), which is where a top-rarity piece is meant
to come from. Numbers live in `src/content/balance/gear.ts`.

### First clear (per stage, per difficulty)

| Difficulty | Stage 1–9 | Stage 10 |
| --- | --- | --- |
| Intro | 5 Gems + 15 Energy | 20 Gems + 1 Ancient Shard + 50 Energy |
| Normal | 10 Gems + 25 Energy | 40 Gems + 1 Ancient Shard + 2 Epic Tomes + 100 Energy |
| Hard | 20 Gems + 40 Energy | 80 Gems + 1 Sacred Shard + 1 Legendary Tome + 150 Energy |

### Star chests (per settlement + difficulty)

| Stars | Intro | Normal | Hard |
| --- | --- | --- | --- |
| 10 | 10k Gold, 2 Universal Brews | 25k Gold, 4 Universal Brews | 60k Gold, 8 Universal Brews |
| 20 | 30 Gems, 1 Faded Shard | 60 Gems, 2 Faded Shards | 100 Gems, 1 Ancient Shard |
| 30 | 1 Ancient Shard, 5 Refining Cores | 1 Sacred Shard, 10 Refining Cores | 1 Primordial Shard, 20 Refining Cores |

All-3★ difficulty milestone: Intro → Epic champion of choice among the seven; Normal → 2 Sacred
Shards + 300 Gems; Hard → 1 Primordial Shard + 1,000 Gems + title "Warden of Veyrath".

## 8. Stage content shape

```ts
defineStage({
  id: 'stage.03.07', settlement: 'settlement.greyhaven_harbor', number: 7,
  backdrop: 'bg8', music: 'combat_campaign_depths_arena',
  waves: [['enemy.corsair_cutlass','enemy.corsair_cutlass','enemy.corsair_gunner','enemy.corsair_boatswain'], ...],
  turnLimit3Star: 25, turnLimitDefeat: 40,
  drops: { setPool: ['gear_set.keen_eye','gear_set.warding'], extra: [] },
  firstClear: 'default', // resolved from tables above unless overridden
})
```
Difficulty variants are generated from the same definition via `DIFFICULTY_MULT` unless a stage
supplies `overrides.hard` (e.g. an extra add on the boss). Enemy levels shown in UI:
`level = 1 + g × 0.5` (Intro), `+ 20` (Normal), `+ 40` (Hard) — display only.

## 9. Auto-repeat

Available from player level 5 (×10), 20 (×25), 30 (×50). Runs the same stage repeatedly at the
chosen speed with a compact HUD: run counter, drops so far, stop button. Stops on defeat or when
energy runs out. Results panel at the end summarises everything gained.

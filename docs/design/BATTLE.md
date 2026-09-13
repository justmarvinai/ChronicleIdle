# Battle System

Related: `CHAMPIONS.md`, `CAMPAIGN.md`, `BOSSES.md`, `docs/tech/ARCHITECTURE.md` §4 (engine
implementation), `docs/tech/UI_DESIGN.md` §5.9 (battle screen).

## 1. Overview

- Party: **3 champions** in campaign encounters, **4** in boss encounters (`partySize` per
  encounter type; slot 1 = leader; the leader's aura applies). Team presets are kept per mode.
- Enemies: 1–3 **waves**, 2–4 enemies each; a boss wave may have adds.
- Turn order is driven by a **turn meter** filled by SPD. No initiative rounds.
- Two control modes, one simulation: **Manual** (player picks ability + target on each ally turn)
  and **Auto** (AI policy picks). The player can toggle at any time; auto is remembered per mode.
- Speeds ×1 / ×2 always; ×3 after all Normal stages; ×4 after all Hard stages. Applies to every
  battle type in the game.
- Battle ends on: all enemies dead (victory), all allies dead (defeat), turn limit reached
  (defeat in campaign; "time's up" in boss fights where damage still counts), or player retreat.

## 2. Turn meter

```
each tick:   tm[u] += SPD[u] × TM_PER_SPD        (TM_PER_SPD = 0.001, tm in [0, 1+])
actor       = unit with highest tm ≥ 1.0  (tie → higher SPD → seeded random)
on act      : tm[actor] = 0 after the action (extra turns re-set to 1.0 instead)
```

TM manipulation effects add/subtract fractions of the bar (`Increase TM 20 %` → +0.20).
Values above 1.0 are kept until the unit acts (allows "overflow" ordering) but capped at 1.5.

## 3. Turn structure

1. **Turn start** — cooldowns tick down; DoTs (Poison, Burn, Bleed) deal damage; Continuous Heal
   heals; `onTurnStart` passives fire; Stun/Freeze/Sleep skip the action (Sleep is also removed
   when the unit is damaged).
2. **Decision** — Manual: `DecisionRequest { unitId, availableAbilities, validTargets }` is emitted;
   the simulation waits. Auto: the AI policy answers immediately (§7). Enemies always use their AI.
3. **Resolve ability** — effects execute in order (§6). Each hit: element → crit → mitigation →
   apply; then debuff attempts; then triggers (`onHit`, `onAllyHit`, `onKill`, counterattacks).
4. **Turn end** — status durations on the acting unit tick down (so a 1-turn Stun costs exactly
   one action; a status the unit placed on itself during this action is not decremented until its
   next turn); turn-meter gains the unit earned during its own action are banked and applied after
   the end-of-turn reset; extra-turn checks (Relentless set, ability text); wave transition if the
   wave is dead (allies keep buffs/debuffs, cooldowns and TM; `onWaveStart` passives fire; the
   `wave.started` event carries the new units); battle end check. Heals that restore 0 HP emit no
   event.

Turn counter: a **turn** is one unit action (ally or enemy). Campaign 3-star limits and boss limits
count **ally turns** unless stated otherwise (`turnLimitMode` per encounter).

## 4. Formulas

All constants are in `src/content/balance/battle.ts`.

### 4.1 Damage

```
raw        = Σ multiplier_i × sourceStat_i             (e.g. 3.5 × ATK, or 0.12 × TARGET_MAX_HP)
elementMod = 1.10 strong | 0.90 weak | 1.00 neutral
critRoll   = rng() < clamp(C.RATE + elementCritShift + bonuses, 0, 100) / 100
critMod    = critRoll ? 1 + C.DMG/100 : 1
K          = DEF_K_BASE + DEF_K_PER_LEVEL × attackerLevel   (1800 + 15 × level → 2700 at 60)
defEff     = DEF_target × (1 − defIgnore)
mitigation = 1 − defEff / (defEff + K)
outgoing   = 1 + Σ damageBonus (buffs, passives, sets) − Σ damagePenalty
incoming   = 1 − Σ damageReduction (Ally Protection redirect handled before this)
variance   = 0.95 + 0.10 × rng()
damage     = floor(raw × elementMod × critMod × mitigation × outgoing × incoming × variance)
```

Shields absorb before HP. Minimum damage per hit = 1. Damage against a **boss** is further
multiplied by the encounter's `damageTakenMult` (bosses have huge HP pools, not immunity).

### 4.2 Healing

```
heal = floor(k × sourceStat × (1 + healBonus) × (1 − healReductionOnTarget))
```
Overheal is discarded. Revive sets HP to the stated percentage and clears debuffs.

### 4.3 Debuff landing

```
land = rng() < baseChance/100
if land: resisted = rng() < clamp(RES_target − ACC_attacker, 0, 100) / 100
```
Bosses have RES 100–160 so ACC matters. `Block Debuffs` makes every attempt fail without a roll.

### 4.4 Buff stripping / stealing

Explicit effects; buffs are removed newest-first unless the effect names a specific buff.

### 4.5 Enemy stat scaling

```
enemyStat = archetypeBase × DIFFICULTY_MULT[diff] × stageScale(globalStageIndex)
DIFFICULTY_MULT = { intro: 1.0, normal: 2.5, hard: 6.0 }   — what the same stage costs per difficulty
stageScale(g)  = 1 + (STAGE_GROWTH_TOP − 1) × (g / 119) ^ STAGE_GROWTH_POWER
STAGE_GROWTH_TOP = 4.8   STAGE_GROWTH_POWER = 2   (index 0..119)
```
The stage term is quadratic, not linear: settlement 1 is nearly flat (×1.00 → ×1.04), the curve
bites from settlement 6 (×1.9) and the last stand is ×4.8 of the first. That shape is what lets the
roster a new chronicle is given walk Intro's first settlements — it can only level, not rank up or
gear, before Phases 5–6 — while Intro's last settlements still ask for a collected roster. Bosses
(stage 10) use ×1.8 HP, ×1.25 ATK/DEF on top. See `CAMPAIGN.md` §5 for archetype bases, and
`pnpm sim:balance` for the win-rate bands the curve is tuned against.

## 5. Status effects (EA-0.1 set)

Durations are in the affected unit's turns. Max 10 statuses per unit; a re-applied status refreshes
duration (higher value wins). Icons are mapped from `/game/assets/ui/line-glyphs` and tinted.

### Buffs

| Id | Name | Effect | Icon |
| --- | --- | --- | --- |
| `atk_up` | ATK Up | +25 % / +50 % ATK (value from effect) | glyph-sword-clash |
| `def_up` | DEF Up | +30 % / +60 % DEF | glyph-shield-block |
| `spd_up` | SPD Up | +15 % / +30 % SPD | glyph-rockets |
| `crit_rate_up` | C.RATE Up | +15 % / +30 % C.RATE | glyph-shooting-stars |
| `res_up` | RES Up | +40 RES | glyph-holy-cross |
| `shield` | Shield | Absorbs N HP (stored) | glyph-nature-shield |
| `regen` | Continuous Heal | Heals 7.5 % max HP at turn start | glyph-health-potion |
| `block_debuffs` | Block Debuffs | Debuffs cannot land | glyph-holy-totem |
| `counter` | Counterattack | When hit, retaliates with A1 at 75 % damage | glyph-crossed-swords |
| `ally_protection` | Ally Protection | Caster takes N % of damage dealt to the target | glyph-ribcage-armor |
| `revive_on_death` | Revive on Death | If killed, revives at 30 % HP (consumed) | glyph-phoenix |
| `veil` | Veil | Cannot be targeted by single-target abilities | glyph-cloaked-figure |

### Debuffs

| Id | Name | Effect | Icon |
| --- | --- | --- | --- |
| `atk_down` | ATK Down | −25 % / −50 % ATK | glyph-sword-clash (red) |
| `def_down` | DEF Down | −30 % / −60 % DEF | glyph-shield-block (red) |
| `spd_down` | SPD Down | −15 % / −30 % SPD | glyph-rockets (red) |
| `weaken` | Weaken | +15 % / +25 % damage taken | glyph-broken-shackle |
| `poison` | Poison | 5 % max HP damage per turn start (stackable ×3) | glyph-thorny-branch |
| `burn` | Burn | 4 % max HP + 0.6 × caster ATK per turn (not stackable) | glyph-magic-flame |
| `bleed` | Bleed | 5 % of damage from the placing hit repeated (stackable ×2) | glyph-spiked-cleaver |
| `stun` | Stun | Skips turn | glyph-stomp-impact |
| `freeze` | Freeze | Skips turn; takes +10 % damage | glyph-hourglass |
| `sleep` | Sleep | Skips turn; removed when damaged | glyph-owl |
| `provoke` | Provoke | Must use A1 on the provoker | glyph-fist-punch |
| `heal_reduction` | Heal Reduction | −50 % / −100 % healing received | glyph-cursed-eye |
| `block_buffs` | Block Buffs | Buffs cannot be applied | glyph-evil-eye |
| `fear` | Fear | 50 % chance to skip turn (bosses only) | glyph-flaming-skull |

Turn-meter changes (`tm_increase`, `tm_decrease`) and buff strips are instant effects, not statuses.

## 6. Effect DSL

Abilities are arrays of typed effect objects resolved in order. Targeting is declared per effect so
one ability can hit an enemy and buff the team.

```ts
type Target =
  | 'self' | 'single_enemy' | 'all_enemies' | { random_enemies: number }
  | 'single_ally' | 'all_allies' | 'lowest_hp_ally' | 'all_dead_allies'
  | { adjacent_to_target: number } | 'highest_atk_enemies_2' | 'provoker';

type Effect =
  | { kind: 'damage'; target; mult: number; stat: 'ATK'|'DEF'|'HP'|'TARGET_MAX_HP'; hits?: number;
      defIgnore?: number; critBonus?: number; guaranteedCritIf?: Condition; onKill?: Effect[] }
  | { kind: 'heal'; target; mult: number; stat: 'ATK'|'HP'|'CASTER_MAX_HP'|'TARGET_MAX_HP'; percent?: boolean }
  | { kind: 'apply_status'; target; status: StatusId; value?: number; turns: number; chance: number }
  | { kind: 'remove_status'; target; which: 'debuffs'|'buffs'; count: number | 'all' }
  | { kind: 'tm'; target; delta: number; chance?: number }
  | { kind: 'revive'; target; hpPercent: number }
  | { kind: 'extra_turn'; target: 'self'; if?: Condition }
  | { kind: 'detonate'; target; status: 'poison'|'burn'|'bleed'; percentOfRemaining: number }
  | { kind: 'leech'; percentOfDamage: number }
  | { kind: 'conditional'; if: Condition; then: Effect[]; else?: Effect[] };

type Condition =
  | { targetHas: StatusId } | { targetHasAnyDebuff: true } | { targetHpBelow: number }
  | { killedThisAction: true } | { selfHpBelow: number }
  | { alliesBelowHp: { percent: number; count: number } } | { alliesBelowTm: { percent: number; count: number } }
  | { enemiesAlive: { gte?: number; lte?: number } } | { waveStart: true };

// Passive-only kinds (used by passives, auras and gear-set bonuses; never by active abilities)
type PassiveEffect =
  | { kind: 'stat_mod'; stat: StatId; percent?: number; flat?: number; if?: Condition }        // auras, 2-piece sets
  | { kind: 'damage_bonus'; value: number; scope?: 'all' | 'crit' | 'dot'; if?: Condition }   // e.g. +15 % vs DEF Down
  | { kind: 'damage_reduction'; value: number; if?: Condition }                                // e.g. −10 % while an ally < 50 %
  | { kind: 'counterattack' }                                                                   // Retaliation set, Counterattack triggers
  | { kind: 'survive_lethal'; hpPercent: number; oncePerBattle: true; shield?: number }        // Khazgor, Varkos, Eldric
  | { kind: 'status_value_override'; status: StatusId; value: number }                          // Rattledagger's 6 % Poison
  | { kind: 'retarget_single_attacks'; while: 'any_ally_alive' }                                // Morrigan's Veiled
  | { kind: 'extra_turn_chance'; chance: number }                                               // Relentless set
  | Effect;                                                                                     // any active effect on a trigger
```

Passives use the same effects with a trigger: `onTurnStart`, `onHit`, `onHitTaken`, `onAllyHit`,
`onKill`, `onDeath` (once per battle flag), `onWaveStart`, `static` (stat modifiers, damage
bonuses conditioned on state). Set bonuses (`GEAR.md` §5) use the same passive shape.

Every new `kind` needs: resolver + unit tests + a row in the table above + a changelog entry.

## 7. Auto-battle AI

Data-driven policy evaluated per decision. Each ability declares `ai: { priority, when?, avoid? }`
using conditions from the DSL, and the policy picks the highest-priority **usable** ability whose
`when` holds; A1 is the fallback. Targeting rules by ability kind:

| Kind | Default target choice |
| --- | --- |
| Single damage | Lowest effective HP enemy that the hit could kill; else highest-ATK enemy; provoke overrides |
| Single heal / buff | Lowest-HP-% ally without that buff |
| Debuff ability | Enemy without that debuff with the highest threat (ATK × SPD) |
| AoE | n/a |

Global rules: never waste heals above 90 % team HP; save `revive` abilities for a dead ally; use
TM boosts when ≥2 allies are below 50 % TM; prefer buffs at wave start; bosses (see `BOSSES.md`)
have their own scripted rotations (`rotation: ['a1','a2','a1','a3']`).

Enemy AI uses the same evaluator with the enemy's `ai` block; campaign enemies are simple
(priority A2 > A1, random targets weighted by threat).

## 8. Manual mode UX rules

- Ability buttons (bottom-right) show cooldown counters, "P" for passive, disabled state; hover
  shows the full description with current numbers (after upgrades).
- Target selection: click an enemy/ally; valid targets glow; AoE highlights all; auto-target is
  preselected so a single click on the ability is enough.
- Hotkeys: `1–4` abilities, `Tab` cycle targets, `Space` confirm, `A` toggle auto, `+/−` speed,
  `Esc` pause menu.

## 9. Battle result

Victory: reward roll (drops, gold, champion XP split equally among survivors and dead alike, player
XP), stars, "Best time" (ally turns), "New record" flags, auto-repeat continuation. Defeat: show
enemy remaining HP %, cause hints (e.g. "Enemies out-sped you"), suggestions (upgrade prompts),
"Retry" / "Team". Battle log (scrollable, exportable) is available from the pause menu and the
result screen.

## 10. Speed & auto-repeat

- Speed changes the presenter timeline only (`ARCHITECTURE.md` §4.4). ×4 collapses hit-stops and
  camera moves; damage numbers remain readable.
- **Auto-repeat** (campaign): runs N battles back-to-back (×10 from level 5, ×25 at 20, ×50 at 30)
  while energy lasts; each battle still renders at the chosen speed (no instant skip in EA-0.1;
  skip tickets are backlog). A summary panel accumulates drops.

## 11. Tunables (balance/battle.ts)

| Constant | Default |
| --- | --- |
| `PARTY_SIZE_CAMPAIGN`, `PARTY_SIZE_BOSS` | 3, 4 |
| `TM_PER_SPD` | 0.001 |
| `TM_OVERFLOW_CAP` | 1.5 |
| `DEF_K_BASE`, `DEF_K_PER_LEVEL` | 1800, 15 |
| `VARIANCE_MIN`, `VARIANCE_MAX` | 0.95, 1.05 |
| `MAX_STATUSES_PER_UNIT` | 10 |
| `POISON_PCT`, `BURN_PCT`, `REGEN_PCT` | 0.05, 0.04, 0.075 |
| `COUNTER_DMG_MULT` | 0.75 |
| `REVIVE_ON_DEATH_HP` | 0.30 |
| `CAMPAIGN_TURN_LIMIT_DEFAULT` | 40 ally turns |
| `BOSS_TURN_LIMIT_DAILY`, `BOSS_TURN_LIMIT_WEEKLY` | 50, 100 |

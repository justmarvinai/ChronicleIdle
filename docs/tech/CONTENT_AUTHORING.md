# Content Authoring Guide

How to add or tune champions, abilities, enemies, stages, gear sets, currencies, banners, bosses,
quests, missions and tutorial steps. Everything here is data under `src/content/`; nothing needs
engine or UI changes unless a genuinely new mechanic is required.

## 1. Conventions

- Ids: `type.snake_case` — `champ.anuria`, `enemy.thornwood_cutpurse`, `stage.01.07`,
  `gear_set.ember_guard`, `boss.gargoyle`, `banner.featured`, `dq.login`, `m.3.4`, `tut.1.6`.
- One object per file; file name = id without the type prefix. Each folder lists its objects in
  an explicit `index.ts` (`CHAMPIONS`, `CURRENCIES`, …) that `registry.ts` assembles — no glob, so
  the same modules load identically in Vite, Vitest and the `tools/` scripts.
- Text is an i18n key; English strings live in `src/i18n/en/<domain>.ts`. Descriptions may use
  placeholders resolved from the ability's current numbers: `"Deals {dmg} damage and has a {chance}% chance to place [DEF Down] for {turns} turns."`.
- Numbers that are *balance* (curves, multipliers, costs, rates) live in `src/content/balance/`
  and are referenced by name; per-object numbers (an ability's multiplier) live in the object.
- Run `pnpm content:validate` after every change; it also runs in `pnpm test` and at dev boot.

## 2. Champion

```ts
// src/content/champions/anuria.ts
import { defineChampion, hit, status, up } from './dsl';

/** Epic Justice sniper: DEF shred and a guaranteed crit on debuffed targets (CHAMPIONS.md §4.4). */
export default defineChampion({
  id: 'champ.anuria',
  rarity: 'epic',
  element: 'justice',
  role: 'attack',
  stats: [13_200, 1_480, 880, 104, 15, 60, 25, 10], // hp atk def spd critRate critDmg res acc at 6★/60
  art: { model: 'model.anuria', avatar: 'avatar.anuria', facing: 'left' }, // or { placeholderTint: '#8a5a3a' }
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'silver_arrow', // → id ab.anuria.silver_arrow, i18n ab.anuria.silver_arrow.name/.description
      icon: 'spell.hunt_piercing_arrow',
      effects: [hit(3.5), status('def_down', 2, { chance: 30, value: 30 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'piercing_volley',
      icon: 'spell.hunt_arrow_storm',
      cooldown: 4,
      effects: [hit(2.6, 'all_enemies', { defIgnore: 0.2 })],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3, when: { enemiesAlive: { gte: 3 } } },
    },
    {
      slot: 'a3',
      key: 'heartseeker',
      icon: 'spell.hunt_golden_bow',
      cooldown: 5,
      effects: [hit(6.8, 'single_enemy', { guaranteedCritIf: { targetHasAnyDebuff: true } })],
      upgrades: [up.dmg(5), up.dmg(10), up.cd()],
      ai: { priority: 4 },
    },
  ],
  passive: {
    key: 'rangers_focus',
    icon: 'spell.hunt_tracking_ring',
    trigger: 'static',
    effects: [{ kind: 'damage_bonus', value: 0.15, scope: 'crit', if: { targetHas: 'def_down' } }],
  },
});
```

`defineChampion` derives the ids and i18n keys from `id` and each ability `key`
(`champ.<id>.name`, `champ.<id>.lore`, `ab.<id>.<key>.name` / `.description`), defaults `cooldown`
to 0, `ai.priority` to the slot order and `version` to 1, and marks the art as a placeholder when
`placeholderTint` is given (the lizard model and avatar are borrowed, the tint is multiplied over
both, and every card and portrait shows "Art pending"). The DSL builders in
`src/content/champions/dsl.ts` — `hit`, `status`, `heal`, `cleanse`, `strip`, `tm`, `revive`,
`extraTurn`, `leech`, `when` and the `up.*` upgrade steps — produce plain `Effect` objects, so
anything they cannot express can still be written as a literal effect (the passive above). Add the
new file to `src/content/champions/index.ts` and the strings to `src/i18n/en/champions.ts`.

Descriptions quote live numbers with `{dmg}`, `{dmg2}`, `{hits}`, `{chance}`, `{turns}`,
`{value}`, `{heal}`, `{shield}`, `{tm}`, `{cooldown}` and `{defIgnore}`; the engine
(`abilityNumbers`, `passiveNumbers`) fills them from the effects with the instance's skill-tome
upgrades applied, so the text always states what the ability does *now*.

Checklist: stats within ±15 % of the role template × rarity budget (validator warns), ability
count matches rarity (Common 1, Uncommon/Rare 2, Epic 3, Legendary/Mythic 4), slots in order with
A1 at cooldown 0, at most three upgrade steps for A1 and four elsewhere, every status id exists,
every `mult` positive, `art` keys exist in the manifest, every placeholder token in a description
resolves (the content test renders each one).

## 3. Enemy

A settlement's rank and file are re-skins of the six archetypes, so a faction file brings names,
element and tint — never a copy of a kit:

```ts
import { defineFaction } from '@content/enemies/faction';
import boss from './…';      // a named boss, authored with defineEnemy (below)

export default defineFaction({
  slug: 'thornwood_bandits',
  element: 'valor',
  tint: '#a0522d',                                   // multiplied over the lizard placeholder
  units: [
    { slug: 'thornwood_cutpurse', archetype: 'raider' },
    { slug: 'thornwood_poacher', archetype: 'marksman' },
    { slug: 'thornwood_ox_bandit', archetype: 'brute' },
    { slug: 'thornwood_shieldbearer', archetype: 'warden' },
    { slug: 'thornwood_hedge_hexer', archetype: 'hexer', element: 'eclipse' },
    { slug: 'thornwood_camp_medic', archetype: 'mender', element: 'faith' },
  ],
  boss,
});
```

Each unit becomes `enemy.<slug>` with the archetype's stats and kit; the shared abilities live
once per archetype in `src/content/enemies/archetypes.ts` as `ab.arch.<archetype>.<key>`, so the
only strings a faction needs are its own name and its units' names. A faction that wants a new
mechanic gets a named enemy instead — which is what the twelve stage bosses are:

```ts
import { hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';

export default defineEnemy({
  id: 'enemy.redcap_halvar',
  archetype: 'boss', element: 'valor', role: 'attack',
  stats: [1_700, 85, 70, 86, 15, 60, 40, 30],       // HP ATK DEF SPD C.RATE C.DMG RES ACC at Intro, stage 0
  art: { tint: '#a0522d', scale: 1.3 },
  abilities: [
    { slot: 'a1', key: 'cleaver', icon: 'spell.weapon_hatchet', effects: [hit(2.2)] },
    { slot: 'a2', key: 'bandit_call', icon: 'spell.crest_warmark', cooldown: 3, effects: [status('atk_up', 2, { target: 'all_allies' })] },
  ],
  boss: { rotation: ['a1', 'a2', 'a1'], immunities: [], enrageAfterTurn: 12, damageTakenMult: 1 },
});
```

Ids and i18n keys derive from the enemy id (`ab.redcap_halvar.cleaver.name` / `.description`);
abilities use the champion effect builders. Stats are the base at Intro, stage index 0 and are
scaled per encounter (`BATTLE.md` §4.5): `× DIFFICULTY_MULT × stageScale(stageIndex) × statMult`,
bosses ×1.8 HP and ×1.25 ATK/DEF. Strings live in `src/i18n/en/campaign.ts`.

### 3.1 Encounter

```ts
{
  id: 'encounter.bench.stress', name: '…name', description: '…description',
  kind: 'bench',               // 'campaign' (3 champions) · 'boss' | 'bench' (4)
  partySize: 4, difficulty: 'normal', stageIndex: 40, enemyLevel: 40,  // enemyLevel is what plates show
  turnLimit: 60, turnLimitMode: 'all', timeUpIsDefeat: false,
  backdrop: 'bg.bg3', music: 'boss', surface: 'stone', version: 1,
  waves: [{ enemies: [{ enemyId: 'enemy.the_gatekeeper', statMult: 5 }, …] }, …],
}
```

Campaign encounters are **not** authored: `stageEncounter(settlement, stage, difficulty)` derives
all 360 of them from the stage, and the registry resolves and memoises them by the id
`encounter.stage.<nn>.<nn>.<difficulty>`. Period bosses derive theirs too (§3.2), and so does every
floor of the Eternal Tower (`encounter.tower.<nnn>`, §3.3), so the only authored `EncounterDef`
left is the perf bench (`src/content/encounters/bench.ts`). The validator checks enemy ids, i18n
keys, the backdrop key and the party size per kind.

### 3.2 Period boss

One file per boss (`src/content/bosses/<slug>.ts`). `defineBoss` authors the kit **once** — a boss
does not fight differently on Brutal, it hits harder — and every tier becomes an `EnemyDef` with
the stats the table prints (`fixedStats`: no difficulty multiplier, no stage curve) plus a derived
`encounter.boss.<slug>.<tier>`:

```ts
export default defineBoss({
  slug: 'gargoyle',
  period: 'daily', keysPerPeriod: 2, unlockLevel: 10,
  feature: 'daily_boss', keyCurrency: 'key_daily',
  element: 'eclipse', role: 'health',
  art: { tint: '#efe6d2', scale: 2, desaturate: true },   // washed placeholder (ASSETS.md §3)
  backdrop: 'bg.bg3', surface: 'stone',
  immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],   // shown as "Unshakeable"
  enrageEvery: 2,                                                // own turns between +10 % ATK steps
  rotation: ['a1', 'a1', 'a2', 'a1', 'a3'],
  abilities: [{ slot: 'a1', key: 'granite_fist', icon: 'spell.earth_boulder_fist', prefer: 'highest_atk', effects: [...] }, …],
  passives: [{ key: 'weathered_stone', icon: 'spell.earth_monolith', trigger: 'static', effects: [...] }],
  tiers: [
    {
      id: 'easy',
      stats: [250_000, 900, 700, 100, 15, 50, 60, 60],   // exactly what BOSSES.md prints
      turnLimit: 50, enrageTurn: 12, enemyLevel: 20, playerXp: 150,
      chests: [{ pct: 5, currencies: [...] }, …, { pct: 100, currencies: [...], gear: { rarity: 'legendary', stars: 5 } }],
    },
    …
  ],
});
```

A boss that changes gear adds two fields, and nothing in the engine or the UI needs a line for it:

```ts
  phases: [0.9, 0.75],            // descending HP fractions: three phases (I ≥ 90 %, II, III < 75 %)
  adds: {
    slug: 'chorister', archetype: 'mender',     // its own kit under `ab.chorister.*`
    element: 'eclipse', role: 'support',
    art: { tint: '#6f5bb0', scale: 1.2, desaturate: true },
    count: 2, guardPercent: 50,                 // half of every hit meant for the master
    reviveEvery: 12, revivedHpPercent: 50,      // own turns of the master; also at every phase
    abilities: [{ slot: 'a1', key: 'discord', icon: 'spell.blood_soul_ribbon', effects: [hit(2.8)] }, …],
  },
  abilities: […, { slot: 'a3', key: 'eclipse_hymn', icon: 'spell.rune_eclipse_mark', cooldown: 5, minPhase: 2, effects: […] }],
```

Each tier then carries an `addStats` row beside its own (same order), and `defineBoss` fields the
escort at `enemy.<addSlug>_<tier>` in the wave the key buys (ADR-038). `minPhase` on an ability
makes the rotation pass it over until the fight gets there, and a passive can read the phase with
`if: { selfPhaseAtLeast: 3 }` — that is how Titan's Un-light dims the party's healing only at the
end. Set both from measurement, not from intuition: the validator rejects a `minPhase` past the
last phase and an escort holding more than a tenth of the tier's pool, and Q41/ADR-039 record how
the shipped numbers were measured.

Ids and strings derive from the slug (`ab.gargoyle.devour.name`, `boss.gargoyle.tier.easy`) and
live in `src/i18n/en/bosses.ts`; register the file in `src/content/bosses/index.ts`. The validator
holds the promises the design makes: chest thresholds climb and end at the kill, each tier is a
bigger pool and pays more chronicle XP than the one below it, the tier enemy carries the tier's
stats, the boss's enrage cadence and its phases, the escort each tier fields is the one the boss
block points at, and the first enrage step must land inside half the ally-turn limit — the share of a race a boss actually gets to act in, so a mechanic that could never fire is
a build error (ADR-036).

### 3.3 Tower floors

There is **nothing to author**. A floor of the Eternal Tower is a function of its number
(`@engine/tower/encounter.ts`, ADR-043): the twelve campaign factions cycle as it climbs, the
window of units walks by one per floor, every tenth floor fields the faction's named boss with two
of its own, and `towerScale(floor)` is the only multiplier on the enemy — the encounter is pitched
at `difficulty: 'intro'` and `stageIndex: 0`, both of which come out at 1.0, so one number decides
how hard a floor is.

To change the tower you change `src/content/balance/tower.ts`:

| I want… | Change |
| --- | --- |
| more floors | `TOWER_FLOORS`. Nothing else: the curve is defined per floor, so existing floors keep their numbers |
| the climb steeper or kinder | `TOWER_SCALE_BASE` (floor 1, against Intro's last stand at 4.8) and `TOWER_SCALE_GROWTH` — run `pnpm sim:balance` after |
| a floor to pay more | `TOWER_GOLD_BASE` / `_GROWTH` / `_BOSS_MULT`, `TOWER_ENERGY_PER_BAND`, the brew and XP helpers |
| different shard odds | a row in `TOWER_SHARD_ODDS`. Floors above its last row keep that row's odds, so the table only needs rows where the numbers change |
| a different key economy | `TOWER_KEY_CAP`, `TOWER_KEY_REGEN_SECONDS`, `TOWER_KEY_COST` |
| a longer or shorter season | `TOWER_SEASON_DAYS`. It is read at the door, so changing it needs no migration |

A floor that needed a scripted gimmick would need a new mechanism rather than a data file — say so
in `USER_QUESTIONS.md` before building one.

## 4. Settlement and stands

A settlement is ten lines: its faction, where it is fought and which archetypes turn up on each
stand. Wave *shape* comes from the design table (`CAMPAIGN.md` §4), so it is computed rather than
typed out, and the boss stand leads its last wave with the faction's boss.

```ts
import faction from '@content/enemies/factions/01_thornwood_bandits';
import { defineSettlement } from './dsl';

export default defineSettlement({
  index: 1,
  slug: 'thornwood_crossing',
  faction,
  backdrop: 'bg.bg7',
  grade: 'rgba(24, 30, 18, 0.42)',                 // colour grade over the backdrop
  surface: 'dirt',                                  // footstep surface for lunges
  setPool: ['gear_set.ember_guard', 'gear_set.warcry'],
  stages: [
    { mix: ['raider'] },                            // each wave is filled by cycling the mix
    { mix: ['raider', 'marksman'] },
    …
    { mix: ['brute', 'warden', 'marksman'], adds: ['warden', 'mender'] },   // stand 10: who flanks the boss
  ],
});
```

Add the file to `src/content/stages/index.ts`, the faction to
`src/content/enemies/factions/index.ts`, and the names to `src/i18n/en/campaign.ts`
(`settlement.<slug>.name` / `.description`, `faction.<slug>.name`, `enemy.<slug>.name`). Stage
ids, turn limits, energy costs, plate levels, drops and the three difficulties all follow from the
index — there is nothing else to write. `pnpm content:validate` checks that a stand only fields
its own faction, that the boss leads only the boss stand's last wave, that every archetype is
fielded and that every authored enemy is fightable somewhere.

## 5. Gear set

One file per set, `src/content/sets/<slug>.ts`, written with the `set()` helper from
`src/content/sets/set.ts` and collected in `index.ts`:

```ts
// src/content/sets/retaliation.ts
import { set } from './set';

export default set({
  slug: 'retaliation',              // the id becomes `gear_set.retaliation`
  pieces: 4,                        // 2 or 4; two-piece groups stack, up to three on six slots
  icon: 'spell.hero_voidguard',     // the painting its passives carry, as every passive does
  emblem: 'emblem.retaliation',     // the set's identifier on every piece (GEAR.md §5.1)
  art: {                            // one painting per slot, from /game/assets/gear_sets/<slug>/
    weapon: 'gear.retaliation.weapon',
    helmet: 'gear.retaliation.helmet',
    shield: 'gear.retaliation.shield',
    gauntlets: 'gear.retaliation.gauntlets',
    chestplate: 'gear.retaliation.chestplate',
    boots: 'gear.retaliation.boots',
  },
  grants: [{ effects: [{ kind: 'counterattack', chance: 30 }] }],
  homes: [6, 11],                   // settlements whose drops favour it (GEAR.md §5)
})
```

- **Art comes first.** Drop the six paintings and the emblem into `/game/assets/gear_sets/`
  (`ASSETS.md` §5 has the names) and run `pnpm assets:build`; the keys above only typecheck once
  the manifest has them. `pnpm content:validate` then refuses a set whose emblem or any painting is
  already another set's, or whose `helmet` shows anything but a helmet — both exist to tell sets
  apart, so neither is ever shared.

- `grants` is one entry per passive the complete group gives; the trigger defaults to `static`.
- A `stat_mod` is **only** read off a static passive (`BATTLE.md` §6), so a set that changes a
  stat *and* does something on a trigger needs one entry of each — see Immortal, which grants
  `+15 % HP` statically and heals on `onTurnStart`.
- Two-piece stat sets are a single entry:
  `{ effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }`.
- Every `homes` entry must name the set in that settlement's `setPool`, and every pool entry must
  name a set that exists — `pnpm content:validate` checks both directions, plus the i18n keys
  (`gear_set.<slug>.name` / `.description` in `src/i18n/en/sets.ts`) and every asset key.
- A set needing a mechanic the engine does not have yet gets a new effect kind **with tests**
  first; never an `if (setId === …)` anywhere.

## 6. Currency

```ts
// src/content/currencies/index.ts — name and description keys, version and flows are filled in
defineCurrency(c({ id: 'mat_glyph_sigil', icon: 'spell.rune_gilded_script', category: 'materials', topBar: false }))

// src/content/currencies/flows.ts — where it comes from and what it is for, as places
mat_glyph_sigil: { sources: ['campaign', 'gargoyle', 'titan', 'missions', 'quests', 'login', 'market'], uses: ['forge'] },
```
Adding a currency: its id in `CURRENCY_IDS` (display order), its definition here, its row in
`flows.ts` (validated as place ids from `src/content/places/types.ts`, at least one of each — the
Wallet lists them with the way to each, so every source must really pay it and every use really
spend it), its English name and description in `src/i18n/en/currencies.ts`, and its sources and
sinks in `docs/design/ECONOMY.md` §2. A currency that lives in a pool rather than a wallet row
(energy, the keys) also needs its arm in `holdingOf` (`src/state/wallet.ts`).

## 7. Title

```ts
title('gatebreaker', { kind: 'difficulty_cleared', difficulty: 'intro' })
// → { id: 'title.gatebreaker', name: 'title.gatebreaker.name', description: '…', condition, version: 1 }
```

One entry in `src/content/titles/index.ts` plus a name and a description in `src/i18n/en/titles.ts`.
Conditions are data, evaluated by `@engine/progression/titles`: `level`, `difficulty_cleared`,
`difficulty_mastered` (three stars everywhere), `settlement_boss` and `champions_owned`. The list
order is display order. A title is never stored in the save — only the one the chronicle wears
(`ECONOMY.md` §4.1) — so a new condition changes what every existing chronicle has earned the
moment it ships. Add a new condition kind to the union and the evaluator together, with tests.

## 8. Boss, banner, quests, missions, tutorial

See the "Content shape" sections of `docs/design/BOSSES.md`, `SUMMONING.md`,
`QUESTS_MISSIONS.md`, `TUTORIAL.md`. All use the same `define*` helpers and validation.

### Quests (`src/content/quests/`)

One file per board (`daily.ts`, `weekly.ts`), each a `board()` of `quest()`s and a chest ladder:

```ts
export default board({
  period: 'daily',
  feature: 'quests_daily',
  // Stands in for every quest the chronicle cannot do yet, worth exactly their points together.
  replacement: quest({ slug: 'win_battles', icon: 'glyph.crossed_swords',
    goal: { type: 'win_battles', count: 3 }, points: 10,
    rewards: [{ currency: 'gold', amount: 2_000 }], feature: null }),
  quests: [
    quest({ slug: 'login', icon: 'glyph.hourglass', goal: { type: 'login' }, points: 10,
      rewards: [{ currency: 'shard_faded', amount: 1 }], feature: null }),
    quest({ slug: 'forge', icon: 'glyph.spiked_cleaver', points: 10, feature: 'forge',
      // The closest of several ways finishes it.
      goal: { type: 'any', goals: [{ type: 'craft', count: 1 }, { type: 'dismantle', count: 1 }] },
      rewards: [{ currency: 'mat_scrap_iron', amount: 10 }] }),
    …
  ],
  chests: [
    { points: 20, currencies: [{ currency: 'gold', amount: 3_000 }] },
    …
    { points: 100, currencies: [{ currency: 'gems', amount: 30 }, { currency: 'tome_rare', amount: 2 }],
      // Every third claim of *this chest* pays the alternate instead (counted for the chronicle's life).
      cycle: { every: 3, instead: [{ currency: 'shard_ancient', amount: 1 }] } },
  ],
});
```

- The id and the i18n key derive from the slug (`quest.daily.login`, `quest.login.name`, in
  `src/i18n/en/quests.ts`); `period` comes from the board, so a quest cannot disagree with the
  board it sits on.
- A quest that needs a feature names it. While that feature is locked the quest is hidden and the
  replacement carries its points, and the validator checks that the board still totals 100 at
  **every** feature-unlock level — a quest whose points do not add up is a build error.
- `goal` is the DSL of `QUESTS_MISSIONS.md` §1. A counter goal is measured from the period's
  baseline, so it needs a counter somebody writes: the validator checks every goal against
  `COUNTER_KEYS` (`engine/progression/counters.ts`). A new kind of goal is a new evaluator with a
  test, never an `if (quest.id === …)`. Adding a counter means adding its name there *and* bumping
  it from the reducer that owns that play.
- Chest thresholds climb and the last one is the full board. Rewards are currencies only; a chest
  that should hand over gear is a new field with tests, like the boss chests' `gear`.

### Banners and the featured rotation (`src/content/banners/`)

One file per banner (`standard.ts`, `featured.ts`), collected in `index.ts`:

```ts
const featured: BannerDef = {
  id: 'banner.featured', kind: 'featured',
  name: 'banner.featured.name', description: 'banner.featured.description',
  shards: SHARD_IDS,
  rotations: [{ legendary: 'champ.aurelia_dawnwarden', epics: ['champ.khazgor', 'champ.maruan'] }, …],
  version: 1,
};
```

- A rotation is one Legendary and exactly two Epics; a Primordial Rotation (every fourth turn)
  also names `mythic`. `validateBanners` checks that every featured id is in the summonable pool
  *at the rarity the row claims* and that the two Epics differ, so a typo is a build error rather
  than a banner that quietly features nobody.
- The wheel walks the list by rotation index and repeats from the top, so adding a row lengthens
  the cycle without moving what is live now — but the index is absolute, so inserting a row in the
  middle shifts every later rotation. Append.
- Rates, mercy, the epoch and the featured weight are `balance/summon.ts`, never the banner.

### Missions (`src/content/missions/`)

One file per chapter (`chapter_01.ts` … `chapter_10.ts`), each a `chapter()` of twelve
`mission()`s and the chest at the end:

```ts
export default chapter({
  index: 3,
  missions: [
    // 3.1 Clear Sunspire Bazaar 4-5
    mission({ type: 'clear_stage', settlement: 4, stage: 5, difficulty: 'intro' }, [
      { currency: 'gold', amount: 6_000 },
    ]),
    // 3.2 Deal 250,000 damage to Gargoyle (Easy) in a day
    mission({ type: 'boss_damage', boss: 'boss.gargoyle', tier: 'easy', amount: 250_000 }, [
      { currency: 'gems', amount: 20 },
    ]),
    …
  ],
  chest: { currencies: [{ currency: 'shard_sacred', amount: 1 }] },
});
```

- Position is everything: the id (`mission.03.02`), the i18n key (`mission.03.02.name`, in
  `src/i18n/en/missions.ts`) and the chapter a mission belongs to all follow from where it sits.
  The glyph follows from the goal's family, and a mission may override it (the Titan rows wear its
  eye) — nothing else is authored twice.
- The line is walked in order, so a mission is only ever *the next one*: counter goals measure from
  the moment it opens, state predicates are read live (`QUESTS_MISSIONS.md` §1). Prefer a state
  predicate for anything a chronicle could already have done — a counter goal in a late chapter
  asks the player to do it *again*.
- A chapter's chest pays currencies; the tenth chapter's is the Path's own reward and carries
  `champion` and `gearChoice` instead. The validator keeps both to the last chapter, checks that
  the champion's own definition lists `mission` in `obtain`, and refuses a `all_previous` goal
  anywhere but the last page.
- The validator also holds the shape the design promises: ten chapters of twelve, ids that match
  their position, a real stand and settlement, a real boss tier, a champion level inside the cap
  for the rank it asks for, and a counter something actually writes. Adding a goal type means
  naming its counter in `COUNTER_KEYS` and bumping it from the reducer that owns that play.

### Tutorial (`src/content/tutorial/<chapter>.ts`)

A lesson is a `step()` in the chapter it belongs to. Position decides the id (`tut.2.3`) and the
dialogue key (`tut.2.3.text`, in `src/i18n/en/tutorial.ts`), so a step is four decisions:

```ts
step({
  // When it opens. Omitted means "as soon as the one before it is done".
  when: { type: 'all', of: [{ type: 'feature', feature: 'gear' }, { type: 'screen', screen: 'hub' }] },
  // What the pointer rests on, in the order the player walks it: the furthest one present wins.
  spotlight: ['hub.champions', 'champions.roster'],
  // What stays clickable. `'all'` points without caging; omitted means "the spotlight".
  allow: 'all',
  // What finishes it.
  complete: { type: 'screen', screen: 'champions' },
})
```

- **Targets are names, not selectors.** Add one to `TUTORIAL_TARGETS` (`content/tutorial/types.ts`)
  and map it to an existing `data-testid` in `@ui/tutorial/targets.ts` — both maps are exhaustive,
  so a target only one side knows is a compile error (ADR-042). If the element has no test id yet,
  add one: that is the whole change a screen ever needs.
- **Completions are observed.** Prefer a screen, a dialog, a stand cleared or a lifetime counter —
  things the save already says. `acknowledged` (the Continue press) is for a lesson that only asks
  to be read; `clicked` is for a press that changes nothing in the save (choosing whom to raise).
- **Say where it is taught.** Every step's trigger must name a screen, a dialog or a turn of a
  fight — the validator refuses one that does not, because a lesson that can open anywhere will
  open somewhere silly, and while Eldric speaks the screen is held. A lesson that points *inside* a
  dialog names that dialog too (the Idle Chest's does), because a lesson never opens over a dialog
  it has not named.
- **Chapters open by feature**, in unlock order, and are walked one at a time; only the last
  chapter's steps stand alone (`sequential: false`). The first chapter cannot be skipped and every
  other one can — the validator holds both.
- **Grants are ids.** `provision('tutorial.routine')` reads the energy from `ENERGY_PROVISIONS`, and
  `gift('ancient_shard', …)` hands over anything else; a grant is paid once per chronicle, and a
  chapter that is waved off still pays what it carried. The validator checks that every provision in
  the balance table is handed over by the chapter it is named for, and that no step pays energy the
  table does not know.

### Champion choices (`CHAMPION_CHOICES` in `balance/campaign.ts`)

A reward that lets the player *name* a champion is a row here: the difficulty whose mastery owes
it, the rarity offered and an i18n key saying where it came from. The entitlement is derived from
the campaign's stars and only the taking is stored (ADR-032), so a row added later is owed
immediately by every chronicle that already qualifies.

## 9. Balance files (`src/content/balance/`)

| File | Contains |
| --- | --- |
| `stats.ts` | `STAR_MULT`, level factor, role templates, rarity budgets, power weights |
| `xp.ts` | champion XP curve, brew XP and the element-match multiplier, food XP by rarity and level, Tavern level gold, rank-up gold |
| `levels.ts` | what a chronicle level pays: gold per level, the gem/Ancient/Sacred steps, the energy refill switch |
| `energy.ts` | cap formula, regen seconds, refill price, overflow cap (the Eternal Key's refill price lives in `tower.ts`) |
| `battle.ts` | TM rate, DEF K, variance, status constants, turn limits, `DIFFICULTY_MULT`, `stageScale` |
| `element.ts` | strong/weak modifiers |
| `campaign.ts` | energy per band, star and defeat limits, star-chest thresholds, plate levels, gold/XP/drop rates, material ranges, first-clear, star-chest and all-3★ milestone bundles, auto-repeat tiers |
| `enemies/archetypes.ts` | the six archetype bases and their shared kits (content, not balance) |
| `gear.ts` | main/sub stat tables, level cost, refine cost, dismantle yields, craft tiers, the campaign drop's rarity table per difficulty (`DROP_RARITY_WEIGHTS`) and its star range per settlement |
| `summon.ts` | shard rates, pity, exchange prices, featured weight, rotation epoch |
| `idle.ts` | capacity bands, hourly yields, chance rolls |
| `mine.ts` | the Mine's ten levels: the chronicle level each opens at, gems and Glyph Sigils a day, the store in whole gems, and what digging to it costs (§18) |
| `dungeon.ts` | the twenty stages and two difficulties, the scale curve and enemy levels, the eight bands (stars, energy, rarity table, second-piece chance), gold/XP per run, shard odds |
| `tower.ts` | floor count, the scale curve, enemy levels, the faction cycle, key cap/regen, season length, gold/energy/brew/XP per floor, `TOWER_SHARD_ODDS` |
| `economy.ts` | starting wallet, name limits, reset hour/day, gem/gold sanity targets |
| `unlocks.ts` | player-level unlock table |

Each constant has a doc comment: what it does, what it affects, safe range.

## 10. Adding a champion model

1. Create `/game/assets/champions/<id>/` with `<id>_avatar.png` (square, ≥ 1024), `still/<id>_still.png`
   (64²), `idle/frame_000..008.png` (88², 9 frames @ 200 ms). Optional later: `attack/`, `hit/`, `cast/`
   folders with the same frame naming — the presenter uses them automatically if present.
2. Run `pnpm assets:build` → manifest gains `model.<id>` and `avatar.<id>`.
3. Set `art.facing` by looking at the still (left/right) so the presenter flips correctly.
4. Replace the placeholder reference in the champion file; remove the tint.

## 11. Sounds and visual effects

- Owner-provided sounds live under `/game/assets/music_and_sounds/{sfx,ambience_sounds,background_music}`
  and VFX sheets under `/game/assets/music_and_sounds/vfx`. They are never renamed; the pipeline
  sanitises names into manifest keys.
- Generated sounds are recipes in `tools/audio/recipes.ts`, the Portal's in
  `tools/audio/summon-recipes.ts` (synth graph + envelope + effects; the shared `Recipe` type and
  `chime` in `tools/audio/recipe.ts`); a new recipe file joins `RECIPE_SOURCES` in
  `tools/audio/build.ts`, so an edit to it re-renders. Generated VFX are recipes in `tools/vfx/recipes.ts` (one `VfxRecipe` per key, painted frame by
  frame with the soft shapes of `tools/vfx/painter.ts`, rendered as `fx.gen.<name>` strips).
  Recipes are source; rendered files are build artifacts.
- Map game events to assets in `src/audio/registry.ts` (sound keys → variants) and
  `src/render/battle/fx/registry.ts` (effect keys → sheet + scale + speed + tint + blend). The
  presenter picks casts, projectiles and hits by the caster's element; physical hits, crits,
  heals, buffs, debuffs, shields, DoT ticks, deaths and turn-meter gains have their own keys.
- Every new asset gets a row in `docs/tech/CREDITS.md`.

## 12. Tuning workflow

1. Change a balance constant or an object number.
2. `pnpm content:validate` → `pnpm test` → `pnpm sim:balance` (prints win and three-star rates per
   settlement for each reference team, then checks the bands in `tools/sim/teams.ts`).
3. When a band breaks, `pnpm sim:balance --scan` prints the enemy scale each team actually
   survives — fit `DIFFICULTY_MULT` and `stageScale` to that table rather than guessing.
4. Note the change under "Balance" in `CHANGELOG.md`; the design tables in `docs/design/` carry
   the same numbers, so update them in the same commit.

## 13. The Chronicle of Changes

The game's own news (`docs/tech/UI_DESIGN.md` §5.21). `CHANGELOG.md` is the engineering record;
this is what the player reads on the title screen and from Settings. **Every shipped version gets
a release here, in the same commit** (`CLAUDE.md` §9.3).

1. Add the release at the **top** of `RELEASES` in `src/content/changelog/index.ts`:

```ts
release('0.5.0', '2026-09-20', [
  { kind: 'added', slug: 'chronicle_of_changes', lead: true },
  { kind: 'changed', slug: 'title_layout' },
]),
```

   - `kind` is one of `added` (a new thing to do), `content` (more of a thing that exists),
     `changed` (something works better), `balance` (numbers moved) or `fixed` (it was broken).
   - `lead: true` marks a headline — the one or two lines of a release worth reading first. Most
     releases have one; a release with everything marked has nothing marked.
   - `slug` keys the string; the id and the keys are derived from the version, so nothing else to
     write.

2. Add the strings under the same prefix in `src/i18n/en/changelog.ts`:

```ts
'release.0_5_0.name': 'The Chronicle of Changes',
'release.0_5_0.chronicle_of_changes': 'The title screen now keeps a chronicle of …',
```

   Write for someone who plays the game and has never read a commit. Name the thing that changed
   and what it does for them. No file paths, no jargon, no version numbers inside a line, and
   nothing a player cannot see — a refactor that changed no behaviour is not news.

3. `pnpm content:validate` checks that every line has a string, that the id matches the version,
   and that the list really is newest first.

The releases and their strings are **not** in the first screen's bundle (ADR-049): the panel loads
them when it opens, and `registerStrings` adds the words to the dictionary before it draws. That is
why a release's keys are read with `translate` rather than the typed `t`, and why the validator and
the tests check them against `ALL_I18N_KEYS` (`src/i18n/catalog.ts`), which holds every table,
early and late. The panel's own labels (`changelog.title`, the filter chips) stay in `ui.ts`.


## 14. The Glorious Palace

The tree lives in `src/content/palace/index.ts` and is authored **once**: `RING_TEMPLATE` describes
one branch — seven rings, the nodes in each, what opens them, what they cost and what they grant —
and the file stamps it out four times, one per element. Change a row there and all four branches
move together, which is the point: the mandala is symmetric and every element is offered the same
deal (`docs/design/GLORIOUS_PALACE.md` §1).

```ts
// Ring 3 — the first point of speed, and it is dear.
[
  { name: 'vigour', parent: 0, cost: 1, grants: { hp: 100 } },
  …
  { name: 'swiftness', parent: 4, cost: 3, grants: { spd: 1 } },
],
```

- `name` is a **slug**, not a string: it becomes `palace.node.<name>` in `src/i18n/en/palace.ts`
  and the node's glyph in `src/ui/screens/palace/palace-icons.ts`. Names repeat across rings the
  way a skill tree's do — eleven names cover all 133 nodes, and the tooltip carries the numbers.
  A new name needs a string **and** a glyph; a test asserts the table matches the tree exactly.
- `parent` is the **slot** in the ring below that opens this node; ring 1 hangs off the Heart.
- `grants` is any of the eight stats. C.RATE and C.DMG are already percentages, so `critRate: 2`
  means two points of crit rate.
- `cost` is what the stat is worth, not how far out it sits: 1 for HP/ATK/DEF, 2 for RES/ACC, 3 for
  SPD/C.RATE/C.DMG, 4–5 for a capstone.

Nothing about the **geometry** belongs here. Content says which ring and slot a node sits on; the
screen turns that into pixels (`UI_DESIGN.md` §5.22), so a branch can be redrawn without touching
the data and a node can be added without picking coordinates for it.

After any change, `pnpm content:validate` checks that every node's `requires` exists, that every
node walks back to the Heart, that only the Heart carries a percentage, and that each branch still
costs `PALACE_BRANCH_COST` and adds up to `PALACE_BRANCH_TOTALS` — so a node changed here and not
in `balance/palace.ts` fails the build rather than the balance.

## 15. The Brewery

The four halls live in `src/content/brewery/index.ts` and, like the Palace, are authored **once**:
one five-stage ladder is stamped out per element, with only two tables differing per hall.

```ts
/** Which settlement's faction holds each of the five stages, per element. */
const HALL_FACTIONS: Readonly<Record<Element, readonly number[]>> = {
  justice: [3, 3, 9, 9, 11],
  …
};
```

- A hall is ~12 lines: its id, its name and blurb (i18n keys), its element, the brew it pays, its
  open days and the five stages stamped from `balance/brewery.ts`.
- **A stage's fight is derived, never authored** (`@engine/brewery/encounter`): the faction holding
  it supplies the guards and its settlement the backdrop, music and surface. So the only per-stage
  decision is *who holds it* — the row in `HALL_FACTIONS` — and everything else follows.
- Every number a stage has (its scale, its brews, its guards, its plate level, its turn limit) comes
  from `src/content/balance/brewery.ts`. Nothing about difficulty or reward is written here.
- `BREWERY_OPEN_DAYS` in that balance file holds each hall's calendar as weekdays, `0` = Sunday.
  Only the Eclipse hall keeps one today (`[3, 6, 0]`); giving another hall a calendar is one row
  there and needs no code (`USER_QUESTIONS.md` Q55).

To add a hall: give its element a row in `HALL_FACTIONS`, a brew in `BREW_BY_ELEMENT`, a calendar in
`BREWERY_OPEN_DAYS`, and a name and blurb in `src/i18n/en/brewery.ts`. `BREWERIES` maps out of
`BREWERY_BY_ELEMENT`, so nothing else has to be told.

After any change, `pnpm content:validate` checks that a hall's stages are numbered 1..5 in order,
that stage *n* pays *n* brews, that the scale ladder strictly increases, that only the last stage
carries the captain, and that **every stage's holding faction shares the hall's element** — the rule
that keeps the mode a lesson in the element wheel rather than a lottery.

Retuning the ladder is `pnpm sim:balance --brewery` (the five tiers against the five reference
teams, with bands that fail `--strict`) and `--brewery --scan` (how much room each stage has left).
`BREWERY.md` §7 is the current fit.

## 16. The Dungeons

The five keeps live in `src/content/dungeons/index.ts` and their four keepers in
`src/content/dungeons/keepers.ts`. A keep is **~14 lines of data and no authored encounters**:

```ts
const cindervault: DungeonDef = {
  id: 'dungeon.cindervault',
  slug: 'cindervault',          // the route, the testids and the save's keys all use it
  name: 'dungeon.cindervault.name',
  description: 'dungeon.cindervault.description',
  lore: 'dungeon.cindervault.lore',
  order: 1,                      // reading order on the overview, easiest first
  sets: ['gear_set.ember_guard', 'gear_set.ironhide', 'gear_set.warcry', 'gear_set.bulwark'],
  keeperId: 'enemy.cinder_warden',
  factionId: 'faction.ashen_legion',
  backdrop: 'bg.bg9',
  glyph: 'glyph.hammer_hit',
  surface: 'stone',
  version: 1,
};
```

- **A stage's fight is derived, never authored** (`@engine/dungeon/encounter`): the keeper stands on
  every stage and the faction supplies three guards as a walking window over its six, so the only
  per-keep decisions are *who holds it* and *what it sells*.
- Every number a stage has — its scale, its enemy level, its stars, its rarity table, its energy,
  its gold and XP, its shard odds — comes from `src/content/balance/dungeon.ts`. Nothing about
  difficulty or reward is written in the content file.
- **The keeper is an ordinary `defineEnemy`** with a `named` archetype; it lives in `keepers.ts`
  only so the four stay together. It is reached because its keep fields it, which is what
  `validateEnemyReach` was taught in `0.8.0`.
- `lock: 'accessories'` is the Gilded Veil: a keep whose whole reward does not exist yet ships
  **shut**, carrying its name, its story and the reason, rather than open and paying something it
  was not built to pay (`CLAUDE.md` §2.1). A locked keep holds no sets and needs no keeper.

To add a keep: write its `DungeonDef`, add it to `DUNGEONS`, give its keeper a `defineEnemy` in
`keepers.ts` and `DUNGEON_KEEPERS`, and add its name, blurb and story to `src/i18n/en/dungeons.ts`.
`DUNGEON_BY_ID`, `DUNGEON_BY_SLUG` and `OPEN_DUNGEONS` all derive from `DUNGEONS`, so nothing else
has to be told.

After any change, `pnpm content:validate` checks that ids, slugs and orders are unique and that
`id` matches `slug`, that an open keep names a keeper and a warband that exist, that a sealed one
names neither and holds no sets, and that **every gear set in the game belongs to exactly one
keep** — the rule that keeps a set from being unreachable or farmable in two places at once. It
checks the bands too: that they tile stages 1..20 on both difficulties with no gap or overlap, that
energy never falls as you go deeper, and that every star and rarity they name carries a positive
weight.

Retuning the ladder is `pnpm sim:balance --dungeon` (eight rungs of Cindervault against the five
reference teams, then the seven bands across all four keeps, failing `--strict` when one breaks)
and `pnpm sim:balance --scan --dungeon` (how much room each keep has left at the rungs the bands
name — the table a keeper is fitted against). `DUNGEONS.md` §7 is the current fit.

## 17. The Market, the consumables and the calendar

Three content folders, all plain data (`MARKET.md`, `LOGIN.md`).

### 17.1 A consumable (`src/content/consumables/index.ts`)

```ts
{
  id: 'item.brewery_token',
  name: 'item.brewery_token.name',
  description: 'item.brewery_token.description',
  icon: 'spell.rune_jade_coin',
  rarity: 'rare',                       // the frame it is drawn in, not what it does
  effect: { kind: 'brewery_runs' },
  version: 1,
}
```

`ConsumableEffect` is a **discriminated union of six kinds** — `boost`, `brewery_runs`,
`quest_reset`, `mission_skip`, `champion_level`, `champion_stars` — and `state/bag.ts` switches over
it exhaustively. A new *item* that reuses an existing kind is pure data. A new *kind* is an engine
change: add the arm to the union, the arm to that switch, the sentence it prints to
`market-view.ts`'s `outcomeLine`, and a test. That is on purpose — every consumable is a thing
that mutates a save, so no one may ship one without deciding, in the open, what it does and what it
says.

`needsChampion(def)` is how the Bag knows to open the picker rather than acting on whoever is
first; it is true for the two champion kinds and derived, never declared.

### 17.2 A shelf entry (`src/content/market/index.ts`)

`single(order, slug, price)` builds the nine that sell one consumable forever, so a repricing is one
number. A bundle is written out, carries `once: true` and may hold currencies as well as items:

```ts
{
  id: 'shelf.stewards_ledger',
  name: 'shelf.stewards_ledger.name',
  description: 'shelf.stewards_ledger.description',
  // Singly: 350 + 450 + 240 = 1,040.
  price: 750,
  once: true,
  contents: [
    { kind: 'consumable', item: 'item.daily_voucher', count: 2 },
    { kind: 'consumable', item: 'item.weekly_voucher', count: 1 },
    { kind: 'consumable', item: 'item.brewery_token', count: 2 },
  ],
  order: 12,
  version: 1,
}
```

Always leave the comment with the singly price: `content:validate` checks that a bundle is cheaper
than its parts, and the comment is what makes the price reviewable without doing the sum again.

The Gold Market has **no content file at all** — its seventeen rows, their weights, their unit
prices and their stock ranges are balance (`src/content/balance/market.ts`), because every one of
them is a number to tune rather than a thing to name.

### 17.3 A login tile (`src/content/login/index.ts`)

Thirty entries, `{ day, tier, rewards }`, using the local `c()` and `item()` helpers. The tiers are
**shuffled on purpose** and days 28–30 must all be `legendary` while nothing before them may be.

### 17.4 What the validator checks

`pnpm content:validate` refuses a build where any of these hold:

- a shelf entry names an item that does not exist, has no contents, is priced at zero or shares an
  id or an `order` with another;
- a bundle of consumables is priced at or above the sum of its parts bought singly (a bundle of
  currencies has no shelf price to compare against, so its value is judged by hand);
- a login day is duplicated, or one of the thirty is missing;
- a day before 28 is `legendary`, or one of 28–30 is not;
- a grant anywhere — shelf, bundle or tile — names a currency or an item that does not exist.

`pnpm sim:economy` adds the balance half: every shelf entry is audited against **the most gems it
can ever pay back**, and `--strict` fails on any that reaches its own price. That is the rule that
keeps the Gem Market a sink rather than a loop, and it is checked against the content, so it holds
for every player at once rather than only for the scripts.

To add an item: write the `ConsumableDef`, add it to `CONSUMABLES`, give it a `single(...)` on the
shelf (or put it in a bundle), and add its name and description to `src/i18n/en/market.ts`.
`CONSUMABLE_BY_ID`, `CONSUMABLE_IDS` and `GEM_SHELF_BY_ID` all derive, so nothing else has to be
told.

## 18. The Mine (`src/content/balance/mine.ts`)

The Mine is one table, `MINE_LEVELS`, a row per level: `{ level, opensAt, gemsPerDay, storeGems,
sigilsPerDay, cost }` (`docs/design/MINE.md` §3–§4). There is no content file: every field is a
number to tune, and the stratum names the dialog shows are strings, `mine.stratum.<level>` in
`src/i18n/en/mine.ts`.

- **Level 1** is the one a chronicle is handed. Its `opensAt` is `FEATURE_UNLOCK_LEVEL.mine`, so
  moving the Mine's unlock moves both, and its `cost` is empty.
- **The store is in whole gems.** How long it takes to fill is derived (`storeGems / gemsPerDay`
  days), and the Sigils stop with it. Keep the fill time between half a day and a day and never
  shorter than the level above — `src/engine/mine/mine.test.ts` holds the table to that, to
  strictly more gems a day and a bigger store at every level, to ascending gates and gold, and to
  Sigils only from the fourth level.
- **A level may be appended, never removed.** The save stores only the level dug
  (`mineSchema` caps it at `MINE_MAX_LEVEL`), so a removed row would leave a chronicle owning a
  Mine the table no longer describes. A new level needs its name string too.
- **Check the economy after any change.** `pnpm sim:economy --strict` books the `mine` line against
  its band and prices each script's dig to its level in days of its surplus
  (`MINE_DIG_DAYS_MAX`); a new currency in a cost also has to be listed among that currency's uses
  in `content/currencies/flows.ts`, and a new payout among its sources (`flows.test.ts` checks the
  latter both ways).


## 19. The Hall of Deeds (`src/content/deeds/`)

The Hall is four files and a balance table (`docs/design/ACHIEVEMENTS.md`):
`achievements.ts`, `challenges.ts`, `ranks.ts`, `frames.ts`, and `src/content/balance/deeds.ts`
for what a tier pays and the feats' thresholds. Titles the Hall hangs up live with the other titles
(`src/content/titles/index.ts`), naming a rank or a challenge as their condition.

- **An achievement is five goals.** `achievement({ slug, ledger, icon, place, goals })` builds the
  id (`achievement.<slug>`), the i18n keys (`.name`, `.line`) and each tier's rewards and renown
  from the tier and the ledger — a file of achievements is goals. `counts(key, [..five targets])`
  writes the common case: five `counter` goals on one lifetime counter. The targets must climb (the
  validator refuses a tier that asks for no more than the one before it).
- **A line is one sentence with the goal's numbers in it** — `{count}`, `{level}`, `{stars}`,
  `{missions}`, `{settlement}`, `{difficulty}` and nothing else (`DEED_LINE_TOKENS`). When a tier
  asks for exactly one thing, give the line a `.one` form too ("Summon an Epic champion") and the
  Hall reads it for that tier.
- **`place` is where "Go" leads** when the goal names no place of its own; a `counter` goal never
  does, so every achievement and challenge built on one names its place.
- **Nothing pays twice.** If a new mode has a top, make the top a challenge and stop the
  achievement that climbs to it a rung below (§1 of the design doc). Every goal is checked like a
  quest's: a counter the game does not write, a boss tier that does not exist or a Palace or Path
  bigger than the content is a build error.
- **A challenge** is `challenge({ slug, icon, place, goal, renown, rewards })`. A feat only a battle
  can tell needs a counter first: add `feat.<name>` to `COUNTER_KEYS`, teach `featsOf` when to write
  it (with a test), and point the challenge's `counter` goal at it.
- **Ranks** are claimed in order and must stand on climbing renown; the last may not stand on more
  than the whole Hall pays (the validator adds it up). **Frames** name a rank or a challenge as
  their `source`, one of the 32 deco frames and a tint; a frame's name is `frame.<slug>.name`.
- **Adding to the Hall later is safe**: the save keeps claims by id, so a new achievement or
  challenge simply opens — already met, if the chronicle has done the thing. Never reuse an id, and
  never lower a target a chronicle may already have claimed past.

## 20. The Unwritten (`src/content/unwritten/`)

The Unwritten is its own content bundle (`UNWRITTEN` in `index.ts`), not part of the eager registry:
it loads with the mode's screen (ADR-050), and its strings live in `src/i18n/en/unwritten.ts`, which
ships in the same chunk. The engine takes the bundle as an argument; `pnpm content:validate` reads
it directly (`validateUnwritten` in `engine/schema/unwritten.ts`). Every number a line prints comes
from the definition's own `show` table — never type a number into an Unwritten string.

- **An inscription** is `inscription({ slug, ink, rarity, icon, bearer?, volume?, values, fixed?,
  grant })` in `inscriptions/<ink>.ts`. `values` names each number's three levels (`a: [10, 15,
  20]`), `fixed` the numbers every level shares (`t: 2` turns); `grant` receives one level's numbers
  and returns the passives it writes into the company, built from the DSL's helpers (`statik`,
  `onWave`, `onHitTaken`, `onDeath`, `inflict`, `damage`, `guard`, `pct`). The line is
  `unwritten.inscription.<slug>.text` with `{a}`, `{t}` in it; the validator refuses a slot the
  `show` table cannot fill and a level that asks for less than the one before it. `bearer` is
  `'each'` (default), `'leader'` for a field-wide effect that would stack absurdly if four carried
  it, or `{ element }` for kinship. Volume I is always three Common, two Rare, two Epic and one
  Legendary per ink; `volume: 2` puts one behind the Scriptorium's *Second Volume*.
- **A blend** is an Epic `inscription` with two inks, in `inscriptions/blends.ts`, one per pair.
- **An illumination** (`inks.ts`) is `illumination({ ink, icon, glyph, colour, values, fixed?,
  grant })` with two tiers (`values: { a: [12, 20] }`) and lines `unwritten.ink.<ink>.illumination.1`
  and `.2`.
- **A relic** is `relic({ slug, icon, volume?, price, values, grant })`; its grant is rules
  (`rule('price_mult', -0.25)`), passives or both. **A blot** is `blot({ slug, icon, values, grant
  })`, an **affix** `affix({ slug, icon, values, passives })` — a mark an Elite or a Warden wears.
- **A rule** is one of the ids in `RULE_BASE` (`content/balance/unwritten.ts`), combined with its
  base by `RULE_MODE` (sum, min or max). A rule that is a share (`PERCENT_RULES`) prints ×100 in a
  line: `ruleShow` letters an Omen's or a folio's rules `a`, `b`, `c` in order, so an Omen's line
  reads `Foes have {a}% more HP.`
- **A mystery** is `mystery({ slug, art, choices })`; each choice has a `key` (its label and hint
  are `unwritten.mystery.<slug>.<key>` and `.hint`), optional `requires` (gilt by the amount; a
  relic, a fallen champion, an inscription or a blot — one of each at most, since the panel names
  one), and `outcomes` or a `gamble` (`{ chance, otherwise }`). The **last choice must always be
  open** — a mystery can always be walked away from. The hint's numbers come from the outcomes
  (`{cost}`, `{gilt}`, `{heal}`, `{wound}`, `{pages}`, `{chance}` …).
- **An Omen** is a row of `TWISTS` in `omens.ts` — its slug and its rules — in ladder order;
  `omen()` gives it its id, its scale from `OMEN_SCALE` and its line (a rung with no rules has
  none). **A Scriptorium folio** is `folio({ slug, shelf, cost, icon, rules })`; a folio may not
  cost more than the cheapest one on a higher shelf.
- **A folio of the map** (`folios.ts`) is a plain `FolioDef`: the factions it remembers, the shape
  of its waves and an Elite's escort, its Warden and the Warden's scale, and the backdrop and grade
  it is drawn on. The Wardens and their adds are enemies in `wardens.ts`, validated like any other.
- **Balance** is `content/balance/unwritten.ts`: the map's shape, the passage weights, the Omen
  curve, prices, heals, what an expedition pays. Any change to the curve is checked with
  `pnpm sim:balance --unwritten` against its bands (`tools/sim/teams.ts`).

# Content Authoring Guide

How to add or tune champions, abilities, enemies, stages, gear sets, currencies, banners, bosses,
quests, missions and tutorial steps. Everything here is data under `src/content/`; nothing needs
engine or UI changes unless a genuinely new mechanic is required.

## 1. Conventions

- Ids: `type.snake_case` — `champ.anuria`, `enemy.thornwood_cutpurse`, `stage.01.07`,
  `gear_set.ember_guard`, `boss.gravemaw`, `banner.featured`, `dq.login`, `m.3.4`, `tut.1.6`.
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
`encounter.stage.<nn>.<nn>.<difficulty>`. Period bosses derive theirs too (§3.2), so the only
authored `EncounterDef` left is the perf bench (`src/content/encounters/bench.ts`). The validator
checks enemy ids, i18n keys, the backdrop key and the party size per kind.

### 3.2 Period boss

One file per boss (`src/content/bosses/<slug>.ts`). `defineBoss` authors the kit **once** — a boss
does not fight differently on Brutal, it hits harder — and every tier becomes an `EnemyDef` with
the stats the table prints (`fixedStats`: no difficulty multiplier, no stage curve) plus a derived
`encounter.boss.<slug>.<tier>`:

```ts
export default defineBoss({
  slug: 'gravemaw',
  period: 'daily', keysPerPeriod: 2, unlockLevel: 10,
  feature: 'daily_boss', keyCurrency: 'key_daily',
  element: 'eclipse', role: 'health',
  art: { tint: '#efe6d2', scale: 2, desaturate: true },   // washed placeholder (ASSETS.md §3)
  backdrop: 'bg.bg3', surface: 'stone',
  immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],   // shown as "Unshakeable"
  enrageEvery: 2,                                                // own turns between +10 % ATK steps
  rotation: ['a1', 'a1', 'a2', 'a1', 'a3'],
  abilities: [{ slot: 'a1', key: 'bone_crush', icon: 'spell.earth_boulder_fist', prefer: 'highest_atk', effects: [...] }, …],
  passives: [{ key: 'tyrants_hide', icon: 'spell.earth_monolith', trigger: 'static', effects: [...] }],
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
`if: { selfPhaseAtLeast: 3 }` — that is how Nyxara's Un-light dims the party's healing only at the
end. Set both from measurement, not from intuition: the validator rejects a `minPhase` past the
last phase and an escort holding more than a tenth of the tier's pool, and Q41/ADR-039 record how
the shipped numbers were measured.

Ids and strings derive from the slug (`ab.gravemaw.devour.name`, `boss.gravemaw.tier.easy`) and
live in `src/i18n/en/bosses.ts`; register the file in `src/content/bosses/index.ts`. The validator
holds the promises the design makes: chest thresholds climb and end at the kill, each tier is a
bigger pool and pays more chronicle XP than the one below it, the tier enemy carries the tier's
stats, the boss's enrage cadence and its phases, the escort each tier fields is the one the boss
block points at, and the first enrage step must land inside half the ally-turn limit — the share of a race a boss actually gets to act in, so a mechanic that could never fire is
a build error (ADR-036).

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
  icon: 'spell.hero_voidguard',     // the set's crest, worn by every piece of it on every card
  grants: [{ effects: [{ kind: 'counterattack', chance: 30 }] }],
  homes: [6, 11],                   // settlements whose drops favour it (GEAR.md §5)
})
```

- `grants` is one entry per passive the complete group gives; the trigger defaults to `static`.
- A `stat_mod` is **only** read off a static passive (`BATTLE.md` §6), so a set that changes a
  stat *and* does something on a trigger needs one entry of each — see Immortal, which grants
  `+15 % HP` statically and heals on `onTurnStart`.
- Two-piece stat sets are a single entry:
  `{ effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }`.
- Every `homes` entry must name the set in that settlement's `setPool`, and every pool entry must
  name a set that exists — `pnpm content:validate` checks both directions, plus the i18n keys
  (`gear_set.<slug>.name` / `.description` in `src/i18n/en/sets.ts`) and the crest's asset key.
- A set needing a mechanic the engine does not have yet gets a new effect kind **with tests**
  first; never an `if (setId === …)` anywhere.

## 6. Currency

```ts
{ id: 'mat_glyph_sigil', name: 'currency.mat_glyph_sigil', icon: 'spell.rune-gilded-script', category: 'material', order: 24, cap: null }
```
Adding a currency: add here, add its English name, add sources/sinks to `docs/design/ECONOMY.md` §2.

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
    // 3.2 Deal 250,000 damage to Gravemaw (Easy) in a day
    mission({ type: 'boss_damage', boss: 'boss.gravemaw', tier: 'easy', amount: 250_000 }, [
      { currency: 'gems', amount: 20 },
    ]),
    …
  ],
  chest: { currencies: [{ currency: 'shard_sacred', amount: 1 }] },
});
```

- Position is everything: the id (`mission.03.02`), the i18n key (`mission.03.02.name`, in
  `src/i18n/en/missions.ts`) and the chapter a mission belongs to all follow from where it sits.
  The glyph follows from the goal's family, and a mission may override it (the Nyxara rows wear her
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

### Tutorial (`src/content/tutorial/chapter_<n>.ts`)

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
| `energy.ts` | cap formula, regen seconds, refill price, overflow cap |
| `battle.ts` | TM rate, DEF K, variance, status constants, turn limits, `DIFFICULTY_MULT`, `stageScale` |
| `element.ts` | strong/weak modifiers |
| `campaign.ts` | energy per band, star and defeat limits, star-chest thresholds, plate levels, gold/XP/drop rates, material ranges, first-clear, star-chest and all-3★ milestone bundles, auto-repeat tiers |
| `enemies/archetypes.ts` | the six archetype bases and their shared kits (content, not balance) |
| `gear.ts` | main/sub stat tables, level cost, refine cost, dismantle yields, craft tiers |
| `summon.ts` | shard rates, pity, exchange prices, featured weight, rotation epoch |
| `idle.ts` | capacity bands, hourly yields, chance rolls |
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
- Generated sounds are recipes in `tools/audio/recipes.ts` (synth graph + envelope + effects);
  generated VFX are recipes in `tools/vfx/recipes.ts` (one `VfxRecipe` per key, painted frame by
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

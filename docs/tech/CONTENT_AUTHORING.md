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

```ts
export default defineEnemy({
  id: 'enemy.thornwood_cutpurse', name: 'enemy.thornwood_cutpurse.name',
  archetype: 'raider', element: 'valor', faction: 'thornwood_bandits',
  overrides: { stats: { spd: 94 } },                      // optional tweaks on the archetype base
  abilities: 'archetype',                                  // or an explicit list like champions
  art: { model: 'model.placeholder_lizard', tint: '#8b5a2b', scale: 1 },
});
```
Archetype bases and scaling are in `balance/enemies.ts` (see `docs/design/CAMPAIGN.md` §5).

## 4. Settlement and stages

```ts
export default defineSettlement({
  id: 'settlement.thornwood_crossing', number: 1, name: '…', backdrop: 'bg7', tint: null,
  faction: 'thornwood_bandits', dominantElement: 'valor', sets: ['gear_set.ember_guard', 'gear_set.warcry'],
  boss: 'enemy.redcap_halvar',
  stages: [
    { number: 1, waves: [['enemy.thornwood_cutpurse','enemy.thornwood_cutpurse'], ['enemy.thornwood_cutpurse','enemy.thornwood_poacher','enemy.thornwood_cutpurse']] },
    …
    { number: 10, waves: [[…],[…],['enemy.redcap_halvar','enemy.thornwood_shieldbearer','enemy.thornwood_shieldbearer']], turnLimit3Star: 30, turnLimitDefeat: 50 },
  ],
});
```
Difficulty variants are derived; add `overrides: { hard: { stages: { 10: { waves: … } } } }` when needed.

## 5. Gear set

```ts
export default defineGearSet({
  id: 'gear_set.retaliation', name: '…', pieces: 4, icon: 'spell.crest-warded-shield',
  bonus: { trigger: 'onHitTaken', chance: 30, effects: [{ kind: 'counterattack' }] },
});
```
Two-piece stat sets use `{ trigger: 'static', effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }`.

## 6. Currency

```ts
{ id: 'mat_glyph_sigil', name: 'currency.mat_glyph_sigil', icon: 'spell.rune-gilded-script', category: 'material', order: 24, cap: null }
```
Adding a currency: add here, add its English name, add sources/sinks to `docs/design/ECONOMY.md` §2.

## 7. Boss, banner, quests, missions, tutorial

See the "Content shape" sections of `docs/design/BOSSES.md`, `SUMMONING.md`,
`QUESTS_MISSIONS.md`, `TUTORIAL.md`. All use the same `define*` helpers and validation.

## 8. Balance files (`src/content/balance/`)

| File | Contains |
| --- | --- |
| `stats.ts` | `STAR_MULT`, level factor, role templates, rarity budgets, power weights |
| `xp.ts` | champion XP curve, player XP curve, brew values, food values |
| `energy.ts` | cap formula, regen seconds, refill price, overflow cap |
| `battle.ts` | TM rate, DEF K, variance, status constants, turn limits |
| `element.ts` | strong/weak modifiers |
| `enemies.ts` | archetype bases, difficulty multipliers, stage growth, boss multipliers |
| `drops.ts` | campaign reward formulas, rarity/star tables by difficulty, first-clear, star chests |
| `gear.ts` | main/sub stat tables, level cost, refine cost, dismantle yields, craft tiers |
| `summon.ts` | shard rates, pity, exchange prices, featured weight, rotation epoch |
| `idle.ts` | capacity bands, hourly yields, chance rolls |
| `economy.ts` | rank-up gold, tavern gold, reset hour/day, gem/gold sanity targets |
| `unlocks.ts` | player-level unlock table |

Each constant has a doc comment: what it does, what it affects, safe range.

## 9. Adding a champion model

1. Create `/game/assets/champions/<id>/` with `<id>_avatar.png` (square, ≥ 1024), `still/<id>_still.png`
   (64²), `idle/frame_000..008.png` (88², 9 frames @ 200 ms). Optional later: `attack/`, `hit/`, `cast/`
   folders with the same frame naming — the presenter uses them automatically if present.
2. Run `pnpm assets:build` → manifest gains `model.<id>` and `avatar.<id>`.
3. Set `art.facing` by looking at the still (left/right) so the presenter flips correctly.
4. Replace the placeholder reference in the champion file; remove the tint.

## 10. Sounds and visual effects

- Owner-provided sounds live under `/game/assets/music_and_sounds/{sfx,ambience_sounds,background_music}`
  and VFX sheets under `/game/assets/music_and_sounds/vfx`. They are never renamed; the pipeline
  sanitises names into manifest keys.
- Generated sounds are recipes in `tools/audio/recipes/<key>.ts` (synth graph + envelope +
  effects); generated VFX are recipes in `tools/vfx/recipes/<key>.ts` (procedural frames).
  Recipes are source; rendered files are build artifacts.
- Map game events to assets in `src/audio/registry.ts` (sound keys → variants) and
  `src/render/fx/registry.ts` (effect keys → sheet + fps + anchor + blend). Abilities reference
  effect keys (`fx: 'valor.fireball'`) and optional sound keys; defaults come from the element.
- Every new asset gets a row in `docs/tech/CREDITS.md`.

## 11. Tuning workflow

1. Change a balance constant or an object number.
2. `pnpm content:validate` → `pnpm test` → `pnpm sim:balance` (prints the difficulty curve and
   flags stages outside their target win-rate band).
3. Note the change under "Balance" in `CHANGELOG.md`.

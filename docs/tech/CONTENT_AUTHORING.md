# Content Authoring Guide

How to add or tune champions, abilities, enemies, stages, gear sets, currencies, banners, bosses,
quests, missions and tutorial steps. Everything here is data under `src/content/`; nothing needs
engine or UI changes unless a genuinely new mechanic is required.

## 1. Conventions

- Ids: `type.snake_case` — `champ.anuria`, `enemy.thornwood_cutpurse`, `stage.01.07`,
  `gear_set.ember_guard`, `boss.gravemaw`, `banner.featured`, `dq.login`, `m.3.4`, `tut.1.6`.
- One object per file; file name = id without the type prefix. Files are collected by
  `registry.ts` using `import.meta.glob('./**/*.ts', { eager: true })`.
- Text is an i18n key; English strings live in `src/i18n/en/<domain>.ts`. Descriptions may use
  placeholders resolved from the ability's current numbers: `"Deals {dmg} damage and has a {chance}% chance to place [DEF Down] for {turns} turns."`.
- Numbers that are *balance* (curves, multipliers, costs, rates) live in `src/content/balance/`
  and are referenced by name; per-object numbers (an ability's multiplier) live in the object.
- Run `pnpm content:validate` after every change; it also runs in `pnpm test` and at dev boot.

## 2. Champion

```ts
// src/content/champions/anuria.ts
import { defineChampion } from '@content/define';

export default defineChampion({
  id: 'champ.anuria',
  name: 'champ.anuria.name',                 // i18n key
  rarity: 'epic', element: 'justice', role: 'attack',
  stats: { hp: 13200, atk: 1480, def: 880, spd: 104, critRate: 15, critDmg: 60, res: 25, acc: 10 },
  art: { model: 'model.anuria', avatar: 'avatar.anuria', facing: 'left' },
  obtain: ['summon'],
  abilities: [
    { slot: 'a1', id: 'ab.anuria.silver_arrow', name: 'ab.anuria.silver_arrow.name', cooldown: 0,
      effects: [
        { kind: 'damage', target: 'single_enemy', mult: 3.5, stat: 'ATK' },
        { kind: 'apply_status', target: 'single_enemy', status: 'def_down', value: 30, turns: 2, chance: 30 },
      ],
      upgrades: [{ type: 'damage', value: 5 }, { type: 'chance', value: 10 }],
      ai: { priority: 1 } },
    { slot: 'a2', id: 'ab.anuria.piercing_volley', cooldown: 4,
      effects: [{ kind: 'damage', target: 'all_enemies', mult: 2.6, stat: 'ATK', defIgnore: 0.2 }],
      upgrades: [{ type: 'damage', value: 5 }, { type: 'damage', value: 5 }, { type: 'cooldown', value: 1 }],
      ai: { priority: 3, when: { enemiesAlive: { gte: 3 } } } },
    { slot: 'a3', id: 'ab.anuria.heartseeker', cooldown: 5,
      effects: [{ kind: 'damage', target: 'single_enemy', mult: 6.8, stat: 'ATK', guaranteedCritIf: { targetHasAnyDebuff: true } }],
      upgrades: [{ type: 'damage', value: 5 }, { type: 'damage', value: 10 }, { type: 'cooldown', value: 1 }],
      ai: { priority: 4 } },
  ],
  passive: { id: 'ab.anuria.rangers_focus', trigger: 'static',
    effects: [{ kind: 'damage_bonus', value: 0.15, scope: 'crit', if: { targetHas: 'def_down' } }] },
  lore: 'champ.anuria.lore',
  version: 1,
});
```

Checklist: stats within ±15 % of the role template × rarity budget (validator warns), ability
count matches rarity, every status id exists, every `mult` positive, `art` keys exist in the
manifest (placeholder model: `model.placeholder_lizard` with `tint: '#7a8a5a'`).

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

## 10. Tuning workflow

1. Change a balance constant or an object number.
2. `pnpm content:validate` → `pnpm test` → `pnpm sim:balance` (prints the difficulty curve and
   flags stages outside their target win-rate band).
3. Note the change under "Balance" in `CHANGELOG.md`.

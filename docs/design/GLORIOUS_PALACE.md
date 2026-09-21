# The Glorious Palace

An account-wide skill tree. Every point spent in it lifts **every champion of one element** the
chronicle owns — a little, permanently, for the rest of the game. It is the one progression system
that does not care which champions you happen to have pulled.

The Palace is deliberately small in what it gives and long in what it asks. A whole branch is worth
about one good piece of gear spread across a quarter of the roster; finishing the tree is a project
measured in months of campaign, tower and boss clears. What it sells is not power — it is the
feeling that yesterday's clear made the whole chronicle permanently stronger.

Numbers: `src/content/balance/palace.ts`. The tree: `src/content/palace/index.ts`.
Screen: `docs/tech/UI_DESIGN.md` §5.22. Engine: `src/engine/palace/`.

---

## 1. The shape of it

One **Heart** at the centre, and four branches growing out of it along the compass, one per element:

| Direction | Branch |
| --- | --- |
| North | Justice |
| East | Valor |
| South | Eclipse |
| West | Faith |

The Heart is the only node that touches every champion: **+1 % HP** (`PALACE_CORE_HP_PCT`) to the
whole roster, whatever their element. It costs one point and it is the only node a fresh chronicle
can reach — everything else grows outward from it.

Each branch is **7 rings, 33 nodes, 59 points** (`PALACE_BRANCH_COST`). The four branches are the
same shape on purpose: the tree reads as a symmetric mandala, and a Faith player and an Eclipse
player are offered exactly the same deal. The whole tree is **237 points** (`PALACE_TREE_COST`).

A node opens when the node it hangs off is bought. Rings are not gates: two neighbouring nodes in
the same ring can be opened by different parents, so a player can take one path out through a
branch and leave the rest dark.

### 1.1 The rings

Ring by ring, per branch (the shape is authored once in `RING_TEMPLATE` and stamped four times):

| Ring | Nodes | What it holds |
| --- | --- | --- |
| 1 | 3 | +50 HP, +8 ATK, +8 DEF |
| 2 | 5 | +75 HP ×2, +10 ATK, +10 DEF, +5 RES |
| 3 | 6 | +100 HP ×2, +14 ATK, +14 DEF, +5 ACC, **+1 SPD** |
| 4 | 6 | +125 HP ×2, +18 ATK, +18 DEF, +10 RES, **+2 % C.RATE** |
| 5 | 5 | +150 HP, +22 ATK, +22 DEF, +8 ACC, **+3 % C.DMG** |
| 6 | 5 | +200 HP, +28 ATK, +28 DEF, **+2 SPD**, **+3 % C.RATE** |
| 7 | 3 | **Crown of Glory** (+500 HP, +50 ATK, +50 DEF), **Quickened Oath** (+3 SPD, +10 RES), **Sharpened Malice** (+5 % C.DMG, +7 ACC) |

A whole branch comes to exactly `PALACE_BRANCH_TOTALS`, and a test holds it there:

| Stat | Whole branch |
| --- | --- |
| HP | 1,500 |
| ATK | 150 |
| DEF | 150 |
| SPD | 6 |
| C.RATE | 5 % |
| C.DMG | 8 % |
| RES | 25 |
| ACC | 20 |

### 1.2 What a node costs

Cost says what a stat is worth, not how far out it sits (the owner's brief):

| Points | Nodes |
| --- | --- |
| 1 | HP, ATK and DEF on the way past |
| 2 | RES and ACC, and ATK/DEF out on ring 6 |
| 3 | SPD, C.RATE and C.DMG — the reason to keep going |
| 4–5 | The three ring-7 capstones, each worth a whole inner ring |

C.RATE and C.DMG are the smallest numbers in the tree and the dearest nodes to reach: **5 % crit
rate and 8 % crit damage** is everything a maxed branch has of them, and no single node gives more
than 3 % of either.

---

## 2. Where the points come from

Four sources, all of them *content you have finished* (`PALACE_POINT_SOURCES`):

| Source | Points | How often |
| --- | --- | --- |
| A settlement's boss stand falls | 1 | Once per settlement per difficulty — **36 over the whole campaign** |
| The Eternal Tower, every fifth floor | 1 | Per fifth floor, **again each season** |
| The daily boss's pool emptied | 1 | Once a day |
| The weekly boss's pool emptied | 3 | Once a week |

The campaign's 36 are the one-time backbone; the tower is what keeps the tree moving once the
campaign has run out of settlements. A player clearing both bosses every period and pushing the
tower earns roughly 10–14 points a week, so the 201 points the campaign does not cover are about
four months of steady play — a long haul you can actually finish rather than an ornament
(the owner's answer, `USER_QUESTIONS.md` Q50).

Nothing is derived from today's progress: `earned` is a stored running total, because two of the
four sources repeat and no amount of looking at a save can recover what last month paid. What *is*
derived is `spent` — always the sum of what is bought — which is what makes the reset free of
bookkeeping (`CLAUDE.md` §5.5).

Each source keeps its own watermark so nothing is ever paid twice:

- `settlementsPaid`: `"<difficulty>.<settlement>"` for each stand that has paid.
- `tower`: `{ season, floorPaid }` — the highest floor paid in that season. A new season resets it.
- `bossesPaid`: `{ [bossId]: periodKey }` — the period each boss last paid for.

A chronicle that finished settlements before the Palace existed is paid on the spot: the save's
14 → 15 migration walks the campaign and back-pays every boss stand already cleared.

---

## 3. What a node gives

The Palace is the **last** layer of a champion's stats:

```
base(star, level)  →  + gear flat  →  × (1 + gear % + set %)  →  + palace
```

Adding it before the percentages would let gear multiply it, which is how a "small permanent floor"
quietly turns into a second set of gear. It stays a flat sum — and that flat sum is exactly the
number the purple line on the champion's sheet prints.

The Heart's percentage is taken off the champion's **base** HP for the same reason: a Palace that
scaled with gear would scale with itself.

A champion only ever sees its own element's branch, plus the Heart. An Eclipse champion gets
nothing from the Valor branch however deep it goes.

---

## 4. Reclaiming

Free, any time, as often as you like (the owner's answer, Q52). "Reclaim all points" darkens the
whole tree and hands every spent point back; nothing is lost and nothing is charged. There is no
partial refund — the tree is all or nothing, which keeps the rule one sentence long and the
bookkeeping at zero.

---

## 5. Getting in

The Palace is a building on the Emberhold artwork — the lit keep on the hill — and it opens when
**the first settlement falls** (the owner's answer, Q53), not at a player level. Before that the
building wears a lock and says so.

---

## 6. In the save

```ts
palace: {
  nodes: string[];              // bought node ids
  earned: number;               // running total of points ever earned
  settlementsPaid: string[];    // "intro.3"
  tower: { season: number; floorPaid: number };
  bossesPaid: Record<string, string>;
}
```

`spent` and `available` are never stored: they are `palaceLedger(earned, nodes)`.

---

## 7. Tuning

Everything that decides how strong or how long the Palace is lives in
`src/content/balance/palace.ts`:

- `PALACE_POINT_SOURCES` — what each source pays.
- `PALACE_BRANCH_TOTALS` — what a maxed branch is worth, held by a test.
- `PALACE_BRANCH_COST` / `PALACE_TREE_COST` — how long the haul is.
- `PALACE_CORE_HP_PCT` — the Heart.
- `PALACE_BRANCH_DIRECTIONS` — which way each branch grows on the screen.

To change what a node grants, edit `RING_TEMPLATE` in `src/content/palace/index.ts` and move the
matching figure in `PALACE_BRANCH_TOTALS`; `pnpm content:validate` fails if a branch no longer adds
up to it, which is how a change made in one place and forgotten in the other gets caught.

# BREWERY.md — The Brewery

Related: `ECONOMY.md` §3.1 (what a brew is worth), `CHAMPIONS.md` §1 (the element wheel),
`CAMPAIGN.md` (the factions that hold the cellars), `BATTLE.md` §4.5 (enemy scaling),
`docs/tech/UI_DESIGN.md` §5.23 (the screen).

The Brewery is where **brews** come from. A brew is a champion's experience (`ECONOMY.md` §3.1:
1,700 XP, ×1.5 when its element matches), and until the Brewery there was no way to farm the one
your roster actually needed — the campaign drops the brew of the settlement you happen to be
standing in, and the boards and bosses pay a trickle of whatever they pay.

Four halls, one per element. Five stages each, pitched at the five points of a chronicle's life.
Twenty runs a day, **shared by all four halls**, so a day in the Brewery is the question *which
element needs brews most* — which is the decision the mode is made of (the owner's brief).

Shipped in `0.7.0`.

---

## 1. Opening it

The Brewery opens at **player level 3** (`FEATURE_UNLOCK_LEVEL.brewery`). It is the earliest mode
after the campaign itself, because brews are what a champion levels on: a player who has just been
given three champions needs somewhere to feed them.

It is reached from **Battle → Game Modes**, beside the campaign, the two bosses and the tower. Its
card carries the day's runs and how many halls are brewing today, the way the boss cards carry
their keys.

## 2. The four halls

| Hall | Element | Brew | Open |
| --- | --- | --- | --- |
| The Gilded Cask | Justice | Justice Brew | every day |
| The Ember Vats | Valor | Valor Brew | every day |
| The Frostwell Cellar | Faith | Faith Brew | every day |
| The Waning Cellar | Eclipse | Eclipse Brew | **Wednesday, Saturday, Sunday** |

The Waning Cellar's calendar is the owner's rule: the Eclipse hall brews the middle of the week and
the whole of the weekend, and is barred the other four days. A barred hall takes no run — the screen
says when it opens and the button is dead, so a closed door can never cost a player anything.

The weekday is the **player's own** (`gameWeekday`, shifted by the daily reset hour like every other
period key), so the hall opens when their Wednesday starts and closes when their Thursday does.

Each hall's guards are held by the factions of that element — Justice by the Greyhaven Corsairs, the
Gladiator Shades and the Citadel Knights, and so on — which makes the mode the place the element
wheel is taught: `CHAMPIONS.md` §1 says Justice beats Valor, and the Ember Vats say so in as many
words ("Bring Justice champions"). Eclipse is the element nothing counters, so the Waning Cellar
says that instead. A content rule enforces it: **every stage's holding faction shares its hall's
element** (`validateBrewery`).

## 3. A stage's fight

A stage is not authored. Its fight is derived from the faction holding it, exactly as a tower floor
is derived from its number (`@engine/brewery/encounter`):

- **One wave**, never a gauntlet: twenty runs a day have to fit in an evening.
- The guards are a **walking window** over the faction's six units — the window moves by one per
  stage, so two stages held by the same faction are never the same fight and every archetype takes
  its turn.
- Stage 5 fields the faction's **named captain** plus two of its own, which is why it fields fewer.
- The backdrop, music and surface are the holding settlement's, so a hall reads as a descent
  through places the player already knows.
- Party size 3 (`PARTY_SIZE_CAMPAIGN`), the campaign's shape rather than a boss's four.

The encounter is pitched at Intro's flat multiplier and stage index 0 on purpose: `stageScale` and
`DIFFICULTY_MULT` both come out at 1, which leaves the stage's own `scale` as **the single curve
acting on a brewery guard**. One number decides how hard a stage is.

## 4. The ladder

Stage *n* opens when stage *n−1* is cleared — per hall, so four ladders are climbed independently.
A stage already cleared pays in full every time it is run, because that is what the Brewery is for.

| Stage | Pitched at | Enemy scale | Guards | Plate level | Pays |
| --- | --- | --- | --- | --- | --- |
| 1 | Starting out | ×1 | 2 | 8 | 1 brew |
| 2 | Early game | ×2.8 | 3 | 20 | 2 brews |
| 3 | Mid game | ×6 | 4 | 34 | 3 brews |
| 4 | Late game | ×15 | 4 | 48 | 4 brews |
| 5 | Endgame | ×34 | captain + 2 | 60 | 5 brews |

Stage *n* pays *n* brews — the owner's rule, and the whole reward curve. Turn limits are the
campaign's (40 ally turns, 50 on the captain's stage), and time running out is a defeat.

Numbers live in `src/content/balance/brewery.ts`; §7 is how they were fitted.

## 5. The twenty runs

One run is charged **before** the fight, like the campaign's energy and the tower's key, so a reload
mid-battle cannot buy a free attempt — and a defeat costs a run, which is what makes choosing a
stage a decision rather than a formality. A run costs **no energy**: the twenty are the only price
(`USER_QUESTIONS.md` Q54).

The twenty are shared by every hall. The ledger is one counter and one period key, read at the door:

```ts
brewery: {
  periodKey: string;                  // the game day the count below belongs to
  runs: number;                       // runs spent that day
  cleared: Record<string, number>;    // hall id → deepest stage cleared
}
```

A record from an older day reads as a fresh one, so the reset costs nothing and needs nothing to run
while the game is closed — the same trick the bosses' keys and the tower's season use. `cleared`
outlives the day, because a ladder is progress rather than an allowance.

Shipped in save **v16**. The migration writes an empty day (`periodKey: ''`, `runs: 0`,
`cleared: {}`): there is nothing to back-pay, because a chronicle that has never been in the
Brewery has cleared nothing in it.

## 6. What a run says

A finished run reports in its own panel on the battle result, beside the boss's and the tower's: the
hall and stage, one cask per brew poured, the first clear that opened the next stage, and the runs
left today. A defeat says the guards held and that the run is spent either way. The primary button
goes **back to the hall the run was spent in**, so the next of the day's runs is one click.

## 7. Balance

The five stages are fitted against `pnpm sim:balance --brewery`, which runs every hall and stage
against the five reference teams in `tools/sim/teams.ts`, and `--brewery --scan`, which measures the
factor on the shipped scale at which each team still wins 85 % of its runs.

The fit puts each stage just under the line of the team it is pitched at — a farm for that tier, a
wall for the tier below — except stage 1, which sits far under it because day one must not be a coin
flip. Measured (16 runs a stage, hardest hall):

| | stage 1 | stage 2 | stage 3 | stage 4 | stage 5 |
| --- | --- | --- | --- | --- | --- |
| starter, level 10 | 100 % | ≤ 13 % | 0 % | 0 % | 0 % |
| starter at its star caps | 100 % | 88–100 % | 0 % | 0 % | 0 % |
| mid Epic, 4★40 ungeared | 100 % | 100 % | 100 % | 0 % | 0 % |
| late game, 5★50 half-geared | 100 % | 100 % | 100 % | 100 % | 0 % |
| endgame, 6★60 geared | 100 % | 100 % | 100 % | 100 % | 100 % |

`BREWERY_BANDS` in `tools/sim/teams.ts` is that staircase written down, and `--strict` fails when
one breaks — so a balance edit that walls a tier out of its own stage cannot ship. A `min` band is
checked against the hall where it is *hardest* to keep and a `max` band against the hall where it is
*easiest*, because the four halls are held by four different factions: they measure within ~10 % of
each other at stages 1–4, and only stage 5 spreads, its four captains being four authored kits.

The sim's endgame team carries no Palace, no optimised six-piece set and no element advantage, all
three of which a real endgame roster brings — so stage 5 sitting at the top of its reach in the
hardest hall is a finished player's comfortable farm and a late-game player's wall.

`pnpm sim:economy` reports the brews a scripted month pays and where they came from. The Brewery is
the main source at every activity level — a casual day's six runs pour 12 brews against the
campaign's ~5, and an active day's twenty pour 60 against ~10 — and it is the *only* source at
volume for the elements the player's own stand does not drop. Two bands guard that: `brew_valor` ≥
12 a day and `brew_eclipse` ≥ 4 a day for the active player, the second of which is the Waning
Cellar's three days still being enough to rank an Eclipse champion.

## 8. Counters

`brewery.runs`, `brewery.cleared`, `brewery.brews` and `brewery.runs.<hall id>`, so quests and the
mission line can name the Brewery later.

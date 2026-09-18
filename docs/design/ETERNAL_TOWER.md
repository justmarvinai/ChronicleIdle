# ETERNAL_TOWER.md — The Eternal Tower

Related: `CAMPAIGN.md` (the campaign it follows), `BATTLE.md` §4.5 (enemy scaling),
`ECONOMY.md` §5 (energy and keys), `SUMMONING.md` (the shards it drops),
`docs/tech/UI_DESIGN.md` §5.13a (the screen).

The tower is the first mode that **outlasts the campaign**. A player who has cleared Intro has run
out of first clears; the tower gives them a hundred floors that keep getting harder, a resource
that paces a sitting rather than a day, and a reason to come back every thirty days.

Shipped in `0.2.0`.

---

## 1. Opening it

The tower opens when the **whole Intro campaign** is behind the player: all twelve settlements,
all ten stands each, cleared on Intro (`isDifficultyComplete(progress, 'intro')`).

This is a **progress** gate, not a level gate. `FEATURE_UNLOCK_LEVEL.eternal_tower` is 1 so that
the level gate never speaks for it — the Game Modes card and the route both ask the campaign
instead. A player who grinds levels without clearing the campaign does not get in, and a player
who clears the campaign does, whatever their level.

## 2. The climb

One hundred floors, climbed **in order**. Floor *n* opens when floor *n−1* is cleared.

Three facts are stored and everything else is read off them: when the season began, how high the
climb has got, and the best it has ever got. Because floors are taken in order, the highest floor
cleared is the whole record — there is no per-floor list to keep in step with it.

| Floor state | Meaning |
| --- | --- |
| **Sealed** | Above the climb. No key may be spent. |
| **Open** | The one floor the climb has reached. |
| **Cleared** | Behind the player, and an ordinary floor: nothing left to take. |
| **Repeatable** | Behind the player, and a boss floor: it may be fought again, for its shards. |

**Ordinary floors are one-time.** Boss floors are not: they are the only floors that may be fought
again, and the shard odds are why.

## 3. A floor's fight

A floor is authored nowhere. Everything it fields is a pure function of its number
(`@engine/tower/encounter.ts`), so adding floors 101–200 later is a change to `TOWER_FLOORS` and
nothing else.

- **Who holds it.** The twelve campaign factions cycle as the tower climbs (`towerFaction`), so a
  floor looks like somewhere the player has been and the tower needs no art of its own.
- **What stands on it.** Four of the faction's six units on an ordinary floor, in a window that
  walks by one per floor so two floors of the same faction are never the same fight. A boss floor
  fields the faction's named boss flanked by two of its own.
- **One wave.** A key buys a fight, not a gauntlet.
- **Party of four**, as boss fights are (owner's answer Q2).
- **Turn limit** 40, or 50 on a boss floor. Running out of turns loses the floor.

### Scaling

The encounter is pitched at **Intro's flat multiplier and stage index 0** on purpose:
`DIFFICULTY_MULT.intro` and `stageScale(0)` both come out at 1, which leaves `towerScale(floor)` as
the *only* curve acting on a tower enemy. One number decides how hard a floor is.

```
towerScale(floor) = TOWER_SCALE_BASE × TOWER_SCALE_GROWTH ^ (floor − 1)
                  = 5 × 1.0326 ^ (floor − 1)
```

| | Multiplier on the archetype base |
| --- | --- |
| Campaign, Intro's last stand | 4.8 (`1.0 × stageScale(119)`) |
| **Tower floor 1** | **5.0** |
| Campaign, Hard's last stand | 28.8 (`6.0 × stageScale(119)`) |
| **Tower floor 50** | **24.1** |
| **Tower floor 100** | **≈120** — about four times the campaign's hardest |

The curve simply carries on for floors added later; it is defined per floor, not between endpoints,
so growing `TOWER_FLOORS` never retunes an existing floor.

## 4. What a floor pays

Gold, energy, brews and XP are certain and derived from the floor. The shards are the only rolled
part, and only on boss floors.

| Reward | Ordinary floor | Boss floor |
| --- | --- | --- |
| Gold | `600 × 1.045^(floor−1)` — 600 at floor 1, ≈46,800 at floor 100 | ×3 (≈140,500 at floor 100) |
| Energy | 1–5, a step every twenty floors | same |
| Universal Brew | `1 + ⌊(floor−1)/25⌋` — 1 at floor 1, 4 from floor 76 | same |
| Element brew | — | 3 of the faction's element |
| Chronicle XP | `40 + 4 × (floor−1)` | ×3 |
| Champion XP | `300 + 30 × (floor−1)` | ×3 |
| Shards | — | see §5 |

A full climb to floor 100 is **1,334,407 gold** and exactly **300 energy** over a season — about an
eighth of what the campaign pays over the same thirty days (`ECONOMY.md` §8), which is the size a
second source should be. Brews are the point as much as the gold: the same climb hands over **250
Universal Brews** and **30 element brews** (three on each of the ten boss floors), which is what
levels the champions the next floor needs. It also pays 28,920 chronicle XP and 216,900 champion XP
to each champion that fought.

A **defeat pays nothing**, and the key is already spent.

## 5. The shards (the owner's table)

Every boss floor rolls for shards. Two independent rolls, so a floor deep enough can pay both —
which is the point of climbing past 50.

| Boss floor | Ancient Shard | Sacred Shard |
| --- | --- | --- |
| 10 | 0.1 % | — |
| 20 | 0.25 % | — |
| 30 | 0.5 % | — |
| 40 | 0.75 % | — |
| 50 | 1 % | 0.05 % |
| 60 | 1.5 % | 0.1 % |
| 70 | 2 % | 0.15 % |
| 80 | 2.5 % | 0.25 % |
| 90 | 4 % | 0.5 % |
| 100 | 5 % | 0.65 % |

**The table does not keep climbing.** Floors above its last row keep that row's odds — floor 110
rolls floor 100's chances (the owner's instruction). The rolls are seeded like every other roll in
the game, so the same clear always pays the same thing and a tuning pass can be simulated.

## 6. The Eternal Key

| | |
| --- | --- |
| Cost | 1 per attempt, won or lost |
| Cap | 10 |
| Regeneration | 1 every 15 minutes, up to the cap |

The key is charged **before** the fight — like the campaign's energy and the boss's own keys — so a
crash or a reload mid-battle cannot buy a free attempt.

**Above the cap.** Regeneration stops at ten; a *grant* does not, and a chronicle may sit at 16/10
with the clock frozen until spending drops it back under. This is the same mechanism as energy
(`@engine/economy/pool.ts` is that mechanism, and energy is a thin call into it). Nothing grants
keys yet, so nobody reaches 16/10 in `0.2.0` — the display and the arithmetic are ready for the
first source that does (`USER_QUESTIONS.md` Q49).

Ten keys is ten floors in a sitting, and four more an hour after that. Over a thirty-day season
regeneration alone is ~2,880 keys, far more than a hundred floors need: the key paces a *session*,
not the season.

## 7. The season

The tower **resets every thirty days** and is climbed again. The climb goes back to the foot of the
tower; the best floor ever reached is kept, as a boss record outlives its period.

The season is anchored to the **first floor the chronicle ever attempts**, not to a calendar epoch.
A global epoch would reset a new player's tower two days after they unlocked it
(`USER_QUESTIONS.md` Q47). `firstAttemptAt` is 0 until that first attempt, so a save migrated today
and opened in a month still gets a full thirty days.

It runs in whole thirty-day steps from there, so a chronicle closed for three months resumes **on a
season boundary** rather than mid-season — the same discipline as the boss period and the Idle
Chest (ADR-033). Nothing has to run while the game is closed; the state is read at the door.

## 8. Save data

```ts
tower: {
  firstAttemptAt: number;   // the season anchor; 0 until the first attempt, and it never moves
  climbSeason: number;      // which season (0-based, from the anchor) the climb below belongs to
  highestFloor: number;     // in `climbSeason`
  bestFloor: number;        // ever; outlives the season
  keys: { value: number; lastTickAt: number };
}
```

The climb carries the **index of the season it belongs to**, exactly as a boss's record carries its
period key: a climb from an older season reads as an empty one, so the reset costs nothing and
happens at the door. Because the anchor itself never moves, the season's *number* stays honest —
it is the distance from the anchor rather than a counter a reset could lose.

Shipped in save **v14**. The migration writes `firstAttemptAt: 0` deliberately rather than `now`:
a season a chronicle has not started yet must not already be running down. `key_eternal` joins the
wallet in the same step, because the wallet holds a row per currency.

## 9. Counters

`tower.attempts`, `tower.cleared`, `tower.bosses`, `tower.floor.<n>` and `tower.best` (a maximum,
written rather than added to), so quests and the mission line can name the tower later.

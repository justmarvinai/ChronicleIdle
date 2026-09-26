# DUNGEONS.md — The Dungeons

Related: `GEAR.md` (what a piece is, and where each rarity comes from), `CAMPAIGN.md` §7 (the
campaign's own drops), `ECONOMY.md` §5 (energy), `BATTLE.md` §4.5 (enemy scaling),
`docs/tech/UI_DESIGN.md` §5.24 (the screens).

The Dungeons are where **gear** comes from. The campaign drops a trickle of modest pieces as you
walk it (`CAMPAIGN.md` §7); a dungeon is where you go when you want a *particular* set, at a
*particular* star, and are willing to pay for it.

Five keeps. Four are open from the first hour and the fifth is sealed. Each holds a share of the
game's fourteen gear sets, and the share is the whole reason to choose one: the harder the keep,
the better the sets behind it.

Shipped in `0.8.0`.

---

## 1. Opening them

The keeps are open from **player level 1** (`FEATURE_UNLOCK_LEVEL.dungeons`). Nothing gates the
mode: what stops a new chronicle is the **ladder**, not a door. Normal 1 is a day-one fight and
Normal 20 is not, which is the owner's brief exactly.

They are reached from **Battle → Game Modes**, between the campaign and the bosses. The card
carries how many keeps are open and the deepest any of them has been taken.

## 2. The five keeps

| Keep | Sets it holds | Keeper | Its warband |
| --- | --- | --- | --- |
| Cindervault | Ember Guard, Ironhide, Warcry, Bulwark | the Cinder Warden | the Ashen Legion |
| The Pale Expanse | Warding, Truesight, Immortal | the Pale Herald | the Frostvein Tribe |
| Velkora's Cradle | Keen Eye, Executioner, Retaliation | Velkora | the Marsh Horrors |
| Ashenreach | Swiftfoot, Relentless, Lifedrinker, Stunlock | the Ashwake | the Eclipse Cult |
| **The Gilded Veil** | accessories — **sealed** | — | — |

The split is the ladder. **Cindervault** holds the four a roster is built on: flat HP, DEF and ATK,
and the shield that keeps a wave alive — nothing here wins a fight alone, and everything here is
what a new chronicle is missing. **The Pale Expanse** holds the three that decide whether a debuff
lands: resistance, accuracy, and the regeneration that outlasts one. **Velkora's Cradle** holds
crit rate, crit damage and the counterattack. **Ashenreach** holds the four that bend the turn
order — speed, the extra turn, the lifesteal that makes a fast team unkillable, and the stun that
takes a turn away. Those are the best sets in the game, and that is the hardest place to stand.

**Every set belongs to exactly one keep** (`validateDungeons`), so a set can never be unreachable
and never be farmable in two places at once.

### The Gilded Veil

The fifth keep pays **necklaces, rings and trinkets**, and the game has no such slots yet. It ships
**shut**, with its name, its story and the reason on its card, rather than open and paying
something it was not built to pay (`CLAUDE.md` §2.1). It holds no gear sets for the same reason:
its rewards are a slot family, not a set, and inventing sets for it now would be inventing the
wrong ones.

## 3. A stage's fight

A stage is not authored. Its fight is derived from the keep, exactly as a tower floor is derived
from its number (`@engine/dungeon/encounter`):

- **One wave**, never a gauntlet: a keep is farmed by the dozen, so the fight has to fit in an
  evening at ×4.
- The keep's **keeper** stands on every stage, from the first to the fortieth. The fight is the
  same shape all the way up and only the numbers move, which is what makes a dungeon a ladder you
  learn once and climb forty times.
- Three guards from the keep's warband, as a **walking window** over its six units — the window
  moves by one per stage, so two stages are never quite the same fight.
- Party size **4** (`DUNGEON_PARTY_SIZE`), the bosses' shape rather than the campaign's three
  (the owner's answer). A keep keeps its own team preset row, because a player's dungeon four is
  rarely their boss four.
- Turn limit 50 ally turns, and time running out is a defeat.

The encounter is pitched at Intro's flat multiplier and stage index 0 on purpose: `stageScale` and
`DIFFICULTY_MULT` both come out at 1, which leaves `dungeonScale(stage, difficulty)` as the
**single** curve acting on a dungeon enemy. One number decides how hard a stage is.

### The keepers

Each keeper is written around what its keep *sells*, so bringing a keep's own gear to its keep
feels like bringing the right tool:

- **The Cinder Warden** strikes with its own plate rather than its arm (damage scales with DEFENCE),
  shields itself and opens the forge on the whole party. Armour is the answer; Cindervault sells
  armour. The gentlest of the four — this is where a chronicle learns what a keeper is.
- **The Pale Herald** does not out-damage anyone; it outlasts them, healing itself, weakening the
  party and cutting its healing. The keep that sells Warding and Truesight punishes having neither.
- **Velkora** is fragile for a keeper and hits like nothing else when she crits. She is the crit
  fight, which is why her keep holds Keen Eye, Executioner and Retaliation.
- **The Ashwake** is the fastest thing in the game and takes turns out of order. Losing to it feels
  like never getting one; its keep sells the answer to it.

## 4. The ladder

Twenty stages on **Normal** and twenty on **Hard**. Stage *n* opens when stage *n−1* is cleared,
per keep and per difficulty, so four ladders are climbed independently. A stage already cleared
pays in full every time it is run, because that is what a dungeon is for.

**Hard opens per keep, when that keep's Normal 20 falls** (the owner's answer). Earned in the place
it is spent: clearing Cindervault to the bottom opens Cindervault's Hard and nothing else.

A save keeps two numbers per keep — the deepest stage cleared on each difficulty — and nothing
else. Which stages are behind the player follows from those, because stages are taken in order;
whether Hard is open follows from `normal` reaching the twentieth. There is no per-stage list to
fall out of step and no "unlocked" flag to disagree with it. Shipped in save **v18**.

## 5. The bands

A **band** is a run of stages that drop the same shape of piece and cost the same energy. The bands
are the mode: star range, rarity and price step together on purpose (the owner's brief — energy
rises "each time a stage has higher chances for higher star gear drops"), so a player can read the
price and know what they are buying.

| Difficulty | Stages | Stars | Energy | Rarity | Second piece |
| --- | --- | --- | --- | --- | --- |
| Normal | 1–3 | 1–2★ | 8 | C 50 / U 33 / R 15 / E 2 | — |
| Normal | 4–6 | 2–3★ | 9 | C 42 / U 34 / R 20 / E 4 | — |
| Normal | 7–10 | 3–4★ | 10 | C 33 / U 33 / R 27 / E 7 | 8 % |
| Normal | 11–14 | 3–5★ | 11 | C 24 / U 31 / R 33 / E 12 | 12 % |
| Normal | 15–17 | 4–5★ | 12 | C 15 / U 28 / R 38 / E 18 / L 1 | 16 % |
| Normal | 18–20 | 5–6★ | 13 | C 8 / U 22 / R 42 / E 26 / L 2 | 20 % |
| **Hard** | 1–10 | 4–6★ | 15 | R 34 / E 45 / L 19 / M 2 | 25 % |
| **Hard** | 11–20 | 5–6★ (30/70) | 18 | R 20 / E 46 / L 30 / M 4 | 30 % |

Normal is the ladder a chronicle climbs while it is still growing: it opens on 1–2★ Commons and
ends on 5–6★ pieces that are mostly Rare with a real chance of Epic. **Hard's floor is Normal's
ceiling** — it never drops below Rare, which is the whole reason to earn it — and the deepest band
is mostly 6★, at the 70/30 the owner named.

Energy is the only price, and it is the most expensive energy in the game: a campaign stand costs
4–10 (`CAMPAIGN.md` §2), a dungeon run 8–18. There is no daily cap; the bar is the cap.

### What a run pays

- **Gear.** Every clear pays a piece, always — a gear farm that sometimes pays nothing is a gear
  farm nobody runs. The band's `extraPiece` is the chance of a *second* on top of it, which is most
  of what makes a deeper stage worth its higher price. The set is drawn evenly from the keep's own.
- **Gold**, thin next to the campaign's: `260 × (1 + 0.1 × (stage − 1)) × {normal 1, hard 2.6}`. A
  Normal campaign stand deep in the map pays roughly twice a dungeon run's gold *per point of
  energy*. Gold is what the campaign is for; the only reason a keep pays any is that levelling what
  it drops costs gold.
- **Champion and player XP**, at the campaign's own per-energy rates times `{normal 1.5, hard 2.2}`.
  A dungeon therefore pays the same XP per point of energy as a campaign stand of the matching
  difficulty, and more per *run* only because it costs more.
- **Summoning shards**, "sometimes but very rarely": a Faded Shard at 2 % on Normal and 3.5 % on
  Hard, and an Ancient Shard at 0.7 % on Hard alone. A trickle beside the Portal's real sources
  (`ECONOMY.md` §7), which is the point.

Numbers live in `src/content/balance/dungeon.ts`; §7 is how they were fitted.

## 6. A run, and an evening of them

Energy is charged **before** the fight, like the campaign's, so a reload mid-battle cannot buy a
free attempt — and a defeat costs what it cost.

A run is a **batch**. The campaign's own auto-repeat tiers (×10 at level 5, ×25 at 20, ×50 at 30)
repeat it until the bar runs out, the player stops it, or the keeper holds — a defeat ends the
evening rather than feeding a wall. The result screen reports the **batch**, not the last fight of
it: the pieces in their rarity frames, the gold and the XP, and what the evening opened. Its
button goes back into the keep, on the tab the run was spent on.

## 7. Balance

The ladder is fitted against `pnpm sim:balance --dungeon`, which walks eight rungs of Cindervault
against the five reference teams in `tools/sim/teams.ts` and then checks the seven bands across all
four keeps. Measured (12 runs a rung, the default):

| rung | scale | starter Lv10 | starter capped | mid Epic 4★40 | late 5★50 | endgame 6★60 |
| --- | --- | --- | --- | --- | --- | --- |
| Normal 1 | ×0.9 | 100 % | 100 % | 100 % | 100 % | 100 % |
| Normal 5 | ×1.7 | 33 % | 100 % | 100 % | 100 % | 100 % |
| Normal 10 | ×3.7 | 0 % | 0 % | 100 % | 100 % | 100 % |
| Normal 15 | ×8.2 | 0 % | 0 % | 0 % | 100 % | 100 % |
| Normal 20 | ×18 | 0 % | 0 % | 0 % | 8 % | 100 % |
| Hard 1 | ×24 | 0 % | 0 % | 0 % | 0 % | 100 % |
| Hard 10 | ×32.3 | 0 % | 0 % | 0 % | 0 % | 100 % |
| Hard 20 | ×45 | 0 % | 0 % | 0 % | 0 % | 100 % |

A clean staircase: on Normal each reference roster reaches about five rungs further than the one
below it, and every rung is a wall to the roster one tier short of it; Hard then belongs to the
finished roster alone, which is what "very late endgame" means. `DUNGEON_BANDS_CHECK` in
`tools/sim/teams.ts` is that staircase written down, and `--strict` fails when one breaks. A `min`
band is checked against the keep where it is *hardest* to keep and a `max` band against the keep
where it is *easiest*, the same rule the Brewery's bands use — so the endgame roster's 100 % in
Cindervault above is reported as the 88 % it manages in Ashenreach, the hardest of the four at
that rung.

The sim's day-one roster fights with **three** champions, not four, because that is what a new
chronicle is given — so Normal 1 being clearable means clearable a slot short.

**The four keeps sit on top of each other.** `pnpm sim:balance --scan --dungeon` prints, per keep,
the factor on the shipped `dungeonScale` at which the rung's own reference team still wins 85 % of
its runs — ×1 meaning the keep lands exactly on the curve for that team:

| rung | team | Cindervault | Pale Expanse | Velkora's Cradle | Ashenreach |
| --- | --- | --- | --- | --- | --- |
| Normal 1 | starter Lv10 | ×1.56 | ×1.49 | ×1.42 | ×1.18 |
| Normal 10 | mid Epic | ×1.74 | ×1.89 | ×1.70 | ×1.58 |
| Normal 15 | late game | ×1.80 | ×2.14 | ×2.04 | ×1.78 |
| Hard 20 | endgame | ×1.08 | ×1.27 | ×1.13 | ×1.03 |

A lower figure is a harder keep. Ashenreach is the tightest of the four everywhere on Normal,
which is right — it is the keep that sells the best sets — and at Hard 20 the spread is about a
quarter, with the Pale Expanse now the widest at ×1.27.

That last figure is a bug fix rather than a tuning choice. The Pale Herald's self-heal was always
meant to be 8 % of its own max HP (after an 18 % first draft proved a wall: a percentage heal on an
enemy whose pool *scales with the stage* gets relatively stronger the deeper you go, because the
party's damage does not scale with it). Until `0.9.10` it was written `8`, which the engine reads as
eight times the pool — a full heal every fourth action — and the keep's HP had been cut to 1,180 to
make up for it, which is where the ×0.98 this table used to print came from. With the heal at a true
8 % the pool went back up to 1,400, which puts the Expanse's Normal rungs with the others. At Hard 20
neither the keeper's pool, its attack, its enrage nor a heal of up to 16 % moves the figure: there
the fight is decided by the Frostvein escorts, not the Herald. The validator now refuses any max-HP
heal written above 1, so the slip cannot come back.

Hard 20 sits right at the top of the sim endgame roster's reach. That roster carries no Palace, no
optimised six-piece set and no element advantage; a real finished roster brings all three, so the
deepest rung is a farm for it rather than a wall — which is what a farm has to be.

## 8. Counters

`dungeon.runs`, `dungeon.cleared`, `dungeon.gear` and `dungeon.runs.<dungeon id>`, so quests and the
mission line can name a keep later.

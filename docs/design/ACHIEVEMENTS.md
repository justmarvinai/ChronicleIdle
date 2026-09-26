# The Hall of Deeds — Achievements and Challenges

Related: `QUESTS_MISSIONS.md` §1 (the goal DSL both ledgers are written in), `ECONOMY.md` §4
(titles) and §7 (one-off rewards), `docs/tech/UI_DESIGN.md` §5.31, `TUTORIAL.md` §6,
`GAME_DESIGN.md` §6, `docs/tech/DECISIONS.md` ADR-048.

The owner asked for **challenges and achievements, so players have long-term goals**. The daily and
weekly boards are a habit and the Chronicler's Path is a road with an end; neither says *how far* a
chronicle has come, and neither dares it to do something hard. The Hall of Deeds does both. It is
also where a chronicle's standing becomes something to look at: its renown, its rank in the Hall,
the titles it has earned and the frame round its portrait.

## 1. The two ledgers

- **Achievements** — lifetime milestones in every part of the game, each a chain of five tiers
  (I–V): *Stand-breaker* for 100, 1,000, 4,000, 10,000 and 25,000 campaign stands cleared. A tier is
  claimed by hand for its reward and its renown, and the next opens at once. The first tier of most
  is days away; the fifth is a year or more of play.
- **Challenges** — one-off deeds, each asking for something a chronicle has to *set out* to do: win
  a Hard stand with nobody better than Uncommon, fell a settlement's boss on Hard with a single
  champion, reach the top of the Eternal Tower, put a Mythic on the field. Each is claimed once for
  more renown than any single tier pays, and some hang up a title or a portrait frame no achievement
  does.

Both are written in the shared goal DSL (`QUESTS_MISSIONS.md` §1) and read against the whole
chronicle — a baseline of zero — so the Hall remembers everything a chronicle did before it opened:
the day it opens, the first tiers of a dozen achievements are already waiting to be claimed.

**Nothing is paid twice.** Where a part of the game has a top — the Tower's hundredth floor, the
Mine's tenth level, the Palace's last node, the Path's last page, every star of a difficulty —
reaching it is a challenge, and the achievement that climbs towards it stops a rung below (*Climber*
at 90 floors, *The Glorious* at 120 nodes, *Pathfinder* at 110 missions, *Star-gatherer* at 1,000
stars). The Mine has no level ladder at all: *Deep Pockets* counts what it pays and *The Heart of the
Vein* is its top.

## 2. Renown and the ranks of the Hall

**Renown** is what everything claimed was worth: 5, 10, 20, 40 and 80 for the five tiers of an
achievement (155 for a finished one) and 50–150 for a challenge. It is never stored; the save keeps
what was claimed and renown is derived from it (CLAUDE.md §5.5). Ten **ranks** stand on it, each
claimed by hand, in order, for its reward:

| Rank | Name | Renown | Reward | Also |
| --- | --- | --- | --- | --- |
| 1 | Novice of the Hall | 25 | 50 gems, 10,000 gold | |
| 2 | Page | 100 | 100 gems, 2 Faded Shards | the **Bronze** frame |
| 3 | Squire | 250 | 150 gems, 1 Ancient Shard | |
| 4 | Sworn Blade | 500 | 200 gems, 1 Ancient Shard, 2 Epic Tomes | the **Silver** frame |
| 5 | Banneret | 900 | 300 gems, 1 Sacred Shard | the title *Banneret* |
| 6 | Knight of Deeds | 1,500 | 400 gems, 2 Ancient Shards, 1 Legendary Tome | the **Gold** frame |
| 7 | Captain of the Hall | 2,300 | 500 gems, 1 Sacred Shard | |
| 8 | Lord of Deeds | 3,400 | 600 gems, 2 Sacred Shards | the **Ember** frame |
| 9 | Paragon | 5,000 | 800 gems, 1 Primordial Shard | |
| 10 | Legend of the Chronicle | 7,000 | 1,000 gems, 1 Primordial Shard, 1 Mythic Tome | the **Void** frame and the title *Legend of the Chronicle* |

The whole Hall is worth 7,685 renown (37 achievements × 155 = 5,735, and 1,950 from the twenty
challenges), so the tenth rank asks for 91 % of it. The content validator refuses a ladder whose last
rank stands on more renown than the Hall can pay.

## 3. Portrait frames

A frame is drawn round the chronicler's portrait: the pixel deco set's own frames (`DecoFrame`),
tinted and lit. In the profile and the Hall the portrait wears the whole frame; in the header, where
the avatar is round, the ring takes the frame's colour and its light.

| Frame | Deco | Colour | Light | Earned by |
| --- | --- | --- | --- | --- |
| The chronicle's own gold | 13 | gold | — | always worn until another is chosen |
| Bronze | 16 | bronze | — | rank 2 |
| Silver | 10 | silver | a cold glow | rank 4 |
| Gold | 7 | bright gold | a warm glow | rank 6 |
| Ember | 17 | ember | a fire glow | rank 8 |
| Void | 30 | violet | a deep glow and a gleam | rank 10 |
| Verdant | 29 | green | a green glow | the challenge *Master of Hard* |
| Amethyst | 9 | amethyst | a glow and a gleam | the challenge *The Titan Falls* |

A frame is derived from a claimed rank or challenge, never stored; the save keeps only which one is
worn, and wears the gold again if it is ever asked to wear one it has no right to. The profile's
frame picker draws every frame round the chronicler's own portrait, and the locked ones say what
earns them.

## 4. Titles

Four titles join the eleven a chronicle already earns (`ECONOMY.md` §4): *Rabble-Rouser* (the
challenge *The Rabble Rises*), *Banneret* (rank 5), *Sovereign of the Tower* (the challenge of that
name) and *Legend of the Chronicle* (rank 10). Like every title they are derived from the save — a
rank claimed, a challenge claimed — never stored, and a claim that earns one says so.

## 5. The achievements

Each tier's goal is data; the table gives the five targets. Unless a row says otherwise the goal is a
counter read from the chronicle's first day (`counter` in the goal DSL).

| Ledger | Achievement | Goal | I | II | III | IV | V |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Campaign | Stand-breaker | stands cleared (`campaign.cleared`) | 100 | 1,000 | 4,000 | 10,000 | 25,000 |
| Campaign | Star-gatherer | stars earned (`campaign.stars`) | 30 | 120 | 360 | 720 | 1,000 |
| Campaign | The Long Road | a settlement's boss fallen | 3rd, Intro | 6th, Intro | 12th, Intro | 12th, Normal | 12th, Hard |
| Campaign | Written, Not Fought | stands cleared instantly (`campaign.instant`) | 10 | 100 | 500 | 2,000 | 5,000 |
| Campaign | Energy Well Spent | energy spent (`energy.spent`) | 1,000 | 10,000 | 40,000 | 120,000 | 250,000 |
| Campaign | Victor | battles won (`battles.victory`) | 50 | 500 | 2,500 | 7,500 | 20,000 |
| Campaign | By Your Own Hand | battles won in Manual (`battles.won.manual`) | 10 | 50 | 200 | 500 | 1,000 |
| Champions | Recruiter | different champions held (`own_champions`, distinct) | 5 | 10 | 14 | 18 | 22 |
| Champions | Starborn | champions at a rank | one at 3★ | one at 4★ | one at 5★ | one at 6★ | three at 6★ |
| Champions | Tempered | champions at a level | one at 20 | one at 40 | one at 50 | one at 60 | six at 60 |
| Champions | Tavern Regular | levels paid at the Tavern (`tavern.levelUps`) | 25 | 150 | 600 | 2,000 | 5,000 |
| Champions | Sharpened | ability upgrades (`tavern.skillUpgrades`) | 5 | 25 | 100 | 250 | 500 |
| Champions | Of the Same Blood | rank-ups (`tavern.rankUps`) | 1 | 10 | 40 | 100 | 250 |
| Gear | Smith | gear levels (`gear.levels`) | 50 | 500 | 2,500 | 8,000 | 20,000 |
| Gear | Forgemaster | pieces crafted (`forge.crafts`) | 5 | 30 | 120 | 400 | 1,000 |
| Gear | Salvager | pieces dismantled (`forge.dismantles`) | 25 | 250 | 1,000 | 4,000 | 10,000 |
| Gear | Refiner | refines (`forge.refines`) | 5 | 25 | 100 | 300 | 800 |
| Gear | Plunderer | pieces found (`gear.drops`) | 25 | 250 | 1,000 | 4,000 | 10,000 |
| Portal | Summoner | champions summoned (`summon.pulls`) | 10 | 100 | 500 | 1,500 | 4,000 |
| Portal | Epic Tidings | Epics summoned (`summon.rarity.epic`) | 1 | 10 | 40 | 120 | 300 |
| Portal | Legend Seeker | Legendaries summoned (`summon.rarity.legendary`) | 1 | 5 | 15 | 40 | 100 |
| Trials | Stonebreaker | keys spent on the Gargoyle (`boss_fights`) | 10 | 60 | 200 | 450 | 900 |
| Trials | The Titan's Due | keys spent on the Titan (`boss_fights`) | 3 | 15 | 50 | 120 | 240 |
| Trials | Chest-taker | boss chests opened (`boss.chests`) | 10 | 100 | 400 | 1,000 | 2,000 |
| Trials | Climber | the Tower's highest floor (`tower.best`) | 10 | 25 | 50 | 75 | 90 |
| Halls | Brewmaster | brews taken (`brewery.brews`) | 50 | 500 | 2,500 | 8,000 | 20,000 |
| Halls | Hall-walker | Brewery stages first cleared (`brewery.cleared`) | 2 | 5 | 10 | 15 | 20 |
| Halls | Keep-raider | pieces from the Dungeons (`dungeon.gear`) | 10 | 100 | 500 | 1,500 | 4,000 |
| Halls | Rung by Rung | Dungeon stages first cleared (`dungeon.cleared`) | 5 | 20 | 60 | 120 | 160 |
| Emberhold | Deep Pockets | gems from the Mine (`mine.gems`) | 30 | 300 | 1,500 | 4,000 | 8,000 |
| Emberhold | Dockhand | Idle Chest claims (`idle.claims`) | 10 | 100 | 500 | 1,500 | 3,500 |
| Emberhold | Patron | Market purchases (`market.purchases`) | 10 | 100 | 500 | 1,500 | 4,000 |
| Emberhold | Faithful | Daily Rewards taken (`login.claims`) | 7 | 30 | 90 | 180 | 365 |
| Emberhold | The Glorious | Palace nodes lit (`palace_nodes`) | 5 | 20 | 50 | 90 | 120 |
| Ledgers | Errand-runner | quests claimed (`quests.claimed`) | 20 | 200 | 800 | 2,000 | 4,000 |
| Ledgers | Diligent | days with the whole daily board done (`quests.daily.days`) | 3 | 15 | 60 | 180 | 365 |
| Ledgers | Pathfinder | missions walked on the Path (`path_walked`) | 10 | 30 | 60 | 90 | 110 |

The pacing behind the numbers: two Gargoyle keys a day make *Stonebreaker* V a year and a quarter,
three Titan keys a week make *The Titan's Due* V a year and a half, and a Brewery's twenty runs a day
make *Brewmaster* V seven months at the very least. The validator checks that each chain's targets
climb.

**What a tier pays** (`balance/deeds.ts`). Every tier pays the same base — I 10,000 gold, II 20 gems,
III 50 gems, IV 100 gems, V 150 gems and an Ancient Shard — and its ledger adds what that part of the
game runs on:

| Ledger | I | II | III | IV | V |
| --- | --- | --- | --- | --- | --- |
| Campaign | 20 energy | 40 energy | 60 energy | 80 energy | 120 energy |
| Champions | 3 Universal Brews | 6 Universal Brews | 1 Epic Tome | 2 Epic Tomes | 1 Legendary Tome |
| Gear | 10 Arcane Dust | 2 Refining Cores | 4 Refining Cores | 2 Glyph Sigils | 5 Glyph Sigils |
| Portal | 1 Faded Shard | 2 Faded Shards | 1 Ancient Shard | 2 Ancient Shards | 1 Sacred Shard |
| Trials | 10,000 gold | 20,000 gold | 40,000 gold | 80,000 gold | 160,000 gold |
| Halls | 3 Universal Brews | 6 | 10 | 15 | 25 |
| Emberhold | 10,000 gold | 25,000 gold | 50,000 gold | 100,000 gold | 200,000 gold |
| Ledgers | 1 Rare Tome | 2 Rare Tomes | 1 Epic Tome | 2 Epic Tomes | 1 Legendary Tome |

No keys: a key is a period's allowance, not a thing to bank.

## 6. The challenges

| Challenge | Asks | Renown | Pays |
| --- | --- | --- | --- |
| Lone Blade | win a Normal or Hard stand with a single champion | 50 | 100 gems |
| Last One Standing | win a battle with one champion left standing of three or more | 50 | 100 gems |
| Untouched | win a battle of three waves or more without a champion losing health | 75 | 150 gems |
| Swift as the Wind | clear a Normal or Hard stand of three waves in six ally turns or fewer | 75 | 150 gems |
| Of One Blood | win a Hard stand with three or more champions of one element | 75 | 150 gems |
| The Rabble Rises | win a Hard stand with nobody better than Uncommon | 100 | 200 gems, the title *Rabble-Rouser* |
| Giant-slayer | fell a settlement's boss on Hard with a single champion | 100 | 200 gems |
| Master of Intro | three stars on every stand of Intro | 75 | 200 gems |
| Master of Normal | three stars on every stand of Normal | 100 | 300 gems |
| Master of Hard | three stars on every stand of Hard | 150 | 500 gems, the **Verdant** frame |
| Sovereign of the Tower | the Eternal Tower's hundredth floor | 150 | 1 Primordial Shard, the title *Sovereign of the Tower* |
| The Gargoyle Broken | the Gargoyle's Brutal pool emptied in a single day | 100 | 1 Sacred Shard |
| The Titan Falls | the Titan's Nightmare pool emptied in a single week | 150 | 1 Primordial Shard, the **Amethyst** frame |
| A Mythic Stands | a Mythic champion held | 100 | 300 gems |
| A Legend Perfected | every ability of a Legendary champion at its last step | 100 | 1 Sacred Shard |
| Dressed for War | six 6★ pieces on one champion | 75 | 5 Glyph Sigils |
| Masterwork | a piece of gear at +16 | 75 | 10 Refining Cores |
| The Heart of the Vein | the Mine dug to its tenth level | 100 | 300 gems |
| Every Hall Lit | all 133 nodes of the Glorious Palace | 150 | 1 Primordial Shard |
| The Path's End | the Chronicler's Path walked to its last page | 100 | 1 Sacred Shard |

## 7. Feats only a battle can tell

The first seven challenges name *how* a fight was won, which the save cannot say afterwards. So the
moment a victory is recorded, the state layer hands the battle's report to `engine/deeds/feats.ts`
and bumps a lifetime counter for each feat it shows; the challenges read those counters like any
other. Only the champions the player fielded count as the party.

| Counter | The feat |
| --- | --- |
| `feat.solo` | one champion fielded, a Normal or Hard stand |
| `feat.giant_slayer` | one champion fielded, a settlement's boss (its tenth stand) on Hard |
| `feat.last_stand` | three or more fielded, exactly one standing at the end — any battle |
| `feat.untouched` | three waves or more and no fielded champion lost a point of health — any battle |
| `feat.swift` | a Normal or Hard stand of three waves or more in six ally turns or fewer |
| `feat.kindred` | a Hard stand, three or more champions, one element |
| `feat.rabble` | a Hard stand, nobody better than Uncommon |

Intro is left out of the lone champion's and the swift clear's reckoning on purpose: every
chronicle's first stands are fought by the starter alone, before there is anyone to field beside
it, and a challenge that pays for the first hour is not a challenge. An instant clear is not a battle
and writes none of them. The thresholds live in `balance/deeds.ts`.

## 8. When it opens

At chronicle level 13 (`FEATURE_UNLOCK_LEVEL.deeds`), the one level between the weekly board (12)
and the Titan (15) with nothing else to teach. The Hall has its own button on the hub's bottom bar
(*Deeds*, the trophy, between the Quests and the Index) with a dot counting everything waiting to be
claimed, and one lesson in Steel and Bone (`TUTORIAL.md` §6, 6.10): wherever it is first heard, it
points at the Hall's button on the hub or at *Claim all* inside the Hall.

## 9. The economy

A tier, a challenge and a rank each pay once in a chronicle's life, like a bundle (`ECONOMY.md` §7):
the Hall is not a weekly rate and `sim:economy` does not model it. Its whole pool is 18,590 gems,
3.5 million gold, 2,240 energy, 50 Ancient, 11 Faded, 10 Sacred and 5 Primordial Shards, 290
Universal Brews, 49 tomes (9 Rare, 29 Epic, 10 Legendary, 1 Mythic) and 130 of the Forge's scarcer
materials. Spread over the one to two years a chronicle takes to earn most of it, that is 180–360
gems a week — a tenth to a fifth on top of an active player's ~1,830 — and it arrives in the order the
play earns it. The burst the day the Hall opens is mostly gold: the first tiers of the achievements a
level-13 chronicle has already passed pay 10,000 each, and the first two ranks 150 gems.

## 10. Save

`deeds` (save v21): the tiers claimed per achievement, the challenges claimed, how many ranks are
claimed, and the frame worn. Renown, the rank renown has reached, every achievement's progress, every
earned frame and every earned title are derived. The v20 → v21 migration gives an old chronicle an
empty Hall and back-pays nothing: the Hall reads the lifetime counters, so every tier a veteran
already passed is waiting to be claimed the day it opens.

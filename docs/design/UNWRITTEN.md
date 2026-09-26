# UNWRITTEN.md — The Unwritten

Related: `BATTLE.md` (the fights, the effect DSL the inscriptions are written in), `CAMPAIGN.md`
(the factions the Unwritten remembers), `ECONOMY.md` §7–§8 (what an expedition pays),
`ACHIEVEMENTS.md` (its deeds), `docs/tech/UI_DESIGN.md` §5.32 (the screens),
`docs/tech/DECISIONS.md` ADR-050 (how it is built and why it loads on its own).

The Unwritten is ChronicleIdle's roguelite — the owner's last and largest order of September 2026:
*"make it really outstanding … an advanced and highly anticipated feature … build depth to it and
make it one of the most outstanding game modes in the game."* Every other mode asks how strong the
roster is. The Unwritten asks how well the player **spends** it: a company of champions walks a
map it has never seen, carries every wound from fight to fight, writes new powers into itself as it
goes, and has to reach the end of the third folio before it runs out of champions.

Shipped in `0.13.0`.

---

## 1. The fiction, and the words the game uses

The Chronicle is Veyrath's history, and the Eclipse tears pages out of it. The torn pages do not
vanish: they fall into **the Unwritten**, a place where history has not settled and rearranges
itself every time it is entered. The Chronicler sends a company in to bring the pages back.

| Word | What it is |
| --- | --- |
| **The Unwritten** | The mode. Opens at chronicle level 16 (§2) |
| **Expedition** | One run, from the first passage to the last Warden or the last champion |
| **Folio** | One of the three acts of an expedition, each its own map ending in a Warden |
| **Passage** | A node on a folio's map: a fight, a mystery, a shrine, a peddler, a reliquary, an echo |
| **Company** | The champions the player takes in: up to six of their own, plus Echoes met inside |
| **Fallen** | A champion of the company at 0 HP. Stays fallen until something rekindles them |
| **Inscription** | A power written into the company for the rest of the expedition — the mode's boon |
| **Ink** | The four families inscriptions are written in: **Gold** (Justice), **Crimson** (Valor), **Azure** (Faith), **Violet** (Eclipse) |
| **Illumination** | What an ink grants when enough of it has been written: at three inscriptions, and again at six |
| **Blended ink** | An inscription written in two inks at once, offered to a company that holds both |
| **Relic** | A thing carried out of the Unwritten's history that bends one rule of the expedition |
| **Blot** | A stain on the expedition — the curse the Unwritten leaves on the careless |
| **Gilt** | The expedition's own purse, gold leaf scraped from torn pages. Never leaves the Unwritten |
| **Echo** | A champion the Unwritten remembers, who may join the company for one expedition |
| **Warden** | The boss that holds the end of a folio |
| **Recovered Pages** | What every expedition brings home, won or lost: the currency of the Scriptorium |
| **The Scriptorium** | The permanent upgrades Recovered Pages buy (§15) |
| **Omen** | The difficulty ladder, 0 to 15. Clearing an Omen opens the next (§13) |

The four inks are the four elements, so an inscription wears its element's colour everywhere, and
some inscriptions favour champions of their own element (§7.4). The player's Palace and gear still
count: the company fights as its sheets say (ADR-049's companion fix in `0.12.0` made sure of it).

## 2. Opening it

The Unwritten opens at **chronicle level 16** (`FEATURE_UNLOCK_LEVEL.unwritten`), after the Hall of
Deeds (13) and the Titan (15). By then a chronicle holds enough champions to choose a company from
and has met every system an expedition leans on — gear, the Tavern, the Palace, statuses.

It is entered from the **Game Modes** menu (its own card, between the Brewery and the Tower) and
from **Emberhold** itself: a violet rift, the Torn Page, opens on the square the day the Unwritten
does. Eldric's lesson 6.11 points at it once.

## 3. An expedition at a glance

```
choose Omen ─▶ choose company (1–6) ─▶ Folio I map ─▶ … passages … ─▶ Warden I ─▶ interlude
          ─▶ Folio II map ─▶ … ─▶ Warden II ─▶ interlude ─▶ Folio III map ─▶ … ─▶ Warden III ─▶ Tale
```

1. **Before**: the player picks an Omen they have opened and a company of one to six champions.
2. **A folio** is a map of passages in eight rows with the Warden at the top (§5). The company
   starts below row 1 and climbs: each step, it chooses one of the passages the current one leads
   to. The whole map is visible from the start, so a route can be planned.
3. **Fights** send up to four living champions of the company in. Wounds are kept (§4.2).
4. **Victories** pay gilt and Recovered Pages and offer three inscriptions to choose from (§7).
5. **The Warden** ends the folio. Felling it pays a relic of the player's choosing, an inscription
   from the Warden's hoard, and — for the first six Wardens of each week — a Warden's Tithe into the
   wallet (§14.2). The company then rests for the **interlude** (§5.4) before the next folio.
6. **The expedition ends** when the third Warden falls (a **victory**), when the whole company has
   fallen (a **defeat**), or when the player abandons it. Either way it writes its **Tale** (§16) and
   brings its Recovered Pages home.

An expedition is ~27 passages and ~14 fights: about half an hour at ×4 auto, longer when the player
steers. **It keeps**: closing the game in the middle of a folio loses nothing (§17).

## 4. The company

### 4.1 Choosing it

Up to **six** champions of the roster (the Scriptorium raises the cap to seven, then eight). Any
rarity, any level; the roster's own instances, with their gear, skills and Palace. Nothing stops a
company of one — the Hall of Deeds has a challenge for it — but a fight fields up to **four**, and a
company of six can rest its wounded.

A champion on an expedition is **not locked** out of the rest of the game. They can be levelled,
geared and ranked in Emberhold between passages, and the company fights with whatever they are
when the fight begins. A champion who leaves the roster — consumed as rank-up food, for instance —
leaves the company too.

### 4.2 Wounds are kept

Every champion of the company carries an **HP share** from fight to fight: a champion who ends a
fight at 40 % of their max HP starts the next at 40 %. The share is of whatever their max HP is when
the next fight begins, so a level-up between passages is not a heal and not a wound.

A champion at 0 is **fallen**: they cannot be sent into a fight until something rekindles them — a
shrine (§11.1), the Peddler's Phoenix Ash, a relic, a mystery, a Scriptorium token.

**Wounds are kept on both sides.** A fight that is lost does not reset:

- the champions who fell stay fallen;
- the waves that were cleared stay cleared;
- the wave the company was fighting keeps every wound it took, and every foe that died stays dead.

The passage stays **contested** until it is won. The player may send in another four of the company
(or the same survivors) to finish it — and must, because a passage cannot be walked past. The same
holds when the turn limit runs out, and when the player retreats: both sides keep what they took,
nobody else falls. Only when **every** champion of the company has fallen does the expedition end.

Statuses, cooldowns and turn meter are not kept between fights; wounds and deaths are.

### 4.3 Echoes

An **Echo** passage (§11.4) offers two champions the Unwritten remembers — any summonable champion,
owned or not, weighted Rare 50 %, Epic 35 %, Legendary 13 %, Mythic 2 %. An Echo who joins:

- fights at the **company's average level** and at the **company's average stars** (capped by the
  Echo's rarity), with no gear and an **Echo's resolve** of +15 % HP, ATK and DEF standing in for it;
- counts as a member of the company in every rule (wounds, fallen, rekindling, inscriptions);
- leaves when the expedition ends.

The company may grow past its starting cap with Echoes, to eight at most.

## 5. The map

### 5.1 A folio

A folio is **eight rows** of passages over **four lanes**, and the Warden above the last row. It is
generated when the folio begins, from the expedition's seed (`engine/unwritten/map.ts`), and kept in
the save from then on (§18) — a content change never reshapes a map already drawn.

**Paths.** Four walks climb from row 1 to row 8, each starting in a lane (the first two in different
lanes) and stepping to the lane above, or one to either side. A step that would cross another
walk's step goes straight instead, so paths never cross. The passages are every place a walk
stood; the roads are every step one took. Every row-8 passage leads to the Warden.

**Kinds by row.**

| Row | Kind |
| --- | --- |
| 1 | **Skirmish**, always — the first reward comes quickly |
| 2, 3, 5, 6, 7 | Drawn (below) |
| 4 | **Reliquary**, always — a relic in the middle of every folio |
| 8 | **Shrine**, always — rest before the Warden |
| Warden | **Warden** |

Drawn rows weigh: Skirmish 40, Mystery 24, Elite 14, Peddler 8, Shrine 7, Echo 7 (Echoes only once
the Scriptorium's *Echo Calling* is written; their weight goes to Mysteries until then). Row 2 draws
no Elite and no Peddler, and row 7 no Shrine. No road joins two Elites, two Peddlers or two Shrines;
a folio with no Elite or no Peddler has one placed on a drawn passage that allows it.

### 5.2 Passage kinds

| Passage | Glyph | What happens |
| --- | --- | --- |
| **Skirmish** | crossed blades | A fight (§6.1). Victory: gilt, Pages, an inscription offer |
| **Elite** | spiked cleaver | A harder fight with a marked foe (§6.2). Victory: more of each, and a relic |
| **Warden** | skull in a wreath | The folio's boss (§6.3). Victory: a relic chosen from two, a Warden's inscription, the Tithe |
| **Mystery** | quill | A scene with choices (§10) |
| **Shrine** | candle | One of: rest, rekindle, re-ink, scrape (§11.1) |
| **Peddler** | coin purse | A shop for gilt (§11.2) |
| **Reliquary** | chest | A relic (§11.3) |
| **Echo** | cloaked figure | One of two Echoes joins (§4.3, §11.4) |

### 5.3 Moving

From the passage it last finished, the company may enter any passage a road leads to. At the start
of a folio, any row-1 passage. A passage is finished when its fight is won, its choice made, its
shop left. The route walked is inked gold on the map; the passages it could not reach fade.

### 5.4 The interlude

Between folios, every living champion heals **25 %** of their max HP, the next folio's map is drawn,
and the expedition's Tale turns a page.

## 6. Fights

### 6.1 Skirmishes

Two waves of the folio's factions — the Unwritten remembers the campaign's foes:

| Folio | Factions (by settlement) | Waves |
| --- | --- | --- |
| I — *The Charred Margins* | 1–4 | 3 foes, then 3 |
| II — *The Drowned Index* | 5–8 | 3 foes, then 4 |
| III — *The Blotted Heart* | 9–12 | 4, then 4 |

A fight draws one faction and a window of its six units, as the tower does. Party of **four**, a
limit of **40** ally turns.

### 6.2 Elites

One wave: the faction's **named boss** (the settlement boss the campaign fields at stand 10) flanked
by two of its own (three in Folio III), with the elite multiplier (§6.4) and **one affix** (two from
Omen 4, three from Omen 12). Limit 45 turns.

| Affix | What it does |
| --- | --- |
| Vampiric | Heals 25 % of the damage it deals |
| Thorned | 50 % chance to strike back when hit |
| Unyielding | Survives its first killing blow at 30 % HP |
| Frenzied | +30 % damage below half HP |
| Warded | Takes 20 % less damage |
| Swift | +15 SPD |
| Regenerating | Heals 5 % of its max HP at the start of each turn |
| Hexing | Hits have a 35 % chance to Weaken for 2 turns |

### 6.3 Wardens

Each folio ends in its own Warden, a boss with phases, a rotation and immunity to stun, freeze and
sleep. Limit 60 turns. The Unwritten's Wardens are champions the Unwritten has twisted, drawn in the
champions' own art, darkened.

| Folio | Warden | Kit |
| --- | --- | --- |
| I | **The Ink-Drowned Knight** — Justice, Defense | *Drowning Blade* (hit, may Weaken); *Black Tide* (hits all, may Slow); *Oath Unwritten* (shields itself, takes Counter, may Provoke all). At half HP it enrages |
| II | **The Hollow Choir** — Faith, Support, with two Inkling Choristers who rise again every third turn | *Dirge* (hit, Heal Reduction); *Chorus of Ink* (hits all, may Poison); *Requiem* (heals itself, sheds its debuffs) |
| III | **The Unwriter** — Eclipse, Attack; three phases at 70 % and 35 % | *Erase* (heavy hit, steals a buff); *Blot Out* (hits all, may Block Buffs); from phase II *Rewrite* (heals, cleanses, ATK Up); from phase III *The Last Line* (hits all, ignores 30 % DEF). Enrages from turn 20 |

### 6.4 Scaling

Every foe is pitched at Intro's flat multiplier and stage 0, as the tower's are, so one curve decides
how hard a fight is (`engine/unwritten/encounter.ts`):

```
unwrittenScale(omen, depth) = OMEN_SCALE[omen] × DEPTH_GROWTH ^ depth
depth = (folio − 1) × 9 + row           (row 1–8, the Warden 9: depth 1 … 27)
elite ×1.3 · warden ×WARDEN_SCALE[folio]
```

`OMEN_SCALE` climbs from **2.4** at Omen 0 — about the campaign's Intro settlements 5–7, where a
level-16 chronicle stands — to **42** at Omen 15. It is steep at the bottom, where each rung is a
roster's next step (×1.3 a rung to Omen 3), and gentler above Omen 5 (×1.13–1.2), where the twists
pile up on top of it; the fitted curve is

| Omen | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scale | 2.4 | 3.1 | 4.0 | 5.4 | 6.8 | 8.4 | 10.0 | 11.8 | 13.8 | 16.4 | 19.4 | 22.9 | 27.0 | 31.8 | 37.0 | 42.0 |

`DEPTH_GROWTH` is **1.025**: a Folio III skirmish is ~1.7× a Folio I one, which the inscriptions
gathered on the way are there to answer. The tables live in `balance/unwritten.ts`;
`sim:balance --unwritten` holds them to the bands of §20.

## 7. Inscriptions

### 7.1 Offers

A won Skirmish, Elite or Warden offers **three** inscriptions (four with the Scriptorium's
*Illuminator's Eye* or the Broken Quill, one fewer under the Smudged Offer blot). The player writes
one, or leaves them all for **10 gilt**. An offer is drawn from the expedition's seed, so a reloaded
game shows the same three.

| Offer from | Common | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- |
| Skirmish | 60 % | 30 % | 9 % | 1 % |
| Elite | 30 % | 45 % | 20 % | 5 % |
| Warden | — | — | 70 % | 30 % |

An ink the company already writes in is **half again as likely** to be offered, so a build
gathers. An inscription already held can be offered again as its **next level** (it says so).
Legendary inscriptions appear after Skirmishes only once the Scriptorium's *Master's Hand* is
written.

### 7.2 Levels

Every inscription has three levels, **I → II → III**, which raise its numbers. A level is gained by
picking it again from an offer, at a shrine (*Re-ink*), from the Peddler (*Deepening Ink*), or from
a mystery.

### 7.3 Who carries it

Most inscriptions are carried by **every champion sent in**. A few act on the whole field once —
they would stack absurdly if all four carried them — and are carried by the **leader** alone (the
first champion of the fight's line-up). A kinship inscription is carried only by champions of its
element. The tables mark each.

### 7.4 The four inks

Numbers are per level, I / II / III. *Each* = every fielded champion; *Leader* = the leader only.

**Gold — Justice: the Law.** Protection, retribution, judgement.

| Inscription | Rarity | Carried by | Effect |
| --- | --- | --- | --- |
| Oath of Iron | Common | Each | +10 / 15 / 20 % DEF |
| Vow of the Wall | Common | Each | +8 / 12 / 16 % HP |
| Stalwart | Common | Each | Takes 6 / 9 / 12 % less damage |
| First Light | Rare | Each | Each wave, a Shield of 10 / 15 / 20 % max HP for 2 turns |
| Retribution | Rare | Each | 20 / 30 / 40 % chance to strike back when hit |
| Shieldbearer's Rite | Rare | Leader | An ally falling below 35 % HP is shielded for 15 / 20 / 25 % of their max HP (2 turns), once per ally per wave |
| Kinship of Gold | Rare | Justice | +12 / 18 / 24 % HP and DEF |
| Sentence | Epic | Each | +20 / 30 / 40 % damage to foes below 30 % HP |
| Verdict | Epic | Each | When hit, 25 / 35 / 45 % chance to Weaken the attacker for 2 turns |
| Aegis Oath | Epic | Each | Each wave, DEF Up for 2 turns; from II also Counter for 1 turn; III, 2 turns of both |
| Unbending | Epic | Each | Takes 20 / 28 / 36 % less damage below 40 % HP |
| The Last Word | Legendary | Each | When this champion falls, every ally gains a Shield of 25 / 35 / 45 % and Counter for 2 turns |

**Crimson — Valor: the Blade.** Damage, criticals, momentum.

| Inscription | Rarity | Carried by | Effect |
| --- | --- | --- | --- |
| Bloodlust | Common | Each | +10 / 15 / 20 % ATK |
| Keen Edge | Common | Each | +8 / 12 / 16 C.RATE |
| Savagery | Common | Each | Deals 8 / 12 / 16 % more damage |
| Cruel Strokes | Rare | Each | +20 / 30 / 40 C.DMG |
| Momentum | Rare | Each | A kill fills 20 / 30 / 40 % turn meter |
| Opening Salvo | Rare | Each | Each wave, ATK Up for 1 / 2 / 2 turns; III also C.RATE Up |
| Bleeding Edge | Rare | Each | Hits have a 15 / 25 / 35 % chance to Bleed for 2 turns |
| Kinship of Crimson | Rare | Valor | +12 / 18 / 24 % ATK and +5 / 8 / 10 C.RATE |
| Berserker's Due | Epic | Each | +3 / 4 / 5 % damage per 10 % HP missing |
| Headsman | Epic | Each | Critical hits deal 20 / 30 / 40 % more to foes below half HP |
| Relentless | Epic | Each | 6 / 9 / 12 % chance to take another turn |
| Frenzy of Valor | Legendary | Each | A killing blow grants another turn; +0 / 10 / 20 % damage |

**Azure — Faith: the Prayer.** Healing, cleansing, the refusal to fall.

| Inscription | Rarity | Carried by | Effect |
| --- | --- | --- | --- |
| Blessed Vigor | Common | Each | +10 / 15 / 20 % HP |
| Mending Hymn | Common | Each | Heals 3 / 4 / 5 % max HP at the start of each turn |
| Steadfast Soul | Common | Each | +20 / 30 / 40 RES |
| Harvest Hymn | Common | — | After every victory the whole company heals 5 / 8 / 11 % |
| Regrowth | Rare | Each | Each wave, Regen for 2 / 2 / 3 turns |
| Purifying Light | Rare | Each | Sheds one debuff at the start of each turn (I: only below half HP; III: two) |
| Mercy | Rare | Each | Healing an ally grants them DEF Up for 1 / 2 / 2 turns |
| Kinship of Azure | Rare | Faith | +12 / 18 / 24 % HP and +20 / 30 / 40 RES |
| Martyr's Grace | Epic | Each | When this champion falls, every ally heals 15 / 20 / 25 % |
| Second Dawn | Epic | Leader | Once a fight, the weakest ally is blessed with Revive on Death (30 / 40 / 50 %) |
| Benediction | Epic | Leader | Each wave, every ally sheds all debuffs and gains Block Debuffs for 1 / 1 / 2 turns |
| Undying Chorus | Legendary | Each | Survives the first killing blow of each fight at 20 / 30 / 40 % HP |

**Violet — Eclipse: the Hunger.** Poison, hexes, stolen time.

| Inscription | Rarity | Carried by | Effect |
| --- | --- | --- | --- |
| Siphon | Common | Each | Heals 6 / 9 / 12 % of the damage it deals |
| Venom Ink | Common | Each | Hits have a 15 / 22 / 30 % chance to Poison for 2 turns |
| Plague Bearer | Common | Leader | Foes heal 30 / 45 / 60 % less |
| Malediction | Rare | Each | +5 / 7 / 9 % damage per debuff on the target, to +25 / 35 / 45 % |
| Hex of Weakness | Rare | Each | Hits have a 12 / 18 / 24 % chance to Weaken for 2 turns |
| Death Knell | Rare | Each | A kill Poisons the foes beside the fallen for 2 / 2 / 3 turns |
| Creeping Dread | Rare | Leader | Each wave, 40 / 55 / 70 % chance to Slow every foe for 2 turns |
| Kinship of Violet | Rare | Eclipse | +12 / 18 / 24 % ATK and +10 / 15 / 20 ACC |
| Nightfall | Epic | Leader | Each wave, every foe loses 15 / 20 / 25 % turn meter |
| Sapping Touch | Epic | Each | Hits have a 20 / 28 / 36 % chance to drain 10 % turn meter |
| Blood Pact | Epic | Each | −10 % max HP; deals 20 / 28 / 36 % more damage |
| The Black Page | Legendary | Each | Poisons bite 50 / 75 / 100 % harder; hits have a 20 / 25 / 30 % chance to Poison |

### 7.5 Illumination

When a company holds **three** inscriptions of one ink, the ink **illuminates**; at **six** it
illuminates fully. Blended inscriptions count for both their inks. An illumination is carried by
every fielded champion, and it is the reason to commit to an ink rather than take the best card.

| Ink | Illuminated (3) | Fully illuminated (6) |
| --- | --- | --- |
| Gold | Each wave, a Shield of 12 % max HP for 2 turns | Shield 20 %, and Counter for 2 turns |
| Crimson | +12 C.RATE | +12 C.RATE, +25 C.DMG, and a kill fills 20 % turn meter |
| Azure | Heals 3 % max HP at the start of each turn | Heals 5 %, and survives the first killing blow at 25 % |
| Violet | Hits have a 15 % chance to Poison | 25 % chance, and +20 % damage to the Poisoned |

### 7.6 Blended inks

Once the Scriptorium's *Blended Inks* is written, each slot of an offer to a company holding
inscriptions of two inks has a 15 % chance to be one of their blend instead. Blends are Epic.

| Blend | Inks | Effect (I / II / III) |
| --- | --- | --- |
| Crusader's Zeal | Gold + Crimson | A shielded champion deals 20 / 25 / 30 % more damage |
| Sanctified Ground | Gold + Azure | Each wave, a Shield of 10 / 14 / 18 % and Regen for 2 turns |
| Iron Maiden | Gold + Violet | When hit, 40 / 55 / 70 % chance to Poison the attacker for 2 turns |
| Battle Hymn | Crimson + Azure | A killing blow heals every ally 6 / 8 / 10 % |
| Sanguine Frenzy | Crimson + Violet | +15 / 20 / 25 % damage to a foe with any debuff; heals 8 % of damage dealt |
| Martyrdom | Azure + Violet | When this champion falls, every foe is Poisoned twice and every ally heals 10 / 15 / 20 % |

### 7.7 The volumes

Not every inscription is in the Unwritten from the first expedition. **Volume I** — eight of each
ink, the ones the tables list first: three Common, two Rare, two Epic and one Legendary — is always
there. **Volume II**, written in the Scriptorium,
adds the remaining four of each ink. Blends come with *Blended Inks*. A new chronicle's first
expeditions are therefore simpler, and the pool keeps growing for months.

## 8. Relics

A relic bends one rule for the rest of the expedition. Elites drop one, Wardens offer a choice of
two, a Reliquary holds one (two to choose from with *Reliquary Rights*), the Peddler sells two.
**Volume I** holds the first sixteen; the Scriptorium's *Third Volume* adds the last eight.

| Relic | Effect | Volume |
| --- | --- | --- |
| Hourglass of Embers | The company begins each wave with 20 % turn meter | I |
| Thornmail Shard | 20 % chance to strike back when hit | I |
| Wyrmscale Charm | Takes 8 % less damage | I |
| Sigil of Haste | +8 SPD | I |
| Heartseeker Lens | +10 C.RATE | I |
| Vial of Nightshade | Hits have a 12 % chance to Poison | I |
| Aegis Fragment | Each wave, a Shield of 10 % max HP for 2 turns | I |
| Iron Lung | +15 % HP | I |
| Broken Quill | Inscription offers show one more choice | I |
| Gilded Tongue | The Peddler's prices are 25 % lower | I |
| Pilgrim's Lantern | A shrine's Rest heals 20 % more | I |
| Candle of Vigil | The company heals 6 % after every victory | I |
| Ledger of Debts | +20 gilt after every Elite and Warden | I |
| Warden's Horn | Wardens enter with 15 % less HP | I |
| Phoenix Feather | The first champion to fall this expedition rises after that fight at 50 % | I |
| Chronicler's Inkwell | +1 Recovered Page from every passage | I |
| Eclipse Shard | Deals 18 % more damage; −8 % max HP | III |
| Warden's Bane | Deals 20 % more damage in Warden fights | III |
| Huntsman's Mark | Deals 15 % more damage in Elite fights | III |
| Choir Bell | Heals 2 % max HP at the start of each turn | III |
| Scholar's Loupe | An offered inscription rolls one rarity higher 25 % of the time | III |
| Mercenary's Seal | Echoes join at one star more, and at full health | III |
| Twin Moons | Inks illuminate one inscription sooner (at two and five) | III |
| The Last Page | The first time the whole company would fall, everyone rises at 30 % instead | III |

## 9. Blots

Blots come from mysteries and from Omen 5 (§13). A shrine can scrape one away, or the Peddler can.

| Blot | Effect |
| --- | --- |
| Smudged Offer | Inscription offers show one fewer choice |
| Heavy Ink | The company −8 SPD |
| Bleeding Margin | Champions who fought lose 5 % HP after every fight |
| Ill Omen | Elites have 20 % more HP |
| Torn Purse | Gilt found is 30 % less |
| Frayed Binding | A shrine's Rest heals half as much |
| Creeping Rot | Champions start each wave Poisoned for 2 turns |
| Brittle Will | The company −20 RES |

## 10. Mysteries

A mystery is a scene with two or three choices. Every choice says plainly what it costs and what it
may bring; a gamble names its odds once the Scriptorium's *Keen Reader* is written, and says only
"perhaps" before. Twenty mysteries, drawn without repeat within an expedition:

| Mystery | Choices |
| --- | --- |
| The Weeping Scribe | Pay 30 gilt: a random inscription gains a level · Let him write: a random Rare inscription, and a blot · Leave |
| A Page Torn in Two | The left half: a random relic, the company loses 10 % HP · The right half: 60 gilt |
| The Hungry Library | Feed it a relic (random): two random inscriptions · Leave |
| Mirror of Ink | Look: a random inscription is written again as its next level, and a blot · Break it: 25 gilt |
| The Drowned Choir | Listen: the company heals 25 % · Sing along: a random Azure inscription |
| An Unfinished Duel | Accept: an Elite fight, and on victory a Legendary-leaning offer · Refuse |
| The Ashen Pilgrims | Share your purse (20 gilt): a random Gold inscription · Rob them: 50 gilt, and the Ill Omen blot |
| Well of Forgotten Names | A coin (10 gilt): perhaps a relic (50 %) · Drink: a fallen champion rises at 30 % |
| The Bound Echo | Free them: an Echo joins · Take their ink: a random Violet inscription |
| Candle in the Void | Light it: scrape a blot, the company loses 15 % HP · Snuff it: 3 Recovered Pages |
| Scriptorium Ruins | Search: perhaps a free level on an inscription (60 %), else a Skirmish · Leave |
| The Merchant of Last Things | Pay all your gilt (at least 40): a random relic · Leave |
| The Silent Twins | The left door: perhaps a relic (50 %), else a blot · The right door: 30 gilt |
| Echo of a Fallen Friend | If a champion has fallen: they rise at 50 % · otherwise: 30 gilt |
| The Ink Tide | Wade through: the company loses 10 % HP · Let it take an inscription (random), and gain 40 gilt |
| The Warden's Herald | Bow: this folio's Warden enters with 15 % less HP · Mock it: it enters with 15 % more, and pays a second relic |
| A Crimson Altar | Bleed for it: the strongest champion loses 30 % HP, a random Crimson inscription · Leave |
| The Scales of Veyrath | Weigh your purse: gilt doubled, up to +60 · Weigh your company: the company heals 20 % |
| The Lantern-Bearer | Follow: the next fight you win pays double gilt · Ask the way: this folio's Elites show their affixes |
| The Last Chronicler | Listen to the tale: 5 Recovered Pages · Ask for a page: a random Rare inscription, the company loses 10 % HP |

## 11. Shrines, the Peddler, Reliquaries and Echoes

### 11.1 Shrine

One of, and only one:

- **Rest** — every living champion heals **40 %** of their max HP (Omen 3: 30 %; Omen 11: 25 %);
- **Rekindle** — one fallen champion rises at **40 %** (Omen 14: 20 %);
- **Re-ink** — one inscription gains a level;
- **Scrape** — one blot is removed.

### 11.2 The Peddler

| Wares | Price (gilt) |
| --- | --- |
| Three inscriptions, rarity drawn as a Skirmish's | Common 45 · Rare 70 · Epic 105 · Legendary 150 · Blend 130 |
| Two relics | 110–150 by relic |
| Salve: every living champion heals 25 % | 35 |
| Phoenix Ash: one fallen champion rises at 50 % (once a visit) | 60 |
| Deepening Ink: one inscription gains a level (once a visit) | 55 |
| Scraper: one blot is removed | 50 |
| Fresh stock: the three inscriptions are drawn again (once a visit) | 15 |

Omen 7 raises every price by 25 %; the Gilded Tongue takes 25 % off. The Peddler's stock is drawn
when the passage is entered and kept, so leaving and coming back is the same shop.

### 11.3 Reliquary

A relic, drawn from the ones the expedition does not already carry. With *Reliquary Rights*, a
choice of two.

### 11.4 Echo

Two Echoes (§4.3), one of whom may join, or 25 gilt instead. A full company (eight) takes the gilt.

## 12. Gilt

| Source | Gilt |
| --- | --- |
| Start of an expedition | 40 (+30 with *Deeper Purse*) |
| Skirmish won | 14–18 |
| Elite won | 28–36 |
| Warden won | 45–55 |
| An offer left unwritten | 10 |

Gilt is spent at the Peddler and in mysteries, and is gone when the expedition ends.

## 13. Omens

The ladder is sixteen rungs. **Omen 0** is open with the mode; clearing an expedition at Omen *n*
opens *n* + 1. Each Omen raises `OMEN_SCALE` (§6.4) **and** adds its twist to every twist below it —
the Unwritten remembers everything it has done to a player.

| Omen | Name | Twist added |
| --- | --- | --- |
| 0 | The First Page | — |
| 1 | Hardened Echoes | Foes +10 % HP |
| 2 | Sharper Quills | Foes +10 % ATK |
| 3 | Bitter Ink | Rest heals 30 % |
| 4 | Marked Elites | Elites carry a second affix |
| 5 | A Stain Remembered | Every expedition begins with a random blot |
| 6 | Quickened Dark | Foes +6 SPD |
| 7 | The Peddler's Greed | Peddler prices +25 % |
| 8 | Wardens Stir | Wardens +20 % HP and one affix |
| 9 | A Worn Company | The company begins at 80 % HP |
| 10 | Crowded Margins | Skirmish waves field one more foe (four at most) |
| 11 | Fading Light | Rest heals 25 % |
| 12 | Thrice-Marked | Elites carry a third affix |
| 13 | Eclipse Rising | Foes +10 % HP and ATK more |
| 14 | No Quarter | Rekindled champions rise at half the usual share |
| 15 | The Blotted Heart | The Unwriter +30 % HP; its last phase opens at 50 % |

## 14. What an expedition pays

Three layers: the Scriptorium's currency every time, the wallet once a week, and a seal the first
time each Omen falls.

### 14.1 Recovered Pages

Earned by every passage finished, **banked when the expedition ends however it ends** — a fallen
company still brings its pages home.

| Passage | Pages |
| --- | --- |
| Skirmish | 3 |
| Elite | 6 |
| Warden | 15 |
| Mystery, Shrine, Peddler, Reliquary, Echo | 1 |
| An expedition won | +25 |

All of it × **(1 + 0.15 × Omen)**, +20 % with *Gilded Margins*. An Omen 0 expedition won is ~120
Pages; an Omen 10 one ~300.

Recovered Pages are not a wallet currency: like the Palace's points, they buy exactly one thing,
and they live in the Unwritten's own save slice.

### 14.2 The Warden's Tithe

The **first six Wardens felled each week** (the weekly reset of `ECONOMY.md` §9) each pay a chest
into the wallet. The Tithe is the Unwritten's line in the economy, and what it carries is **Skill
Tomes**: four Epic a week, as many as the campaign's first clears pay an active player, and from
Omen 8 two Legendary — about three times what every other scheduled source together pays
(`ECONOMY.md` §13).

| Warden | Gold | Tomes | Besides |
| --- | --- | --- | --- |
| Folio I | 15,000 × m | 1 Rare | 2 Universal Brews |
| Folio II | 25,000 × m | 1 Epic | 1 Refining Core |
| Folio III | 40,000 × m | 1 Epic; +1 Legendary from Omen 8 | 1 Glyph Sigil |

`m = 1 + 0.1 × Omen`. Six Wardens is two expeditions won; the counter is on the mode's screen.

### 14.3 Omen Seals

The **first** expedition won at each Omen pays its seal once, for ever:

| Omen | Seal |
| --- | --- |
| 0 | 100 gems, 1 Ancient Shard |
| 1–4 | 120 / 140 / 160 / 180 gems |
| 5 | 300 gems, 1 Sacred Shard |
| 6–9 | 220 / 240 / 260 / 280 gems, 1 Epic Tome each |
| 10 | 500 gems, 1 Sacred Shard, 1 Legendary Tome |
| 11–14 | 350 / 380 / 410 / 440 gems, 1 Legendary Tome each |
| 15 | 1,000 gems, 1 Primordial Shard |

5,080 gems in all, one-off like the Hall of Deeds (`ECONOMY.md` §7 does not count one-off pools).

## 15. The Scriptorium

Recovered Pages are spent in the **Scriptorium**, a tab of the Unwritten's screen: sixteen folios in
four shelves. A shelf opens when two folios of the shelf below are written. Nothing is ever lost or
refunded — the Scriptorium is the expedition's memory. It is written **between expeditions only**:
while a company is out its candles are out, so an expedition is always played under the rules it
set out with (what it began with is what its Omen reading and its Tale describe).

| Shelf | Folio | Pages | Effect |
| --- | --- | --- | --- |
| I | Deeper Purse | 80 | Expeditions begin with +30 gilt |
| I | Field Dressing | 80 | The company heals 4 % after every victory |
| I | Steady Hand | 100 | One reroll of an inscription offer per folio |
| I | Keen Reader | 120 | Mysteries name their odds, and the map shows every Elite's affixes |
| II | Echo Calling | 200 | Echo passages appear on the maps |
| II | Wider Company | 250 | The company may be seven |
| II | Rekindling | 250 | Each expedition carries one Rekindle token (a fallen champion rises at 40 %, any time) |
| II | Reliquary Rights | 300 | Reliquaries offer a choice of two relics |
| III | Gilded Margins | 400 | +20 % Recovered Pages |
| III | Second Volume | 450 | The remaining sixteen inscriptions join the Unwritten |
| III | Illuminator's Eye | 500 | Offers show four inscriptions |
| III | Blended Inks | 600 | Blended inscriptions may be offered |
| IV | Veteran's Start | 800 | Each expedition begins with a random Rare inscription |
| IV | Third Volume | 900 | The last eight relics join the Unwritten |
| IV | A Larger Company | 1,000 | The company may be eight |
| IV | Master's Hand | 1,200 | Legendary inscriptions may be offered after Skirmishes |

The whole Scriptorium is **7,230** Pages: a few months of expeditions, faster the higher the Omen —
the second long tail beside the Palace's.

## 16. Records and the Tale

Each expedition writes a **Tale**: a short chronicle of what happened in it, assembled from what it
kept (§18) — the company, the Omen, which passages it took, who fell and to what, which inks it
wrote, each Warden felled, and how it ended. The Tale is shown when the expedition ends, and the
last **eight** stay in the mode's **Records** with the best Omen cleared, expeditions won, Wardens
felled and the fastest victory.

## 17. Leaving and coming back

An expedition lives in the save, not in memory. Closing the game — or walking to the Tavern to level
a wounded champion — loses nothing:

- **between passages**, the map and everything on it is where it was;
- **in the middle of a choice** (an offer, a shop, a mystery), the same choice is waiting, drawn from
  the same seed;
- **in the middle of a fight**, nothing of that fight was kept: the passage is as it was before it
  began, and the company may enter it again.

**Abandoning** ends the expedition at once, as a defeat would: its Pages come home, its Tale is
written, its Echoes leave. One expedition at a time.

## 18. Save data (v22)

```ts
unwritten: {
  pages: number;                    // Recovered Pages held
  scriptorium: string[];            // folios written
  omen: { open: number; best: number | null; sealed: number[] };
  tithe: { weekKey: string; paid: number };
  records: { expeditions: number; victories: number; wardens: number; fastestMs: number | null };
  tales: Tale[];                    // the last eight
  run: Expedition | null;
}
```

An `Expedition` keeps its seed, Omen and start; the current folio and its map; the passages walked;
the company (each member a roster instance or an Echo, with an HP share); inscriptions with levels;
relics; blots; gilt; Pages earned; the Scriptorium's tokens left; the passage in hand and what it
holds (an offer, a shop's stock, a mystery, a contested wave's wounds); and the Tale's entries. It
is written only by `engine/unwritten` reducers, so every rule above is tested where it is decided.

## 19. Counters and deeds

Counters (`engine/progression/counters.ts`): `unwritten.expeditions`, `unwritten.victories`,
`unwritten.omens` (the Omens won: the highest won plus one, written as a maximum like the tower's
best floor), `unwritten.folios`, `unwritten.wardens`, `unwritten.passages`,
`unwritten.inscriptions`, `unwritten.relics`, `unwritten.echoes`, `unwritten.scriptorium` and
`unwritten.pagesSpent`, and the feats `feat.unwritten_unbroken` (an expedition won with no champion
ever fallen), `feat.unwritten_lone` (won with a company of one) and `feat.unwritten_illuminated`
(won with all four inks illuminated).

The daily and weekly boards do not ask for any of them. The Unwritten is a mode a chronicle chooses
to sit down for, and a board that asked for an expedition a day would turn it into a chore; its
long goals are the Hall's.

The Hall of Deeds gains a ninth ledger, **the Unwritten**, whose tiers pay Skill Tomes on top of the
common purse: *Folios Turned* (3 · 30 · 100 · 250 · 500), *Inscribed* (10 · 100 · 400 · 1,000 ·
2,500), *Relic-bearer* (5 · 50 · 200 · 500 · 1,200) and *Omens Read* (the first 1 · 4 · 7 · 10 · 13
Omens won) — a Warden felled turns its folio, so *Wardens Felled* would count the same thing twice.
Four challenges: *The Unbroken Company* (100 renown, 300 gems), *A Company of One* (150, a Sacred
Shard), *Illuminated Manuscript* (100, 300 gems) and *The Last Page Turned* — every Omen won, the
Blotted Heart last (150, a Primordial Shard) — which hangs the **Ink-Black** portrait frame and the
title **Author of the Unwritten**.

## 20. Balance

`pnpm sim:balance --unwritten` plays whole expeditions headlessly (`tools/sim/unwritten.ts`) with
the sim's reference teams, each taken in as a company of six (`UNWRITTEN_COMPANY`) with the shelves
of the Scriptorium its chronicle would have written (none, two, all four): a path policy (fights
over mysteries while healthy, shrines when hurt), a greedy inscription pick (the ink already held,
then the highest rarity), and the real encounter builder, scaling, wounds and inscriptions. An
expedition is one outcome of ~15 fights, so a band plays 32 of them (four times a stage's runs);
they take a few hundredths of a second each. Its bands, all inside the default `sim:balance` run
and so inside the gate:

| Reference team | Omen | Expeditions won |
| --- | --- | --- |
| mid (the level-16 chronicle) | 0 | ≥ 55 % |
| mid | 3 | ≤ 45 % |
| late | 5 | ≥ 45 % |
| endgame | 10 | ≥ 40 % |
| endgame | 15 | 5–35 % |

What the fitted curve plays at (`0.13.0`, 32 expeditions a cell): the mid roster wins Omens 0–2
(100 %, 100 %, 84 %) and a quarter of Omen 3; the late roster Omen 5 (84 %), half of Omen 6 and a
sixth of Omen 7; the finished roster everything to Omen 10, Omen 12 72 %, Omen 13 59 %, Omen 14 19 %
and the Blotted Heart one expedition in eight (13 %) — the losses there come in the third folio,
against the Unwriter. No reference roster wins an Omen two rungs above its own: each roster's ladder
falls off within three rungs, which is what makes the next champion, the next star and the next
piece of gear the way up.

`sim:economy` carries the Tithe as a weekly line (`warden tithe`): the casual script's one
expedition a week at Omen 1 books ~12,600 gold a day in it, the active script's two at Omen 2 the
whole Tithe (~27,400 gold a day, two Rare and four Epic Tomes, four Universal Brews, two Refining
Cores and two Glyph Sigils a week), the dedicated script's at Omen 5 ~34,300. The Omen Seals are
one-offs and, like the Hall of Deeds, stay out of the weekly ledger.

## 21. Presentation

`docs/tech/UI_DESIGN.md` §5.32 draws it: the Unwritten's screen (Expedition, Scriptorium, Records),
the Omen and company pickers, the folio map in ink on a darkened page, the passage panels, the
inscription offer as three tall cards in their inks, the interlude, and the Tale. Sound: the
dungeon's ambience under a low void drone, footsteps on stone between passages, a quill's scratch
when an inscription is written, a rising chord when an ink illuminates.

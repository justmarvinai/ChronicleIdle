# Champions

Related: `BATTLE.md` (effects, status list, formulas), `GEAR.md`, `SUMMONING.md`,
`docs/tech/CONTENT_AUTHORING.md` §2 (how to write a champion file).

## 1. Identity

Every champion definition has:

| Field | Values |
| --- | --- |
| `rarity` | common, uncommon, rare, epic, legendary, mythic |
| `element` | justice, valor, faith, eclipse |
| `role` | attack, defense, health, support |
| `baseStars` / `maxStars` | per rarity table below |
| `stats` | canonical stats at **6★ level 60** (all champions are authored on the same scale) |
| `abilities` | A1 (+A2, A3, A4 by rarity), each with target, cooldown, effects, upgrades |
| `passive` | Rare and above |
| `aura` | Legendary and Mythic only |
| `ai` | auto-battle priority hints (see `BATTLE.md` §7) |
| `art` | model key (sprite atlas), avatar key, `facing` |
| `lore` | 2–4 sentences (i18n key) |
| `obtain` | list of sources: `summon`, `mission`, `starter`, `campaign_drop` (offered by a campaign mastery pick — the validator holds it to `CHAMPION_CHOICES`) |

### Names

A champion has **one word**. Only a Legendary or a Mythic earns a second, and it is a surname or
an epithet welded into one — *Aurelia Dawnwarden*, *Kaelith Stormcaller*, *Varkos Sunderking* —
never a title with a `the` or a comma in it. A name is what a player calls a champion in a team
list; the job it does is in the role and the kit, not in the name.

Ids do not follow names. A save names the champions it holds by id, so `champ.ser_corvin` stays
`champ.ser_corvin` however its bearer is introduced: the id is the file's name, the name is the
player's.

### Rarity table

| Rarity | Base★ | Max★ | Level cap at max★ | Abilities | Passive | Aura | Stat budget |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Common | 1 | 2 | 20 | A1 | – | – | 0.70 |
| Uncommon | 2 | 4 | 40 | A1, A2 | – | – | 0.80 |
| Rare | 3 | 6 | 60 | A1, A2 | ✓ | – | 0.90 |
| Epic | 4 | 6 | 60 | A1, A2, A3 | ✓ | – | 1.00 |
| Legendary | 5 | 6 | 60 | A1–A4 | ✓ | ✓ | 1.10 |
| Mythic | 6 | 6 | 60 | A1–A4 | ✓ | ✓ | 1.20 |

Level cap = `stars × 10`.

### Elements

Strong = ×1.10 damage and +10 % crit rate. Weak = ×0.90 damage and −10 % crit rate. Eclipse is
neutral both ways. Numbers live in `balance/element.ts` (`ELEMENT_STRONG_DMG`, `ELEMENT_STRONG_CRIT`,
`ELEMENT_WEAK_DMG`, `ELEMENT_WEAK_CRIT`, `ELEMENT_WEAK_GLANCE_CHANCE = 0` (off by default)).

| Attacker ↓ / Defender → | Justice | Valor | Faith | Eclipse |
| --- | --- | --- | --- | --- |
| Justice | – | strong | weak | – |
| Valor | weak | – | strong | – |
| Faith | strong | weak | – | – |
| Eclipse | – | – | – | – |

## 2. Stats

Eight stats. HP, ATK, DEF scale with stars and level; the other five are flat per champion and are
only changed by gear, sets, buffs and skill upgrades.

| Stat | Meaning | Typical 6★60 range |
| --- | --- | --- |
| HP | Hit points | 12,000 – 26,000 |
| ATK | Attack | 850 – 1,750 |
| DEF | Defense | 750 – 1,600 |
| SPD | Turn-meter fill rate | 88 – 118 |
| C.RATE | Crit chance (%) | 15 |
| C.DMG | Crit damage bonus (%) | 50 |
| RES | Resistance (debuff resist) | 20 – 45 |
| ACC | Accuracy (debuff landing) | 0 – 30 |

### Role templates (at budget 1.00, i.e. Epic)

| Role | HP | ATK | DEF | SPD |
| --- | --- | --- | --- | --- |
| Attack | 13,500 | 1,450 | 900 | 100 |
| Defense | 16,500 | 950 | 1,400 | 96 |
| Health | 21,000 | 1,000 | 1,000 | 94 |
| Support | 15,000 | 1,100 | 1,100 | 104 |

Authored stats may deviate ±15 % from `template × budget` to give champions character.
`pnpm content:validate` warns beyond that.

### Scaling formula

```
statAt(star, level) = round( base × STAR_MULT[star] × (0.55 + 0.45 × (level − 1) / (star × 10 − 1)) )

STAR_MULT = { 1: 0.18, 2: 0.26, 3: 0.36, 4: 0.50, 5: 0.70, 6: 1.00 }
```

So a 6★ Lv60 champion equals its authored base; a fresh 3★ Lv1 Rare has ≈ 20 % of it.
Rank-up keeps the level (a 3★ Lv30 becomes 4★ Lv30 and can now level to 40).

### Power rating (display only)

```
power = HP × 0.05 + ATK × 1.0 + DEF × 1.0 + SPD × 10 + C.RATE × 8 + C.DMG × 3 + RES × 2 + ACC × 2
```
(computed on total stats incl. gear). Team power is the sum.

## 3. Abilities

- **A1** — basic attack, no cooldown, usually single target; often carries a small debuff chance.
- **A2–A4** — cooldowns 3–6 turns; cooldown counts down at the start of the owner's turn; abilities
  start ready unless `startsOnCooldown` is set. Boss-class abilities may use `startsOnCooldown`.
- **Passive** — triggered (`onTurnStart`, `onHit`, `onAllyHit`, `onKill`, `onDeath`, `onWaveStart`)
  or static (stat modifier).
- **Aura** — static team modifier applied when the champion is in leader slot (slot 1):
  e.g. "+12 % HP to all allies" or "+15 SPD in campaign".
- **Upgrades** — each non-A1 ability has 3–4 upgrade steps; A1 has 2. Steps are typed:
  `damage +N%`, `cooldown −1`, `chance +N%`, `heal +N%`, `duration +1`, `shield +N%`. Applied via
  Skill Tomes in the Tavern (see `ECONOMY.md` §3.3); duplicates never upgrade skills.

Effect vocabulary and targeting are defined in `BATTLE.md` §6. Below, damage is written as
`k × STAT` (e.g. `3.4 × ATK`), buffs/debuffs as `Name (turns) [chance%]`.

## 4. EA-0.1 roster

Elements: J = Justice, V = Valor, F = Faith, E = Eclipse. Models: seven finished models exist; every
other champion uses the `teritorial_lizard` placeholder with a per-champion tint until art arrives.
Varkos joined the finished sheets in `0.9.2`.
Stats are authored 6★60 values (HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC).

### 4.1 Common (food)

| Id | Name | El | Role | Stats | Model |
| --- | --- | --- | --- | --- | --- |
| `champ.gil_scrapper` | Gil | V | Attack | 9,200 / 1,010 / 640 / 96 / 15 / 50 / 20 / 0 | placeholder (tint: rust) |
| `champ.wenna_novice` | Wenna | F | Support | 10,400 / 760 / 780 / 100 / 15 / 50 / 25 / 0 | placeholder (tint: pale blue) |
| `champ.bran_militia` | Bran | J | Defense | 11,600 / 660 / 980 / 92 / 15 / 50 / 25 / 0 | placeholder (tint: ochre) |

Kits (A1 only):
- **Gil** — *Rusty Cleave*: `3.6 × ATK` single. Upgrades: dmg +5 %, +5 %.
- **Wenna** — *Prayer Strike*: `3.2 × ATK` single; heals self 5 % max HP. Upgrades: dmg +5 %, heal +5 %.
- **Bran** — *Shield Jab*: `3.0 × DEF` single. Upgrades: dmg +5 %, +5 %.

### 4.2 Uncommon (food, early stop-gaps)

| Id | Name | El | Role | Stats | Model |
| --- | --- | --- | --- | --- | --- |
| `champ.orla_hedge_witch` | Orla | F | Support | 11,800 / 880 / 880 / 102 / 15 / 50 / 30 / 10 | placeholder (tint: moss) |
| `champ.tobbe_pikeman` | Tobbe | J | Attack | 10,600 / 1,160 / 720 / 98 / 15 / 50 / 20 / 0 | placeholder (tint: steel) |
| `champ.mire_stalker` | Mirestalker | E | Attack | 10,200 / 1,200 / 700 / 104 / 15 / 55 / 20 / 10 | placeholder (tint: swamp green; this *is* a lizardfolk) |

Kits:
- **Orla** — A1 *Thorn Whip* `3.2 × ATK` single, 25 % SPD Down (2). A2 *Poultice* (CD 4): heal one
  ally 25 % of Orla's max HP. Upgrades A2: heal +10 %, heal +10 %, CD −1.
- **Tobbe** — A1 *Pike Thrust* `3.5 × ATK` single. A2 *Line Charge* (CD 4): `2.4 × ATK` all
  enemies. Upgrades A2: dmg +5 %, +5 %, CD −1.
- **Mirestalker** — A1 *Venom Bite* `3.3 × ATK` single, 30 % Poison (2). A2 *Ambush* (CD 4):
  `5.4 × ATK` single, +20 % C.RATE on this hit. Upgrades A2: dmg +5 %, +5 %, +10 %.

### 4.3 Rare (starters — the player picks one of these three in the tutorial)

| Id | Name | El | Role | Stats | Model |
| --- | --- | --- | --- | --- | --- |
| `champ.sister_maelis` | Maelis | F | Support | 13,900 / 960 / 1,000 / 104 / 15 / 50 / 30 / 10 | placeholder (tint: ivory) |
| `champ.ser_corvin` | Corvin | J | Defense | 15,200 / 860 / 1,290 / 96 / 15 / 50 / 30 / 0 | placeholder (tint: silver) |
| `champ.reva_ashblade` | Reva | V | Attack | 12,400 / 1,330 / 820 / 102 / 15 / 60 / 20 / 0 | placeholder (tint: ember) |

Kits:
- **Maelis** — A1 *Censer Swing* `3.1 × ATK` single. A2 *Blessed Light* (CD 4): heal all
  allies 15 % of their max HP; remove 1 debuff from each. Passive *Vigil*: at the start of her turn,
  the lowest-HP ally gains Continuous Heal (1). Upgrades A2: heal +5 %, +5 %, CD −1.
- **Corvin** — A1 *Shield Bash* `3.2 × DEF` single, 20 % Provoke (1). A2 *Stand Fast* (CD 5):
  DEF Up 30 % (2) on all allies; Ally Protection 25 % (2) on the lowest-HP ally. Passive
  *Oathbound*: takes 10 % less damage while any ally is below 50 % HP. Upgrades A2: duration +1,
  CD −1, CD −1.
- **Reva** — A1 *Quick Cut* `3.4 × ATK` single, 20 % chance to hit twice. A2 *Ash Flurry*
  (CD 4): three hits of `1.9 × ATK` on random enemies. Passive *Kindled*: +5 % ATK per debuff on
  the target when attacking (max +15 %). Upgrades A2: dmg +5 %, +5 %, +10 %, CD −1.

### 4.4 Epic (finished models)

| Id | Name | El | Role | Stats | Model |
| --- | --- | --- | --- | --- | --- |
| `champ.anuria` | Anuria | J | Attack | 13,200 / 1,480 / 880 / 104 / 15 / 60 / 25 / 10 | `epic_anuria` |
| `champ.darius` | Darius | E | Support | 14,600 / 1,120 / 1,080 / 108 / 15 / 50 / 35 / 30 | `epic_darius` |
| `champ.khazgor` | Khazgor | V | Defense | 17,400 / 940 / 1,460 / 94 / 15 / 50 / 40 / 0 | `epic_khazgor` |
| `champ.maruan` | Maruan | F | Support | 15,300 / 1,090 / 1,110 / 106 / 15 / 50 / 30 / 20 | `epic_maruan` |
| `champ.rattledagger` | Rattledagger | E | Attack | 12,800 / 1,540 / 860 / 110 / 20 / 65 / 20 / 20 | `epic_rattledagger` |
| `champ.sethlurias` | Sethlurias | J | Support | 14,900 / 1,060 / 1,140 / 102 / 15 / 50 / 35 / 30 | `epic_sethlurias` |
| `champ.thordakk` | Thordakk | V | Attack | 14,100 / 1,560 / 900 / 98 / 15 / 60 / 20 / 0 | `epic_thordakk` |

Kits:

**Anuria** (single-target sniper, DEF shred)
- A1 *Silver Arrow* — `3.5 × ATK` single, 30 % DEF Down 30 % (2). Up: dmg +5 %, chance +10 %.
- A2 *Piercing Volley* (CD 4) — `2.6 × ATK` all enemies; ignores 20 % DEF. Up: dmg +5 %, +5 %, CD −1.
- A3 *Heartseeker* (CD 5) — `6.8 × ATK` single; guaranteed crit if the target has a debuff.
  Up: dmg +5 %, +10 %, CD −1.
- Passive *Ranger's Focus* — +15 % C.DMG against enemies with DEF Down.

**Darius** (controller, turn-meter manipulation)
- A1 *Wayfarer's Bolt* — `3.2 × ATK` single, 35 % Decrease TM 15 %. Up: dmg +5 %, chance +10 %.
- A2 *Stitch in Time* (CD 4) — Increase TM 20 % all allies; SPD Up 20 % (2). Up: TM +5 %, +5 %, CD −1.
- A3 *Hourglass Shatter* (CD 5) — `2.4 × ATK` all enemies, 60 % Stun (1), Decrease TM 25 %.
  Up: chance +10 %, +10 %, CD −1.
- Passive *Threads of Fate* — when an enemy is stunned by Darius, he gains 10 % TM.

**Khazgor** (undead tank, provoke + counter)
- A1 *Grave Slash* — `3.0 × DEF` single, 30 % ATK Down 25 % (2). Up: dmg +5 %, chance +10 %.
- A2 *Unyielding Wall* (CD 4) — Provoke (1) all enemies; DEF Up 30 % (2) self; Counterattack (2) self.
  Up: duration +1, CD −1, CD −1.
- A3 *Bone Bulwark* (CD 5) — Shield 25 % of Khazgor's max HP (2) on all allies. Up: shield +5 %,
  +5 %, CD −1.
- Passive *Unburied* — once per battle, when Khazgor would die, he survives at 1 HP and heals
  20 % max HP at the start of his next turn.

**Maruan** (healer + buffer)
- A1 *Starlight* — `3.1 × ATK` single, 25 % SPD Down 15 % (2). Up: dmg +5 %, chance +10 %.
- A2 *Constellation* (CD 4) — heal all allies 20 % of their max HP; Continuous Heal (2) on the two
  lowest. Up: heal +5 %, +5 %, CD −1.
- A3 *Astral Ward* (CD 5) — Block Debuffs (2) + C.RATE Up 20 % (2) on all allies. Up: duration +1,
  CD −1, CD −1.
- Passive *Guiding Star* — allies healed by Maruan gain +8 % ATK (1).

**Rattledagger** (poison assassin)
- A1 *Rattle Stab* — `3.4 × ATK` single, 40 % Poison 5 % (2). Up: dmg +5 %, chance +10 %.
- A2 *Shadowstep* (CD 4) — `5.6 × ATK` single, +30 % C.RATE on this hit; if it kills, Rattledagger
  gains an extra turn. Up: dmg +5 %, +5 %, CD −1.
- A3 *Bone Rattle* (CD 5) — `1.8 × ATK` all enemies, 75 % Poison 5 % (3), detonates existing
  Poison for 50 % of its remaining ticks. Up: chance +10 %, +15 %, CD −1.
- Passive *Between the Ribs* — Poison placed by Rattledagger deals 6 % instead of 5 % max HP.

**Sethlurias** (offensive support, ATK Up + TM)
- A1 *Splinter Hex* — `3.2 × ATK` single, 30 % Weaken 15 % (2). Up: dmg +5 %, chance +10 %.
- A2 *War Chant* (CD 4) — ATK Up 30 % (2) + Increase TM 15 % all allies. Up: TM +5 %, +5 %, CD −1.
- A3 *Bone Storm* (CD 5) — `2.3 × ATK` all enemies, 50 % Heal Reduction 50 % (2). Up: dmg +5 %,
  chance +15 %, CD −1.
- Passive *Old Bones* — at the start of each wave, all allies gain 10 % TM.

**Thordakk** (AoE berserker)
- A1 *Cleave* — `3.3 × ATK` single + `1.2 × ATK` to one adjacent random enemy. Up: dmg +5 %, +5 %.
- A2 *Skullsplitter* (CD 4) — `6.2 × ATK` single, 40 % Stun (1). Up: dmg +5 %, chance +10 %, CD −1.
- A3 *Whirling Axe* (CD 5) — `2.8 × ATK` all enemies; ATK Up 25 % (2) self. Up: dmg +5 %, +5 %,
  CD −1.
- Passive *Blood Fury* — +4 % ATK per 10 % of missing HP (max +40 %).

### 4.5 Legendary

| Id | Name | El | Role | Stats | Obtain |
| --- | --- | --- | --- | --- | --- |
| `champ.aurelia_dawnwarden` | Aurelia Dawnwarden | J | Defense | 18,600 / 1,020 / 1,610 / 98 / 15 / 50 / 45 / 10 | summon |
| `champ.vorrak_bloodhowl` | Vorrak Bloodhowl | V | Attack | 15,400 / 1,720 / 960 / 100 / 20 / 70 / 25 / 0 | summon |
| `champ.seraphine_vale` | Seraphine Vale | F | Support | 16,800 / 1,180 / 1,200 / 108 / 15 / 50 / 40 / 20 | summon |
| `champ.morrigan_nightweaver` | Morrigan Nightweaver | E | Attack | 14,200 / 1,690 / 920 / 112 / 20 / 65 / 30 / 40 | summon |
| `champ.kaelith_stormcaller` | Kaelith Stormcaller | F | Attack | 14,800 / 1,660 / 940 / 106 / 20 / 60 / 30 / 30 | summon |
| `champ.eldric_chronicler` | Eldric Lorekeeper | E | Support | 17,200 / 1,150 / 1,260 / 110 / 15 / 50 / 45 / 40 | mission line only |

Kits:

**Aurelia Dawnwarden** (paladin; protection, cleanse)
- A1 *Dawn Strike* `3.2 × DEF` single, 25 % ATK Down 25 % (2). A2 *Sanctuary* (CD 4): Ally
  Protection 30 % (2) on all allies + Shield 15 % (2) self. A3 *Purifying Light* (CD 5): remove all
  debuffs from all allies; heal 15 % each. A4 *Judgement* (CD 6): `5.5 × DEF` all enemies; Block
  Buffs (2) [80 %]. Passive *Warden's Oath*: when an ally drops below 30 % HP, Aurelia grants
  them Shield 20 % (1) (once per ally per wave). Aura: +15 % DEF to all allies.
- Upgrades: A1 dmg +5/+5; A2 duration +1, CD −1, CD −1; A3 heal +5 %, +5 %, CD −1; A4 dmg +5 %,
  chance +10 %, CD −1, CD −1.

**Vorrak Bloodhowl** (AoE nuker with leech)
- A1 *Ragged Bite* `3.5 × ATK` single; heals 20 % of damage dealt. A2 *Bloodhowl* (CD 4):
  `3.1 × ATK` all enemies; 50 % Bleed 5 % (2). A3 *Feeding Frenzy* (CD 5): `2.2 × ATK` all enemies
  ×2; each kill extends by one more hit (max 5). A4 *Apex Predator* (CD 6): ATK Up 50 % (2) +
  C.RATE Up 30 % (2) self; Increase TM 100 % self. Passive *Scent of Blood*: +10 % damage to
  enemies below 50 % HP. Aura: +20 % ATK to all allies.
- Upgrades: A1 dmg +5/+5; A2 dmg +5 %, chance +10 %, CD −1; A3 dmg +5 %, +5 %, CD −1;
  A4 CD −1, CD −1, duration +1.

**Seraphine Vale** (healer with revive)
- A1 *Grace* `3.0 × ATK` single, 30 % Heal Reduction 50 % (2). A2 *Renewal* (CD 4): heal all
  allies 25 %; remove 2 debuffs. A3 *Guardian Wings* (CD 5): Revive on Death (2) on all allies
  (revive at 30 % HP). A4 *Ascension* (CD 7): revive all dead allies at 50 % HP; heal living 20 %;
  Block Debuffs (2). Passive *Halo*: every turn, heals the lowest ally 5 %. Aura: +15 % HP.
- Upgrades: A1 dmg +5/+5; A2 heal +5 %, +5 %, CD −1; A3 CD −1, CD −1, duration +1;
  A4 heal +10 %, CD −1, CD −1.

**Morrigan Nightweaver** (control nuker)
- A1 *Nightweave* `3.4 × ATK` single, 35 % Sleep (1). A2 *Shadow Lash* (CD 4): `4.2 × ATK` on the
  two highest-ATK enemies; Decrease TM 30 %. A3 *Umbral Cage* (CD 5): `2.6 × ATK` all enemies;
  70 % Stun (1); Block Buffs (2). A4 *Eclipse Requiem* (CD 6): `7.5 × ATK` single, ignores 40 %
  DEF; if it kills, all enemies lose 25 % TM. Passive *Veiled*: Morrigan cannot be targeted by A1s
  while another ally is alive (enemies retarget). Aura: +15 % SPD in campaign.
- Upgrades: A1 dmg +5 %, chance +10 %; A2 dmg +5 %, +5 %, CD −1; A3 chance +10 %, +10 %, CD −1;
  A4 dmg +5 %, +10 %, CD −1.

**Kaelith Stormcaller** (AoE DEF shred)
- A1 *Spark* `3.3 × ATK` single, 30 % DEF Down 30 % (2). A2 *Chain Lightning* (CD 4):
  `4.0 × ATK` single then `2.0 × ATK` to two random others. A3 *Thunderhead* (CD 5): `2.9 × ATK`
  all enemies, 60 % DEF Down 30 % (2). A4 *Tempest* (CD 6): `3.6 × ATK` all enemies; this hit
  crits against enemies with DEF Down. Passive *Static*: +10 % C.RATE per enemy with DEF Down
  (max +30 %). Aura: +20 % C.RATE.
- Upgrades: A1 dmg +5 %, chance +10 %; A2 dmg +5 %, +5 %, CD −1; A3 chance +10 %, +10 %, CD −1;
  A4 dmg +5 %, +5 %, CD −1.

**Eldric Lorekeeper** (mission reward; TM support + cleanse + revive-once)
- A1 *Quill Strike* `3.2 × ATK` single, 30 % SPD Down 20 % (2). A2 *Turn the Page* (CD 4):
  Increase TM 30 % all allies; remove 1 debuff each. A3 *Written Fate* (CD 5): Block Debuffs (2)
  + RES Up 40 (2) all allies. A4 *Final Chapter* (CD 7): `5.0 × ATK` all enemies; Decrease TM 50 %;
  Weaken 25 % (2). Passive *Unfinished Story*: once per battle, revives himself at 40 % HP.
  Aura: +12 % HP and +8 SPD to all allies.
- Upgrades: A1 dmg +5 %, chance +10 %; A2 TM +5 %, +5 %, CD −1; A3 duration +1, CD −1, CD −1;
  A4 dmg +5 %, TM +10 %, CD −1.

### 4.6 Mythic

| Id | Name | El | Role | Stats | Obtain |
| --- | --- | --- | --- | --- | --- |
| `champ.varkos_sundered_king` | Varkos Sunderking | E | Attack | 19,800 / 1,880 / 1,240 / 112 / 20 / 75 / 40 / 40 | summon (Primordial), featured rotation |

**Varkos Sunderking** (all-rounder)
- A1 *Sundering Blow* `3.6 × ATK` single, 40 % Weaken 25 % (2). Up: dmg +5 %, chance +10 %.
- A2 *Crown of Ash* (CD 4): `3.2 × ATK` all enemies; remove 1 buff from each; heal self 15 % of
  damage dealt. Up: dmg +5 %, +5 %, CD −1.
- A3 *Sovereign Will* (CD 5): ATK Up 30 % + DEF Up 30 % + Block Debuffs (2) on all allies.
  Up: duration +1, CD −1, CD −1.
- A4 *The Kingdom Falls* (CD 6): `8.0 × ATK` single, ignores 50 % DEF; if it kills, deals
  `2.0 × ATK` to all remaining enemies and Varkos gains an extra turn. Up: dmg +5 %, +10 %, CD −1.
- Passive *Sundered*: once per battle, revives at 50 % HP with Shield 30 % (2). Takes 15 % less
  damage from Eclipse enemies.
- Aura: +18 % ATK and +10 % HP to all allies.

## 5. Growth

| Track | How | Where |
| --- | --- | --- |
| Level | Brews (element-matching = 1.5× XP, universal = 1×) and food champions; gold cost | Tavern → Upgrade Level |
| Rank (stars) | Consume `n` champions of `n★` to go `n★ → (n+1)★`; gold cost | Tavern → Upgrade Rank |
| Skills | One upgrade step per Skill Tome of the champion's rarity (Rare/Epic/Legendary/Mythic); duplicates are ordinary copies | Tavern → Upgrade Skills |
| Gear | Six slots; `GEAR.md` | Champion → Gear |

Champion XP curve, rank-up gold costs and food XP values are in `ECONOMY.md` §3.

## 6. Champion instance data (save)

```
ChampionInstance {
  instanceId, defId, level, xp, stars, skillUpgrades: { [abilityId]: stepCount },
  gear: { [slot]: gearInstanceId | null }, locked: boolean, favourite: boolean,
  acquiredAt, source
}
```

Total stats are recomputed on demand: `base(star, level) → + gear flat → × (1 + gear% + set%) →
+ aura → battle buffs`.

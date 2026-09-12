# USER_QUESTIONS.md — Open questions for the owner

Each question states **why it matters** and the **default** the plan (and later the code) uses
until you answer. Nothing here blocks development: defaults are implemented in a way that is
trivially switchable. Answer inline (edit this file) or in chat; answered items move to §2 and
the affected docs/content are updated with a changelog note.

## 1. Open

### Q1 — Seven Epic models vs "5 Epic" in the brief
**Why.** `/game/assets/champions` contains seven finished `epic_*` models; the brief lists 5 Epics.
**Default.** Use all seven as Epics (roster 23: 3/3/3/7/6/1). Alternative: keep 5 and hold two
models back (two-line content change), or promote two to Legendary (changes kits).
Which do you prefer?

### Q2 — Team size
**Why.** Affects battle layout, balance and every reference screen (RSL uses 4 in campaign, 5 in
bosses; Infinite Magicraid 5).
**Default.** 5 champions in every battle type; early stages can be cleared with fewer.

### Q3 — Daily / weekly reset time
**Why.** Keys, quests and the featured rotation depend on it.
**Default.** Daily 04:00 local device time; weekly Monday 04:00 local. Alternative: UTC midnight.

### Q4 — Tutorial skipping
**Why.** The brief asks for a fully working tutorial; some players replay or know the genre.
**Default.** Chapter 1 (Awakening) cannot be skipped; every later chapter offers "Skip this
lesson" after its first dialogue.

### Q5 — Market / Shop in EA-0.1?
**Why.** Not listed in the EA-0.1 features but present in the hub references; gems currently spend
only on shards and energy.
**Default.** Not in EA-0.1 (backlog). The Portal has an Exchange tab (Gold→Faded, Gems→Ancient/
Sacred) so gems have sinks.

### Q6 — Naming canon
**Why.** Names appear in text, ids and art requests.
**Default.** World *Veyrath*, hub *Emberhold*, guide *Eldric the Chronicler*, bosses *Gravemaw*
and *Nyxara*, mission line *The Chronicler's Path*, shards *Faded/Ancient/Sacred/Primordial*, the
12 settlement names in `docs/design/CAMPAIGN.md` §6, invented champion names in
`docs/design/CHAMPIONS.md` §4. Rename anything you like.

### Q7 — Gear slots
**Why.** Six slots keep EA-0.1 focused; references show nine (with accessories).
**Default.** Six (Weapon, Helmet, Shield, Gauntlets, Chestplate, Boots); accessories in backlog.

### Q8 — Skill upgrades via duplicates
**Why.** Duplicates as an alternative to tomes changes the value of pulling the same champion.
**Default.** Both work: one tome of the champion's rarity **or** one duplicate = one upgrade step.

### Q9 — Ascension / Awakening
**Why.** RSL-style ascension adds a long tail but also a fifth growth track to explain.
**Default.** Not in EA-0.1 (backlog). Growth = Level, Rank, Skills, Gear.

### Q10 — Window handling
**Why.** "Feels like a game" vs. flexible browser window.
**Default.** Fixed 16:9 virtual 1920×1080, uniformly scaled, letterbox filled with the backdrop;
no mobile layout. Fullscreen toggle in settings and `F11`.

### Q11 — Fonts
**Why.** Sans-serif only; the trio must be approved since it defines the look.
**Default.** Alegreya Sans SC (display), Nunito Sans (body), Rajdhani (numerals) — all OFL.

### Q12 — Language
**Why.** UI strings are i18n keys from day one; the shipped language matters for copy review.
**Default.** English only in EA-0.1; German is the first backlog localization.

### Q13 — Save slots
**Why.** Multiple chronicles per browser add UI and testing surface.
**Default.** One save + rolling backups + export/import. Multiple slots in backlog.

### Q14 — Starter choice
**Why.** Defines the first hour.
**Default.** Choose one of three Rares (Sister Maelis — healer, Ser Corvin — tank, Reva
Ashblade — damage); the game also grants the three Commons (Gil, Wenna, Bran) so the first
battles have a full line. The other two starters are obtainable from Faded Shards.

### Q15 — Energy refill limit
**Why.** Unlimited gem refills let a player burn all gems on energy.
**Default.** Unlimited at 50 gems per +60 energy. Alternative: 3 refills/day.

### Q16 — Hard / speed unlock strictness
**Why.** "Complete all 12 settlements" could mean 1★ or 3★.
**Default.** Clearing (1★) all 120 stages of a difficulty unlocks the next difficulty and the
speed step. 3★ is rewarded separately with star chests and milestones.

### Q17 — Auto-repeat
**Why.** Not in the brief, but standard for the idle farming loop.
**Default.** Included in the Campaign phase (×10 at level 5, ×25 at 20, ×50 at 30), battles still
render at the selected speed; instant "skip" is backlog.

### Q18 — Turn limits
**Why.** Fights must end; limits shape team building.
**Default.** Campaign defeat at 40 ally turns (50 boss stage), 3★ at ≤ 25 (30); Daily Boss 50
turns; Weekly Boss 100 turns.

### Q19 — Rarity of Eldric and mission-line reward
**Why.** The reference (Arbiter) is a Legendary obtained only through missions.
**Default.** Eldric the Chronicler is a Legendary Eclipse Support, never summonable; final reward
of the 120-mission line plus a 6★ Legendary gear piece of choice and 500 Gems.

### Q20 — Inventory capacity
**Default.** 400 gear pieces, warning at 90 %, overflow buffer of 20.

### Q21 — Element wheel
**Why.** The brief: minimal but present.
**Default.** ±10 % damage and ±10 crit rate; no glancing/weak-hit mechanic (constant present but 0).

### Q22 — Placeholder look
**Why.** Until models arrive, many champions/enemies share the lizard model.
**Default.** Per-definition colour tint + rarity ring + name/element sigil; bosses scaled up.

### Q23 — Branching / pushing
**Why.** The brief says everything goes to `main`; automated sessions may be assigned a working
branch (this planning session pushed to `claude/brave-thompson-7gwokb`).
**Default.** Work lands on the assigned branch and you fast-forward merge to `main`; if you
prefer, grant direct pushes to `main` for future sessions.

### Q24 — Additional CC0 assets
**Why.** UI/battle SFX and particle sprites are needed for the feel the brief asks for; none are
in `/game`.
**Default.** Source CC0 packs (Kenney UI/impact/RPG audio, Kenney particles) and record them in
`docs/tech/CREDITS.md`. Tell me if you will provide your own SFX instead.

## 2. Answered

_(none yet)_

# Summoning Portal

Related: `CHAMPIONS.md` §4 (pool), `ECONOMY.md` §2 (shards, gems), `docs/tech/UI_DESIGN.md` §5.12.

Summoning is the main way to obtain strong champions. It is entirely local: rates, pity counters
and the featured rotation are deterministic and stored in the save. Shipped in `0.0.8`; the
numbers live in `src/content/balance/summon.ts`, the rules in `src/engine/summon/*`.

## 1. Shards

| Shard | Pool | Rates | Exchange |
| --- | --- | --- | --- |
| Faded | Common, Uncommon, Rare | C 60 / U 30 / R 10 | 5,000 Gold |
| Ancient | Rare, Epic, Legendary | R 91 / E 8 / L 1 | 300 Gems |
| Sacred | Epic, Legendary | E 92 / L 8 | 900 Gems |
| Primordial | Epic, Legendary, Mythic | E 40 / L 55 / M 5 | not sold |

Within a rarity, every champion in the pool is equally likely unless featured (§3). Eldric
Lorekeeper is never in any pool. Champions are never "exclusive" to a shard type.

## 2. Pity ("Mercy")

| Shard | Rule |
| --- | --- |
| Ancient | Guaranteed Epic or better within 20 pulls without one; Legendary chance +1 pp per pull after 100 without a Legendary, guaranteed at 200 |
| Sacred | Guaranteed Legendary within 15 pulls without one |
| Primordial | Guaranteed Mythic within 50 pulls without one (Mythic chance +0.5 pp per pull after 20) |

Counters are per shard type, persist across banners, and are shown on the portal ("Legendary in
at most 143 more"). A guarantee replaces the *result* of the rarity roll, not the roll itself, so
a saved chronicle replays its summons exactly. A soft climb is taken out of the commonest rarity
on the row, so the table always sums to 100 and mercy can never make a shard more generous overall
than this table says.

## 3. Banners

### Standard Portal
Always available; the four shard types above.

### Featured Banner
A 14-day rotation computed from a fixed **UTC** epoch (`ROTATION_EPOCH = 2026-01-05T00:00Z`) so no
server is needed and the same instant gives the same rotation in every time zone. Each rotation features **1 Legendary + 2 Epics**; featured champions get ×2 weight
inside their rarity bucket for Ancient and Sacred pulls. Every 4th rotation is a **Primordial
Rotation**: Varkos is featured (Mythic chance stays 5 % but the pity counter accelerates: +1 pp
per pull after 10).

| Rotation | Legendary | Epics |
| --- | --- | --- |
| 1 | Aurelia Dawnwarden | Khazgor, Maruan |
| 2 | Vorrak Bloodhowl | Thordakk, Sethlurias |
| 3 | Seraphine Vale | Maruan, Anuria |
| 4 (Primordial) | Morrigan Nightweaver | Rattledagger, Darius |
| 5 | Kaelith Stormcaller | Anuria, Darius |
| 6 | Aurelia Dawnwarden | Khazgor, Thordakk |
| … | cycle continues from 1 with the Legendary list rotated by one | |

The banner card shows the featured champions with idle sprites, the rotation timer, rates and the
player's pity counters.

### Where a banner's featured weight applies
Featured champions are weighted only on the Featured Banner and only inside their own rarity
bucket — a featured Epic does not make Epics likelier, it makes *that* Epic likelier among them.
The Standard Gate never favours anybody.

## 4. Free and scheduled summons

- One **free Ancient Shard** during the tutorial (guaranteed Epic on that pull: Khazgor if the
  starter is an attacker, Anuria otherwise — deterministic, see `TUTORIAL.md`).
- Daily quest "Summon a champion" and a daily Faded Shard from the login step of the daily quests.
- Star chests, first clears, missions and bosses supply shards on a curve that yields roughly
  3 Ancient + 0.5 Sacred per week mid-game, before gem purchases.

## 5. The reveal ritual (presentation)

The Portal is the heart of the game, and a press is the moment it exists for: the ritual is built to
make the wait tense and the answer land. A Pixi scene on backdrop `bg9` (the violet gate), driven by
its own clock off a beat sheet (`render/summon/choreography.ts`), so what happens when is a table a
test can read.

**At rest.** The chosen shard hangs in the rune ring as a faceted crystal, cut and coloured after
its icon — the Faded a rough mossy stone lit green, the Ancient a tall sapphire lit amber, the
Sacred a broad citrine lit gold, the Primordial a garnet cluster with teal fire in its veins. It
turns slowly, bobs, and a sheen crosses it now and then; a vortex turns behind it and runes glint
round the ring. Choosing another shard dissolves one crystal and forms the next out of light.

**1. The charge (1.15 s).** The lights go down. The runes kindle one after another from the top,
light spirals in out of the dark and falls into the crystal, the vortex quickens, the camera leans
in, and a riser swells under it all.

**2. The tells (0.46 s each).** The gate *tells*: one pulse for every rarity from the shard's floor
up to the answer — an Ancient Shard always shows blue first, and every step past it is a better
pull than the shard promised. Each tell recolours the light, cracks the crystal further, throws a
ring of light and sparks, and rings a crystal note a whole tone higher per rarity up the ladder, so
gold always sounds the same bright note and a player learns to hear it coming.

**3. The held breath (0.62 s).** Before gold, and again before rose, the gate stalls: the light
drains, the vortex and the ring all but stop, the inflow dies, the music ducks and two heartbeats
are all there is — then the tell lands harder than the others, with a second ring and a glimpse of
its colour across the whole screen. The moment the player hopes for is the moment it makes them
wait.

**4. The wind-up (0.3 s) and the burst.** Everything is drawn back into the crystal — a rush of
light, the camera pulling in, a reversed swell — and the crystal gives. It shatters into its own
facets, and the burst is weighed by the answer (`BURST_WEIGHT`):

| Rarity | Shockwaves | Sparks | Camera kick | Flash | Pillar |
| --- | --- | --- | --- | --- | --- |
| Common | 1 | 40 | light | faint | — |
| Uncommon | 1 | 55 | light | faint | — |
| Rare | 1 | 80 | firm | soft | — |
| Epic | 2 | 110 | hard | bright | — |
| Legendary | 2 | 150 | harder | white-out | gold, with embers rising in it |
| Mythic | 3 | 180 | hardest | white-out | rose, and the burst in slow motion |

Rays stand up behind the gate in the answer's colour and stay, with a halo and (for gold and rose)
the pillar, as the backlight the cards land in front of. A shatter plays under every burst and the
rarity's own reveal over it; a Legendary or a Mythic ducks the music for the room.

**5. The cards.** One card spins in out of the gate, turning twice on its way; its stars pop in one
by one with a rising ping, and its rarity is stamped under it — loudly, with a seal's thud, for an
Epic or better — above its name and "NEW" or "Duplicate — rank-up material". Ten are dealt out of
the gate face down in a 5×2 grid, backed with the shard that bought them, and turned over one by
one with a flip each; an Epic or better turns with a stamp, and the best of the ten waits a breath
longer and turns last, marked *Best of the ten*.

**6. The results**, under the gate where the shard's nameplate stands (it steps aside for them):
"Continue", "Summon again" (if shards remain), "View champion".

While the press plays out the gate rises over the Portal's own panels, under a dimming scrim, so the
burst's rings, rays and pillar cross the whole screen.

Skipping is always allowed (respect the player's time): it cuts the ritual to its burst — still seen
and heard — and turns every card at once, so the result is the one the ritual was going to show.
The gate also lands itself: the shards are spent before it lights, so a ceremony starved of frames
is landed at its burst three seconds past its own length, and the cards come regardless of the gate
after twelve — a press that shows nothing is the one outcome a summon may never have. Under reduced
motion the beats are shorter, nothing stalls, the camera stays still, the flash is faint and the
cards land at once.

Rates and mercy for all four shards are one tap away, as is the history — the last `HISTORY_LIMIT`
(200) pulls, newest first, each row opening the champion it became.

### The champion picker
Some rewards are a champion of the player's choosing rather than a roll: Intro's all-3★ milestone
chest is an Epic (`CAMPAIGN.md` §7). The picker offers every summonable champion of the named
rarity, owned ones included — a second copy is rank-up material and a fine thing to want.

Which choices are *owed* is derived from the campaign's stars (`CHAMPION_CHOICES` in
`balance/campaign.ts`); the save stores only which have been taken. A chronicle that mastered a
difficulty before the Portal existed is therefore owed its champion the moment it opens the
Portal, and one that has taken it is never owed a second.

## 6. Content shape

```ts
defineBanner({
  id: 'banner.standard', kind: 'standard',
  shards: { faded: { table: [['common',60],['uncommon',30],['rare',10]] }, ... },
});
defineBanner({
  id: 'banner.featured', kind: 'featured', rotationDays: 14, epoch: '2026-01-05T00:00',
  rotations: [{ legendary: 'champ.aurelia_dawnwarden', epics: ['champ.khazgor','champ.maruan'] }, ...],
  featuredWeight: 2,
});
```
Pity constants: `balance/summon.ts`.

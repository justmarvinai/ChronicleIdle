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

Within a rarity, every champion in the pool is equally likely unless featured (§3). Eldric the
Chronicler is never in any pool. Champions are never "exclusive" to a shard type.

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

Pixi scene on backdrop `bg9` (the violet gate) with the shard hovering in the ring:

1. Shard drops into the ring; ring runes light up in sequence (0.6 s).
2. Cracks spread; light leaks in the **rarity colour** (grey/green/blue/purple/gold/rose) but the
   colour is only fully revealed on burst (0.5 s). Legendary: gold pillar + screen flash + bass hit;
   Mythic: rose pillar, slow-motion, shockwave, particles, unique chime.
3. Champion card slams in (rarity frame, element sigil, name, role); sprite idles; "NEW" ribbon if
   first copy; duplicates show "Duplicate — rank-up material".
4. ×10: cards reveal in a 5×2 grid in sequence (fast-tap skips to results); best rarity reveals last.
5. Results panel: "Continue", "Summon again" (if shards remain), "View champion".

Skipping is always allowed (respect the player's time): it cuts the running timeline to its end,
so the result is the one the ritual was going to show. The gate also cuts itself short: the shards
are spent before it lights, so a ceremony starved of frames is landed at its end after six seconds
and the cards go on regardless — a press that shows nothing is the one outcome a summon may never
have.

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

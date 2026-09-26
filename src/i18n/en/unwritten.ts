/**
 * The Unwritten's strings (docs/design/UNWRITTEN.md). They ship in the mode's own chunk and join
 * the dictionary through `registerStrings` when its screen loads (ADR-049, ADR-050), so the first
 * screen never carries them. Content lines read their numbers from the content's `show` tables:
 * `{a}` in an inscription's line is its level's `a`, `{cost}` in a Mystery's hint is the gilt the
 * choice spends.
 */
export const unwritten = {
  // ── The mode ─────────────────────────────────────────────────────────────────────────────
  'unwritten.title': 'The Unwritten',
  'unwritten.subtitle': 'An expedition into the pages the Chronicle never finished',

  // ── Inks and their illuminations ─────────────────────────────────────────────────────────
  'unwritten.ink.gold.name': 'Gold Ink',
  'unwritten.ink.gold.virtue': 'The Law — shields, retribution, judgement',
  'unwritten.ink.gold.illumination.1':
    'Every champion begins each wave behind a [Shield] worth {a}% of their max HP for {t} turns.',
  'unwritten.ink.gold.illumination.2':
    'Every champion begins each wave behind a [Shield] worth {a}% of their max HP, with [Counterattack], both for {t} turns.',
  'unwritten.ink.crimson.name': 'Crimson Ink',
  'unwritten.ink.crimson.virtue': 'Valour — the kill, the critical, the charge',
  'unwritten.ink.crimson.illumination.1': 'Every champion has +{a}% C.RATE.',
  'unwritten.ink.crimson.illumination.2':
    'Every champion has +{a}% C.RATE and +{b}% C.DMG, and each kill fills {c}% of the killer’s Turn Meter.',
  'unwritten.ink.azure.name': 'Azure Ink',
  'unwritten.ink.azure.virtue': 'Faith — mending, cleansing, rising again',
  'unwritten.ink.azure.illumination.1':
    'Every champion heals {a}% of their max HP at the start of their turn.',
  'unwritten.ink.azure.illumination.2':
    'Every champion heals {a}% of their max HP at the start of their turn, and once a fight survives a killing blow at {b}% HP.',
  'unwritten.ink.violet.name': 'Violet Ink',
  'unwritten.ink.violet.virtue': 'The Eclipse — venom, hexes, the slow end',
  'unwritten.ink.violet.illumination.1':
    'Every champion’s hits have a {a}% chance to place [Poison] for {t} turns.',
  'unwritten.ink.violet.illumination.2':
    'Every champion’s hits have a {a}% chance to place [Poison] for {t} turns, and deal {b}% more damage to a poisoned foe.',

  // ── Inscriptions: Gold ───────────────────────────────────────────────────────────────────
  'unwritten.inscription.oath_of_iron.name': 'Oath of Iron',
  'unwritten.inscription.oath_of_iron.text': '{a}% more DEF.',
  'unwritten.inscription.vow_of_the_wall.name': 'Vow of the Wall',
  'unwritten.inscription.vow_of_the_wall.text': '{a}% more HP.',
  'unwritten.inscription.stalwart.name': 'Stalwart',
  'unwritten.inscription.stalwart.text': 'Takes {a}% less damage.',
  'unwritten.inscription.first_light.name': 'First Light',
  'unwritten.inscription.first_light.text':
    'Begins each wave behind a [Shield] worth {a}% of their max HP for {t} turns.',
  'unwritten.inscription.retribution.name': 'Retribution',
  'unwritten.inscription.retribution.text': '{a}% chance to counterattack when hit.',
  'unwritten.inscription.sentence.name': 'Sentence',
  'unwritten.inscription.sentence.text': 'Deals {a}% more damage to foes below {h}% HP.',
  'unwritten.inscription.verdict.name': 'Verdict',
  'unwritten.inscription.verdict.text':
    'When hit, a {a}% chance to place [Weaken] on the attacker for {t} turns.',
  'unwritten.inscription.the_last_word.name': 'The Last Word',
  'unwritten.inscription.the_last_word.text':
    'On falling, gives every ally a [Shield] worth {a}% of this champion’s max HP and [Counterattack], both for {t} turns.',
  'unwritten.inscription.shieldbearers_rite.name': 'Shieldbearer’s Rite',
  'unwritten.inscription.shieldbearers_rite.text':
    'When an ally is hit below {h}% HP, gives them a [Shield] worth {a}% of their max HP for {t} turns — once per ally each wave.',
  'unwritten.inscription.kinship_of_gold.name': 'Kinship of Gold',
  'unwritten.inscription.kinship_of_gold.text': '{a}% more HP and DEF.',
  'unwritten.inscription.aegis_oath.name': 'Aegis Oath',
  'unwritten.inscription.aegis_oath.text':
    'Begins each wave with [DEF Up] for {a} turns and [Counterattack] for {b} turns.',
  'unwritten.inscription.unbending.name': 'Unbending',
  'unwritten.inscription.unbending.text': 'Takes {a}% less damage while below {h}% HP.',

  // ── Inscriptions: Crimson ────────────────────────────────────────────────────────────────
  'unwritten.inscription.bloodlust.name': 'Bloodlust',
  'unwritten.inscription.bloodlust.text': '{a}% more ATK.',
  'unwritten.inscription.keen_edge.name': 'Keen Edge',
  'unwritten.inscription.keen_edge.text': '+{a}% C.RATE.',
  'unwritten.inscription.savagery.name': 'Savagery',
  'unwritten.inscription.savagery.text': 'Deals {a}% more damage.',
  'unwritten.inscription.cruel_strokes.name': 'Cruel Strokes',
  'unwritten.inscription.cruel_strokes.text': '+{a}% C.DMG.',
  'unwritten.inscription.momentum.name': 'Momentum',
  'unwritten.inscription.momentum.text': 'Each kill fills {a}% of their Turn Meter.',
  'unwritten.inscription.berserkers_due.name': 'Berserker’s Due',
  'unwritten.inscription.berserkers_due.text':
    'Deals {a}% more damage for every {s}% of HP they are missing, up to {b}%.',
  'unwritten.inscription.headsman.name': 'Headsman',
  'unwritten.inscription.headsman.text': 'Critical hits deal {a}% more damage to foes below {h}% HP.',
  'unwritten.inscription.frenzy_of_valor.name': 'Frenzy of Valour',
  'unwritten.inscription.frenzy_of_valor.text':
    'Takes another turn after every kill, and deals {a}% more damage.',
  'unwritten.inscription.opening_salvo.name': 'Opening Salvo',
  'unwritten.inscription.opening_salvo.text': 'Begins each wave with [ATK Up] for {a} turns.',
  'unwritten.inscription.bleeding_edge.name': 'Bleeding Edge',
  'unwritten.inscription.bleeding_edge.text': 'Hits have a {a}% chance to place [Bleed] for {t} turns.',
  'unwritten.inscription.kinship_of_crimson.name': 'Kinship of Crimson',
  'unwritten.inscription.kinship_of_crimson.text': '{a}% more ATK and +{b}% C.RATE.',
  'unwritten.inscription.relentless.name': 'Relentless',
  'unwritten.inscription.relentless.text': 'A {a}% chance to take another turn after each of their turns.',

  // ── Inscriptions: Azure ──────────────────────────────────────────────────────────────────
  'unwritten.inscription.blessed_vigor.name': 'Blessed Vigour',
  'unwritten.inscription.blessed_vigor.text': '{a}% more HP.',
  'unwritten.inscription.mending_hymn.name': 'Mending Hymn',
  'unwritten.inscription.mending_hymn.text': 'Heals {a}% of their max HP at the start of their turn.',
  'unwritten.inscription.harvest_hymn.name': 'Harvest Hymn',
  'unwritten.inscription.harvest_hymn.text':
    'After every victory, the whole company heals {a}% of its max HP.',
  'unwritten.inscription.regrowth.name': 'Regrowth',
  'unwritten.inscription.regrowth.text': 'Begins each wave with [Continuous Heal] for {a} turns.',
  'unwritten.inscription.purifying_light.name': 'Purifying Light',
  'unwritten.inscription.purifying_light.text':
    'At the start of their turn, below {a}% HP, removes one debuff from themself.',
  'unwritten.inscription.martyrs_grace.name': 'Martyr’s Grace',
  'unwritten.inscription.martyrs_grace.text': 'On falling, heals every ally {a}% of their max HP.',
  'unwritten.inscription.second_dawn.name': 'Second Dawn',
  'unwritten.inscription.second_dawn.text':
    'Once a fight, at the start of a wave, places [Revive on Death] on the weakest ally for {t} turns: if they fall, they rise with {a}% HP.',
  'unwritten.inscription.undying_chorus.name': 'Undying Chorus',
  'unwritten.inscription.undying_chorus.text': 'Once a fight, survives a killing blow and stands at {a}% HP.',
  'unwritten.inscription.steadfast_soul.name': 'Steadfast Soul',
  'unwritten.inscription.steadfast_soul.text': '+{a} RES.',
  'unwritten.inscription.mercy.name': 'Mercy',
  'unwritten.inscription.mercy.text': 'Whoever they heal gains [DEF Up] for {a} turns.',
  'unwritten.inscription.kinship_of_azure.name': 'Kinship of Azure',
  'unwritten.inscription.kinship_of_azure.text': '{a}% more HP and +{b} RES.',
  'unwritten.inscription.benediction.name': 'Benediction',
  'unwritten.inscription.benediction.text':
    'At the start of each wave, removes every debuff from the company, places [Block Debuffs] on every ally for {t} turns and heals them {a}% of their max HP.',

  // ── Inscriptions: Violet ─────────────────────────────────────────────────────────────────
  'unwritten.inscription.siphon.name': 'Siphon',
  'unwritten.inscription.siphon.text': 'Heals for {a}% of the damage they deal.',
  'unwritten.inscription.venom_ink.name': 'Venom Ink',
  'unwritten.inscription.venom_ink.text': 'Hits have a {a}% chance to place [Poison] for {t} turns.',
  'unwritten.inscription.plague_bearer.name': 'Plague-Bearer',
  'unwritten.inscription.plague_bearer.text': 'Foes heal {a}% less.',
  'unwritten.inscription.malediction.name': 'Malediction',
  'unwritten.inscription.malediction.text':
    'Deals {a}% more damage for each debuff on the target, up to {b}%.',
  'unwritten.inscription.hex_of_weakness.name': 'Hex of Weakness',
  'unwritten.inscription.hex_of_weakness.text': 'Hits have a {a}% chance to place [Weaken] for {t} turns.',
  'unwritten.inscription.nightfall.name': 'Nightfall',
  'unwritten.inscription.nightfall.text': 'At the start of each wave, drains {a}% of every foe’s Turn Meter.',
  'unwritten.inscription.blood_pact.name': 'Blood Pact',
  'unwritten.inscription.blood_pact.text': 'Deals {a}% more damage, but has {c}% less HP.',
  'unwritten.inscription.the_black_page.name': 'The Black Page',
  'unwritten.inscription.the_black_page.text':
    'Their [Poison] deals {a}% more damage, and their hits have a {b}% chance to place it for {t} turns.',
  'unwritten.inscription.death_knell.name': 'Death Knell',
  'unwritten.inscription.death_knell.text':
    'On a kill, a {a}% chance to place [Poison] for {t} turns on the foes beside the fallen.',
  'unwritten.inscription.creeping_dread.name': 'Creeping Dread',
  'unwritten.inscription.creeping_dread.text':
    'At the start of each wave, a {a}% chance to place [SPD Down] on every foe for {t} turns.',
  'unwritten.inscription.kinship_of_violet.name': 'Kinship of Violet',
  'unwritten.inscription.kinship_of_violet.text': '{a}% more ATK and +{b} ACC.',
  'unwritten.inscription.sapping_touch.name': 'Sapping Touch',
  'unwritten.inscription.sapping_touch.text':
    'Hits have a {a}% chance to drain {m}% of the target’s Turn Meter.',

  // ── Inscriptions: blends ─────────────────────────────────────────────────────────────────
  'unwritten.inscription.crusaders_zeal.name': 'Crusader’s Zeal',
  'unwritten.inscription.crusaders_zeal.text': 'Deals {a}% more damage while behind a [Shield].',
  'unwritten.inscription.sanctified_ground.name': 'Sanctified Ground',
  'unwritten.inscription.sanctified_ground.text':
    'Begins each wave behind a [Shield] worth {a}% of their max HP, with [Continuous Heal], both for {t} turns.',
  'unwritten.inscription.iron_maiden.name': 'Iron Maiden',
  'unwritten.inscription.iron_maiden.text':
    'When hit, a {a}% chance to place [Poison] on the attacker for {t} turns.',
  'unwritten.inscription.battle_hymn.name': 'Battle Hymn',
  'unwritten.inscription.battle_hymn.text': 'Each kill heals every ally {a}% of their max HP.',
  'unwritten.inscription.sanguine_frenzy.name': 'Sanguine Frenzy',
  'unwritten.inscription.sanguine_frenzy.text':
    'Deals {a}% more damage to a foe with a debuff, and heals for {l}% of the damage they deal.',
  'unwritten.inscription.martyrdom.name': 'Martyrdom',
  'unwritten.inscription.martyrdom.text':
    'On falling, places two [Poison] on every foe for {t} turns and heals every ally {a}% of their max HP.',

  // ── Relics ───────────────────────────────────────────────────────────────────────────────
  'unwritten.relic.hourglass_of_embers.name': 'Hourglass of Embers',
  'unwritten.relic.hourglass_of_embers.text': 'Every champion begins each wave with {a}% Turn Meter.',
  'unwritten.relic.thornmail_shard.name': 'Thornmail Shard',
  'unwritten.relic.thornmail_shard.text': 'Every champion has a {a}% chance to counterattack when hit.',
  'unwritten.relic.wyrmscale_charm.name': 'Wyrmscale Charm',
  'unwritten.relic.wyrmscale_charm.text': 'Every champion takes {a}% less damage.',
  'unwritten.relic.sigil_of_haste.name': 'Sigil of Haste',
  'unwritten.relic.sigil_of_haste.text': 'Every champion has +{a} SPD.',
  'unwritten.relic.heartseeker_lens.name': 'Heartseeker Lens',
  'unwritten.relic.heartseeker_lens.text': 'Every champion has +{a}% C.RATE.',
  'unwritten.relic.vial_of_nightshade.name': 'Vial of Nightshade',
  'unwritten.relic.vial_of_nightshade.text':
    'Every champion’s hits have a {a}% chance to place [Poison] for {t} turns.',
  'unwritten.relic.aegis_fragment.name': 'Aegis Fragment',
  'unwritten.relic.aegis_fragment.text':
    'Every champion begins each wave behind a [Shield] worth {a}% of their max HP for {t} turns.',
  'unwritten.relic.iron_lung.name': 'Iron Lung',
  'unwritten.relic.iron_lung.text': 'Every champion has {a}% more HP.',
  'unwritten.relic.broken_quill.name': 'Broken Quill',
  'unwritten.relic.broken_quill.text': 'Every offer shows {a} more inscription to choose from.',
  'unwritten.relic.gilded_tongue.name': 'Gilded Tongue',
  'unwritten.relic.gilded_tongue.text': 'The Peddler charges {a}% less.',
  'unwritten.relic.pilgrims_lantern.name': 'Pilgrim’s Lantern',
  'unwritten.relic.pilgrims_lantern.text': 'A rest at the Shrine heals {a}% more.',
  'unwritten.relic.candle_of_vigil.name': 'Candle of Vigil',
  'unwritten.relic.candle_of_vigil.text': 'After every victory, the company heals {a}% of its max HP.',
  'unwritten.relic.ledger_of_debts.name': 'Ledger of Debts',
  'unwritten.relic.ledger_of_debts.text': 'Every Elite and Warden beaten pays {a} more gilt.',
  'unwritten.relic.wardens_horn.name': 'Warden’s Horn',
  'unwritten.relic.wardens_horn.text': 'Wardens have {a}% less HP.',
  'unwritten.relic.phoenix_feather.name': 'Phoenix Feather',
  'unwritten.relic.phoenix_feather.text':
    'The first champion to fall rises after that fight with {a}% of their health. Once an expedition.',
  'unwritten.relic.chroniclers_inkwell.name': 'Chronicler’s Inkwell',
  'unwritten.relic.chroniclers_inkwell.text': 'Every passage finished recovers {a} more Page.',
  'unwritten.relic.eclipse_shard.name': 'Eclipse Shard',
  'unwritten.relic.eclipse_shard.text': 'Every champion deals {a}% more damage but has {b}% less HP.',
  'unwritten.relic.wardens_bane.name': 'Warden’s Bane',
  'unwritten.relic.wardens_bane.text': 'Every champion deals {a}% more damage in a Warden’s fight.',
  'unwritten.relic.huntsmans_mark.name': 'Huntsman’s Mark',
  'unwritten.relic.huntsmans_mark.text': 'Every champion deals {a}% more damage in an Elite’s fight.',
  'unwritten.relic.choir_bell.name': 'Choir Bell',
  'unwritten.relic.choir_bell.text': 'Every champion heals {a}% of their max HP at the start of their turn.',
  'unwritten.relic.scholars_loupe.name': 'Scholar’s Loupe',
  'unwritten.relic.scholars_loupe.text':
    'Every inscription offered has a {a}% chance to be one rarity higher.',
  'unwritten.relic.mercenarys_seal.name': 'Mercenary’s Seal',
  'unwritten.relic.mercenarys_seal.text': 'Echoes join with {a} more star, and at full health.',
  'unwritten.relic.twin_moons.name': 'Twin Moons',
  'unwritten.relic.twin_moons.text': 'An ink illuminates with {a} inscription fewer.',
  'unwritten.relic.the_last_page.name': 'The Last Page',
  'unwritten.relic.the_last_page.text':
    'The first time the whole company would fall, every champion rises with {a}% of their health instead.',

  // ── Blots ────────────────────────────────────────────────────────────────────────────────
  'unwritten.blot.smudged_offer.name': 'Smudged Offer',
  'unwritten.blot.smudged_offer.text': 'Every offer shows {a} inscription fewer.',
  'unwritten.blot.heavy_ink.name': 'Heavy Ink',
  'unwritten.blot.heavy_ink.text': 'Every champion has {a} less SPD.',
  'unwritten.blot.bleeding_margin.name': 'Bleeding Margin',
  'unwritten.blot.bleeding_margin.text':
    'After every fight won, each champion who fought loses {a}% of their max HP.',
  'unwritten.blot.ill_omen.name': 'Ill Omen',
  'unwritten.blot.ill_omen.text': 'Elites have {a}% more HP.',
  'unwritten.blot.torn_purse.name': 'Torn Purse',
  'unwritten.blot.torn_purse.text': 'Fights pay {a}% less gilt.',
  'unwritten.blot.frayed_binding.name': 'Frayed Binding',
  'unwritten.blot.frayed_binding.text': 'A rest at the Shrine heals {a}% less.',
  'unwritten.blot.creeping_rot.name': 'Creeping Rot',
  'unwritten.blot.creeping_rot.text': 'Every foe’s hits have a {a}% chance to place [Poison] for {t} turns.',
  'unwritten.blot.brittle_will.name': 'Brittle Will',
  'unwritten.blot.brittle_will.text': 'Every champion has {a} less RES.',

  // ── Affixes ──────────────────────────────────────────────────────────────────────────────
  'unwritten.affix.vampiric.name': 'Vampiric',
  'unwritten.affix.vampiric.text': 'Heals for {a}% of the damage it deals.',
  'unwritten.affix.thorned.name': 'Thorned',
  'unwritten.affix.thorned.text': 'A {a}% chance to counterattack when hit.',
  'unwritten.affix.unyielding.name': 'Unyielding',
  'unwritten.affix.unyielding.text': 'Once a fight, survives a killing blow at {a}% HP.',
  'unwritten.affix.frenzied.name': 'Frenzied',
  'unwritten.affix.frenzied.text': 'Deals {a}% more damage below {h}% HP.',
  'unwritten.affix.warded.name': 'Warded',
  'unwritten.affix.warded.text': 'Takes {a}% less damage.',
  'unwritten.affix.swift.name': 'Swift',
  'unwritten.affix.swift.text': '+{a} SPD.',
  'unwritten.affix.regenerating.name': 'Regenerating',
  'unwritten.affix.regenerating.text': 'Heals {a}% of its max HP at the start of its turn.',
  'unwritten.affix.hexing.name': 'Hexing',
  'unwritten.affix.hexing.text': 'Hits have a {a}% chance to place [Weaken] for {t} turns.',

  // ── Omens ────────────────────────────────────────────────────────────────────────────────
  'unwritten.omen.00.name': 'The First Page',
  'unwritten.omen.01.name': 'Hardened Echoes',
  'unwritten.omen.01.text': 'Foes have {a}% more HP.',
  'unwritten.omen.02.name': 'Sharper Quills',
  'unwritten.omen.02.text': 'Foes have {a}% more ATK.',
  'unwritten.omen.03.name': 'Bitter Ink',
  'unwritten.omen.03.text': 'A rest at the Shrine heals at most {a}% of max HP.',
  'unwritten.omen.04.name': 'Marked Elites',
  'unwritten.omen.04.text': 'Elites carry {a} more affix.',
  'unwritten.omen.05.name': 'A Stain Remembered',
  'unwritten.omen.05.text': 'The company sets out with {a} blot already on the page.',
  'unwritten.omen.06.name': 'Quickened Dark',
  'unwritten.omen.06.text': 'Foes have {a} more SPD.',
  'unwritten.omen.07.name': 'The Peddler’s Greed',
  'unwritten.omen.07.text': 'The Peddler charges {a}% more.',
  'unwritten.omen.08.name': 'Wardens Stir',
  'unwritten.omen.08.text': 'Wardens have {a}% more HP and carry {b} affix.',
  'unwritten.omen.09.name': 'A Worn Company',
  'unwritten.omen.09.text': 'The company sets out with {a}% of its health.',
  'unwritten.omen.10.name': 'Crowded Margins',
  'unwritten.omen.10.text': 'Every Skirmish wave fields {a} more foe.',
  'unwritten.omen.11.name': 'Fading Light',
  'unwritten.omen.11.text': 'A rest at the Shrine heals at most {a}% of max HP.',
  'unwritten.omen.12.name': 'Thrice Marked',
  'unwritten.omen.12.text': 'Elites carry {a} more affix.',
  'unwritten.omen.13.name': 'Eclipse Rising',
  'unwritten.omen.13.text': 'Foes have {a}% more HP and {b}% more ATK.',
  'unwritten.omen.14.name': 'No Quarter',
  'unwritten.omen.14.text': 'A rekindled champion rises with {a}% less health.',
  'unwritten.omen.15.name': 'The Blotted Heart',
  'unwritten.omen.15.text': 'The Unwriter has {a}% more HP, and turns its last page at {b}% of it.',

  // ── The Scriptorium ──────────────────────────────────────────────────────────────────────
  'unwritten.scriptorium.deeper_purse.name': 'A Deeper Purse',
  'unwritten.scriptorium.deeper_purse.text': 'Every expedition sets out with {a} more gilt.',
  'unwritten.scriptorium.field_dressing.name': 'Field Dressing',
  'unwritten.scriptorium.field_dressing.text': 'After every victory, the company heals {a}% of its max HP.',
  'unwritten.scriptorium.steady_hand.name': 'A Steady Hand',
  'unwritten.scriptorium.steady_hand.text': 'Redraw an offer of inscriptions {a} time each folio.',
  'unwritten.scriptorium.keen_reader.name': 'The Keen Reader',
  'unwritten.scriptorium.keen_reader.text':
    'Mysteries name their odds, and the map shows every Elite’s affixes.',
  'unwritten.scriptorium.echo_calling.name': 'Echo-Calling',
  'unwritten.scriptorium.echo_calling.text':
    'Echoes wait on the maps: champions of the Chronicle you have not yet met, ready to join the company.',
  'unwritten.scriptorium.wider_company.name': 'A Wider Company',
  'unwritten.scriptorium.wider_company.text': 'Set out with up to {a} more champion.',
  'unwritten.scriptorium.rekindling.name': 'Rekindling',
  'unwritten.scriptorium.rekindling.text':
    'Carry {a} Rekindling into every expedition: raise a fallen champion wherever you stand.',
  'unwritten.scriptorium.reliquary_rights.name': 'Reliquary Rights',
  'unwritten.scriptorium.reliquary_rights.text': 'A Reliquary offers {a} more relic to choose from.',
  'unwritten.scriptorium.gilded_margins.name': 'Gilded Margins',
  'unwritten.scriptorium.gilded_margins.text': 'Recover {a}% more Pages.',
  'unwritten.scriptorium.second_volume.name': 'The Second Volume',
  'unwritten.scriptorium.second_volume.text': 'New inscriptions of every ink join the offers.',
  'unwritten.scriptorium.illuminators_eye.name': 'The Illuminator’s Eye',
  'unwritten.scriptorium.illuminators_eye.text': 'Every offer shows {a} more inscription to choose from.',
  'unwritten.scriptorium.blended_inks.name': 'Blended Inks',
  'unwritten.scriptorium.blended_inks.text':
    'Once the company writes in two inks, inscriptions blended from both may be offered.',
  'unwritten.scriptorium.veterans_start.name': 'A Veteran’s Start',
  'unwritten.scriptorium.veterans_start.text':
    'Every expedition sets out with {a} Rare inscription already written.',
  'unwritten.scriptorium.third_volume.name': 'The Third Volume',
  'unwritten.scriptorium.third_volume.text': 'New relics join the Peddler’s shelf and the Reliquaries.',
  'unwritten.scriptorium.larger_company.name': 'A Larger Company',
  'unwritten.scriptorium.larger_company.text': 'Set out with up to {a} more champion.',
  'unwritten.scriptorium.masters_hand.name': 'The Master’s Hand',
  'unwritten.scriptorium.masters_hand.text': 'A Skirmish may offer Legendary inscriptions.',

  // ── Folios and their Wardens ─────────────────────────────────────────────────────────────
  'unwritten.folio.1.name': 'The Drowned Margins',
  'unwritten.folio.2.name': 'The Hollow Choir',
  'unwritten.folio.3.name': 'The Blotted Heart',

  'enemy.unwritten_ink_drowned_knight.name': 'The Ink-Drowned Knight',
  'ab.unwritten_ink_drowned_knight.drowning_blade.name': 'Drowning Blade',
  'ab.unwritten_ink_drowned_knight.drowning_blade.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns.',
  'ab.unwritten_ink_drowned_knight.black_tide.name': 'Black Tide',
  'ab.unwritten_ink_drowned_knight.black_tide.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.unwritten_ink_drowned_knight.oath_unwritten.name': 'Oath Unwritten',
  'ab.unwritten_ink_drowned_knight.oath_unwritten.description':
    'Places a [Shield] worth {shield}% of its max HP and [Counterattack] on itself, and may [Provoke] every enemy. Cooldown {cooldown} turns.',
  'ab.unwritten_ink_drowned_knight.undertow.name': 'Undertow',
  'ab.unwritten_ink_drowned_knight.undertow.description':
    'From its second phase: attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns. Cooldown {cooldown} turns.',

  'enemy.unwritten_inkling_chorister.name': 'Inkling Chorister',
  'ab.unwritten_inkling_chorister.ink_hymn.name': 'Ink Hymn',
  'ab.unwritten_inkling_chorister.ink_hymn.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns.',

  'enemy.unwritten_hollow_cantor.name': 'The Hollow Cantor',
  'ab.unwritten_hollow_cantor.dirge.name': 'Dirge',
  'ab.unwritten_hollow_cantor.dirge.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Heal Reduction] for {turns} turns.',
  'ab.unwritten_hollow_cantor.chorus_of_ink.name': 'Chorus of Ink',
  'ab.unwritten_hollow_cantor.chorus_of_ink.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.unwritten_hollow_cantor.requiem.name': 'Requiem',
  'ab.unwritten_hollow_cantor.requiem.description':
    'Heals itself {heal}% of its max HP and removes every debuff from itself. Cooldown {cooldown} turns.',

  'enemy.unwritten_unwriter.name': 'The Unwriter',
  'ab.unwritten_unwriter.erase.name': 'Erase',
  'ab.unwritten_unwriter.erase.description':
    'Attacks one enemy for {dmg}% of ATK and steals one of their buffs.',
  'ab.unwritten_unwriter.blot_out.name': 'Blot Out',
  'ab.unwritten_unwriter.blot_out.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Block Buffs] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.unwritten_unwriter.rewrite.name': 'Rewrite',
  'ab.unwritten_unwriter.rewrite.description':
    'From its second phase: heals itself {heal}% of its max HP, removes every debuff from itself and places [ATK Up] on itself for {turns} turns. Cooldown {cooldown} turns.',
  'ab.unwritten_unwriter.the_last_line.name': 'The Last Line',
  'ab.unwritten_unwriter.the_last_line.description':
    'From its last phase: attacks all enemies for {dmg}% of ATK, ignoring {defIgnore}% of their DEF. Cooldown {cooldown} turns.',

  // ── The fights ───────────────────────────────────────────────────────────────────────────
  'unwritten.encounter.skirmish.name': 'Skirmish',
  'unwritten.encounter.skirmish.description': 'Foes the Unwritten remembers, in two waves.',
  'unwritten.encounter.elite.name': 'Elite',
  'unwritten.encounter.elite.description': 'A named foe and its escort, marked by the Unwritten.',
  'unwritten.encounter.warden.name': 'Warden',
  'unwritten.encounter.warden.description': 'The one who keeps this folio shut.',
  'unwritten.encounter.duel.name': 'The Unfinished Duel',
  'unwritten.encounter.duel.description': 'A duel the Unwritten never let end.',
  'unwritten.echo.resolve.name': 'Echo’s Resolve',
  'unwritten.echo.resolve.text': 'An Echo fights without gear, and harder for it.',

  // ── Mysteries ────────────────────────────────────────────────────────────────────────────
  'unwritten.mystery.weeping_scribe.name': 'The Weeping Scribe',
  'unwritten.mystery.weeping_scribe.scene':
    'A scribe sits among torn pages, weeping ink. “I can finish one of your lines,” she says, “for a price. Or write you a new one — but my hand shakes.”',
  'unwritten.mystery.weeping_scribe.pay': 'Pay her',
  'unwritten.mystery.weeping_scribe.pay.hint': 'Pay {cost} gilt: one of your inscriptions gains a level.',
  'unwritten.mystery.weeping_scribe.write': 'Let her write',
  'unwritten.mystery.weeping_scribe.write.hint': 'A Rare inscription is written — and a blot with it.',
  'unwritten.mystery.weeping_scribe.leave': 'Leave her to her grief',
  'unwritten.mystery.weeping_scribe.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.page_torn_in_two.name': 'A Page Torn in Two',
  'unwritten.mystery.page_torn_in_two.scene':
    'Two halves of one page turn on a cold wind. One is warm to the touch; the other is heavy with coin-stamps.',
  'unwritten.mystery.page_torn_in_two.left': 'Take the warm half',
  'unwritten.mystery.page_torn_in_two.left.hint':
    'Gain a relic. Every champion loses {wound}% of their max HP.',
  'unwritten.mystery.page_torn_in_two.right': 'Take the heavy half',
  'unwritten.mystery.page_torn_in_two.right.hint': 'Gain {gilt} gilt.',

  'unwritten.mystery.hungry_library.name': 'The Hungry Library',
  'unwritten.mystery.hungry_library.scene':
    'Shelves lean in like mourners. The library is starving, and it will trade two stories for one thing you carry.',
  'unwritten.mystery.hungry_library.feed': 'Feed it a relic',
  'unwritten.mystery.hungry_library.feed.hint': 'Lose a relic. Two inscriptions are written.',
  'unwritten.mystery.hungry_library.leave': 'Back away',
  'unwritten.mystery.hungry_library.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.mirror_of_ink.name': 'The Mirror of Ink',
  'unwritten.mystery.mirror_of_ink.scene':
    'A mirror of still black ink shows the company as it might be — stronger, and stained.',
  'unwritten.mystery.mirror_of_ink.look': 'Look deeper',
  'unwritten.mystery.mirror_of_ink.look.hint':
    'One of your inscriptions gains a level — and a blot is written.',
  'unwritten.mystery.mirror_of_ink.break': 'Break the mirror',
  'unwritten.mystery.mirror_of_ink.break.hint': 'Gain {gilt} gilt from the silvered shards.',

  'unwritten.mystery.drowned_choir.name': 'The Drowned Choir',
  'unwritten.mystery.drowned_choir.scene':
    'Voices rise from a flooded chapel, singing a hymn the world has forgotten.',
  'unwritten.mystery.drowned_choir.listen': 'Listen',
  'unwritten.mystery.drowned_choir.listen.hint': 'Every champion heals {heal}% of their max HP.',
  'unwritten.mystery.drowned_choir.sing': 'Sing with them',
  'unwritten.mystery.drowned_choir.sing.hint': 'An Azure inscription is written.',

  'unwritten.mystery.unfinished_duel.name': 'The Unfinished Duel',
  'unwritten.mystery.unfinished_duel.scene':
    'A duellist of ink stands in a ring of chalk, waiting for an opponent who never came. “Finish it,” it says.',
  'unwritten.mystery.unfinished_duel.accept': 'Accept the duel',
  'unwritten.mystery.unfinished_duel.accept.hint':
    'Fight an Elite. Win, and choose from the inscriptions a Warden would offer.',
  'unwritten.mystery.unfinished_duel.refuse': 'Refuse',
  'unwritten.mystery.unfinished_duel.refuse.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.ashen_pilgrims.name': 'The Ashen Pilgrims',
  'unwritten.mystery.ashen_pilgrims.scene':
    'Pilgrims in grey robes shuffle past with empty bowls. One of them glances at your purse.',
  'unwritten.mystery.ashen_pilgrims.share': 'Share your gilt',
  'unwritten.mystery.ashen_pilgrims.share.hint': 'Pay {cost} gilt: a Gold inscription is written.',
  'unwritten.mystery.ashen_pilgrims.rob': 'Rob them',
  'unwritten.mystery.ashen_pilgrims.rob.hint': 'Gain {gilt} gilt — and the blot Ill Omen.',

  'unwritten.mystery.well_of_names.name': 'The Well of Names',
  'unwritten.mystery.well_of_names.scene':
    'A well whispers the names of the lost. Drop a coin, and it may answer; drink, and it may give one back.',
  'unwritten.mystery.well_of_names.coin': 'Drop a coin',
  'unwritten.mystery.well_of_names.coin.hint': 'Pay {cost} gilt for a chance at a relic.',
  'unwritten.mystery.well_of_names.drink': 'Drink',
  'unwritten.mystery.well_of_names.drink.hint':
    'Your first fallen champion rises with {rekindle}% of their health.',
  'unwritten.mystery.well_of_names.leave': 'Walk on',
  'unwritten.mystery.well_of_names.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.bound_echo.name': 'The Bound Echo',
  'unwritten.mystery.bound_echo.scene':
    'An Echo of a champion strains against chains of script. It could fight beside you — or you could take the ink that binds it.',
  'unwritten.mystery.bound_echo.free': 'Free the Echo',
  'unwritten.mystery.bound_echo.free.hint': 'An Echo offers to join the company.',
  'unwritten.mystery.bound_echo.take': 'Take the ink',
  'unwritten.mystery.bound_echo.take.hint': 'A Violet inscription is written.',

  'unwritten.mystery.candle_in_the_void.name': 'A Candle in the Void',
  'unwritten.mystery.candle_in_the_void.scene':
    'One candle burns where nothing else does. Its flame could burn a stain away, if you can bear the heat.',
  'unwritten.mystery.candle_in_the_void.light': 'Hold the page to the flame',
  'unwritten.mystery.candle_in_the_void.light.hint':
    'A blot is scraped away. Every champion loses {wound}% of their max HP.',
  'unwritten.mystery.candle_in_the_void.snuff': 'Snuff it out',
  'unwritten.mystery.candle_in_the_void.snuff.hint': 'Recover {pages} Pages from the ashes.',

  'unwritten.mystery.scriptorium_ruins.name': 'The Scriptorium Ruins',
  'unwritten.mystery.scriptorium_ruins.scene':
    'The ruins of an old scriptorium. Something among the rubble is still writing — or waiting.',
  'unwritten.mystery.scriptorium_ruins.search': 'Search the rubble',
  'unwritten.mystery.scriptorium_ruins.search.hint':
    'One of your inscriptions may gain a level — or something may be waiting.',
  'unwritten.mystery.scriptorium_ruins.leave': 'Leave the ruins',
  'unwritten.mystery.scriptorium_ruins.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.merchant_of_last_things.name': 'The Merchant of Last Things',
  'unwritten.mystery.merchant_of_last_things.scene':
    'A merchant who sells only endings. “Every coin you carry,” she smiles, “for one thing worth more.”',
  'unwritten.mystery.merchant_of_last_things.buy': 'Pay everything',
  'unwritten.mystery.merchant_of_last_things.buy.hint':
    'Give up all your gilt — at least {need} — for a relic.',
  'unwritten.mystery.merchant_of_last_things.leave': 'Decline',
  'unwritten.mystery.merchant_of_last_things.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.silent_twins.name': 'The Silent Twins',
  'unwritten.mystery.silent_twins.scene': 'Two figures, identical and wordless, each hold out a closed hand.',
  'unwritten.mystery.silent_twins.left': 'The left hand',
  'unwritten.mystery.silent_twins.left.hint': 'A relic — or a blot.',
  'unwritten.mystery.silent_twins.right': 'The right hand',
  'unwritten.mystery.silent_twins.right.hint': 'Gain {gilt} gilt.',

  'unwritten.mystery.echo_of_a_friend.name': 'Echo of a Friend',
  'unwritten.mystery.echo_of_a_friend.scene':
    'A familiar voice calls from the margins: a friend the company lost, not quite gone.',
  'unwritten.mystery.echo_of_a_friend.rise': 'Call them back',
  'unwritten.mystery.echo_of_a_friend.rise.hint':
    'Your first fallen champion rises with {rekindle}% of their health.',
  'unwritten.mystery.echo_of_a_friend.remember': 'Let them rest',
  'unwritten.mystery.echo_of_a_friend.remember.hint': 'Gain {gilt} gilt, left in their memory.',

  'unwritten.mystery.ink_tide.name': 'The Ink Tide',
  'unwritten.mystery.ink_tide.scene':
    'A black tide floods the passage. Wade through it, or let it take something.',
  'unwritten.mystery.ink_tide.wade': 'Wade through',
  'unwritten.mystery.ink_tide.wade.hint': 'Every champion loses {wound}% of their max HP.',
  'unwritten.mystery.ink_tide.yield': 'Let it take a line',
  'unwritten.mystery.ink_tide.yield.hint': 'Lose an inscription. Gain {gilt} gilt.',

  'unwritten.mystery.wardens_herald.name': 'The Warden’s Herald',
  'unwritten.mystery.wardens_herald.scene':
    'A herald in the Warden’s colours bars the way. “Bow, and my master will be merciful. Mock him, and he will meet you whole — with gifts for whoever still stands.”',
  'unwritten.mystery.wardens_herald.bow': 'Bow',
  'unwritten.mystery.wardens_herald.bow.hint': 'This folio’s Warden has {warden}% less HP.',
  'unwritten.mystery.wardens_herald.mock': 'Mock the Warden',
  'unwritten.mystery.wardens_herald.mock.hint':
    'This folio’s Warden has {warden}% more HP, and pays one more relic.',

  'unwritten.mystery.crimson_altar.name': 'The Crimson Altar',
  'unwritten.mystery.crimson_altar.scene':
    'An altar slick with red ink. It asks for blood, and it will write in it.',
  'unwritten.mystery.crimson_altar.bleed': 'Bleed on the altar',
  'unwritten.mystery.crimson_altar.bleed.hint':
    'Your strongest champion loses {wound}% of their max HP. A Crimson inscription is written.',
  'unwritten.mystery.crimson_altar.leave': 'Walk away',
  'unwritten.mystery.crimson_altar.leave.hint': 'Nothing gained, nothing lost.',

  'unwritten.mystery.scales_of_veyrath.name': 'The Scales of Veyrath',
  'unwritten.mystery.scales_of_veyrath.scene':
    'Great scales hang in the dark. One pan waits for coin; the other, for the weary.',
  'unwritten.mystery.scales_of_veyrath.purse': 'Weigh your purse',
  'unwritten.mystery.scales_of_veyrath.purse.hint': 'Double your gilt, adding at most {cap}.',
  'unwritten.mystery.scales_of_veyrath.company': 'Weigh your company',
  'unwritten.mystery.scales_of_veyrath.company.hint': 'Every champion heals {heal}% of their max HP.',

  'unwritten.mystery.lantern_bearer.name': 'The Lantern-Bearer',
  'unwritten.mystery.lantern_bearer.scene':
    'A figure with a lantern offers to light your way — toward riches, or toward the truth.',
  'unwritten.mystery.lantern_bearer.follow': 'Follow the light',
  'unwritten.mystery.lantern_bearer.follow.hint': 'The next fight you win pays double gilt.',
  'unwritten.mystery.lantern_bearer.ask': 'Ask what lies ahead',
  'unwritten.mystery.lantern_bearer.ask.hint': 'This folio’s Elites show their affixes on the map.',

  'unwritten.mystery.last_chronicler.name': 'The Last Chronicler',
  'unwritten.mystery.last_chronicler.scene':
    'An old chronicler writes by the last of the light. “I can tell you what I have recovered,” she says, “or write you something new. The ink bites.”',
  'unwritten.mystery.last_chronicler.listen': 'Listen to her',
  'unwritten.mystery.last_chronicler.listen.hint': 'Recover {pages} Pages.',
  'unwritten.mystery.last_chronicler.ask': 'Ask her to write',
  'unwritten.mystery.last_chronicler.ask.hint':
    'A Rare inscription is written. Every champion loses {wound}% of their max HP.',

  // What a Keen Reader sees on a gamble.
  'unwritten.mystery.odds': '{chance}% chance',

  // ── The screen (UI_DESIGN.md §5.32) ──────────────────────────────────────────────────────
  'unwritten.ui.tab.expedition': 'Expedition',
  'unwritten.ui.tab.scriptorium': 'Scriptorium',
  'unwritten.ui.tab.records': 'Records',
  'unwritten.ui.folio': 'Folio {folio}',
  'unwritten.ui.locked': 'The Unwritten opens at chronicle level {level}.',

  // Passages, as the map names them and says what they hold.
  'unwritten.ui.passage.skirmish': 'Skirmish',
  'unwritten.ui.passage.skirmish.hint': 'A fight. Win it for gilt, Pages and an inscription.',
  'unwritten.ui.passage.elite': 'Elite',
  'unwritten.ui.passage.elite.hint':
    'A harder fight against a marked foe. Win it for more of everything, and a relic.',
  'unwritten.ui.passage.warden': 'Warden',
  'unwritten.ui.passage.warden.hint':
    'The folio’s keeper. Fell it for a relic of your choice, an inscription from its hoard and, six times a week, the Tithe.',
  'unwritten.ui.passage.mystery': 'Mystery',
  'unwritten.ui.passage.mystery.hint': 'A scene the Unwritten has kept, and a choice to make in it.',
  'unwritten.ui.passage.shrine': 'Shrine',
  'unwritten.ui.passage.shrine.hint':
    'Rest the company, raise one who fell, deepen an inscription or scrape a blot away.',
  'unwritten.ui.passage.peddler': 'Peddler',
  'unwritten.ui.passage.peddler.hint': 'Inscriptions, relics and remedies, for gilt.',
  'unwritten.ui.passage.reliquary': 'Reliquary',
  'unwritten.ui.passage.reliquary.hint': 'A relic, waiting to be carried out.',
  'unwritten.ui.passage.echo': 'Echo',
  'unwritten.ui.passage.echo.hint': 'A champion the Unwritten remembers, who may join the company.',

  'unwritten.ui.rarity.common': 'Common',
  'unwritten.ui.rarity.rare': 'Rare',
  'unwritten.ui.rarity.epic': 'Epic',
  'unwritten.ui.rarity.legendary': 'Legendary',

  // An inscription's card.
  'unwritten.ui.bearer.leader': 'Carried by the leader',
  'unwritten.ui.bearer.element': 'Carried by {element} champions',
  'unwritten.ui.card.level': 'Level {level}',
  'unwritten.ui.card.deepens': 'Deepens {from} → {to}',
  'unwritten.ui.card.new': 'New',

  // The map.
  'unwritten.ui.map.node': '{kind}: {state}',
  'unwritten.ui.map.state.walked': 'Walked',
  'unwritten.ui.map.state.here': 'The company is here',
  'unwritten.ui.map.state.open': 'Open to the company',
  'unwritten.ui.map.state.ahead': 'Further ahead',
  'unwritten.ui.map.state.lost': 'Out of reach',
  'unwritten.ui.map.enter': 'Enter',
  'unwritten.ui.map.next': 'Choose where the company goes next',
  'unwritten.ui.map.first': 'Choose where the company sets foot first',

  // The company.
  'unwritten.ui.company.title': 'The Company',
  'unwritten.ui.company.standing': '{standing} of {total} standing',
  'unwritten.ui.company.echo': 'Echo',
  'unwritten.ui.company.fallen': 'Fallen',
  'unwritten.ui.company.rekindle': 'Rekindle',
  'unwritten.ui.company.tokens':
    'Rekindle tokens: {tokens}. Each raises a fallen champion at {share}% HP, at any time.',
  'unwritten.ui.company.choose': 'Choose your company',
  'unwritten.ui.company.chosen': '{count} of {cap} chosen',
  'unwritten.ui.company.rule':
    'Up to {party} go into each fight. Wounds are kept between fights, and the fallen stay down until something rekindles them.',

  // The codex.
  'unwritten.ui.codex.gilt': 'Gilt',
  'unwritten.ui.codex.pages': 'Pages',
  'unwritten.ui.codex.pagesMult': 'Pages · ×{mult} home',
  'unwritten.ui.codex.omen': 'Omen {omen}',
  'unwritten.ui.codex.full': 'Fully illuminated',
  'unwritten.ui.codex.toward': '{count} / {next}',
  'unwritten.ui.codex.blends': 'Blended Inks',
  'unwritten.ui.codex.relics': 'Relics · {count}',
  'unwritten.ui.codex.noRelics': 'No relic carried yet. Reliquaries, Elites and Wardens hold them.',
  'unwritten.ui.codex.blots': 'Blots · {count}',
  'unwritten.ui.codex.rerolls': 'Offer redraws left in this folio: {count}',
  'unwritten.ui.codex.abandon': 'Abandon expedition',

  // A victory's spoils.
  'unwritten.ui.spoils.healed': 'The company heals {share}%',
  'unwritten.ui.spoils.relic': 'Relic: {name}',
  'unwritten.ui.spoils.tithe': 'Warden’s Tithe',

  // An offer.
  'unwritten.ui.offer.fromSkirmish': 'A skirmish won',
  'unwritten.ui.offer.fromElite': 'An Elite felled',
  'unwritten.ui.offer.fromWarden': 'The Warden’s hoard',
  'unwritten.ui.offer.fromDuel': 'The duel won',
  'unwritten.ui.offer.title': 'Write an inscription',
  'unwritten.ui.offer.sub': 'Choose one to write into the company for the rest of the expedition.',
  'unwritten.ui.offer.reroll': 'Draw again ({count} left)',
  'unwritten.ui.offer.skip': 'Leave them unwritten (+{gilt} gilt)',

  // A relic to take.
  'unwritten.ui.relic.hoard': 'The Warden’s hoard',
  'unwritten.ui.relic.choose': 'Choose a relic',
  'unwritten.ui.relic.take': 'Take the relic',
  'unwritten.ui.relic.sub': 'A relic bends one rule of the expedition, and is carried to its end.',

  // Echoes.
  'unwritten.ui.echo.title': 'Echoes of the Chronicle',
  'unwritten.ui.echo.sub':
    'One may join the company until the expedition ends, at the company’s level and stars.',
  'unwritten.ui.echo.full': 'The company is full. The Echoes can only be sent away.',
  'unwritten.ui.echo.resolve': 'No gear, but an Echo’s resolve: +{resolve}% HP, ATK and DEF',
  'unwritten.ui.echo.take': 'Join the company',
  'unwritten.ui.echo.decline': 'Send them away (+{gilt} gilt)',

  // A fight waiting.
  'unwritten.ui.fight.warden': 'Warden of {folio}',
  'unwritten.ui.fight.fellBack':
    'The company fell back. Every wound stands on both sides: send in whoever is left to finish it.',
  'unwritten.ui.fight.contested':
    'This passage is contested: the foes still carry every wound you gave them.',
  'unwritten.ui.fight.later': '+{count} more in the waves behind',
  'unwritten.ui.fight.hiddenMarks': 'Marked by the Unwritten ({count}), but the marks are hidden.',
  'unwritten.ui.fight.sendIn': 'Sending in',
  'unwritten.ui.fight.pickHint': 'Change who goes in from the company on the left. Seat 1 leads.',
  'unwritten.ui.fight.go': 'Fight',

  // What a closed mystery choice still needs.
  'unwritten.ui.mystery.needGilt': 'Needs {gilt} gilt',
  'unwritten.ui.mystery.needRelic': 'Needs a relic',
  'unwritten.ui.mystery.needFallen': 'Needs a fallen champion',
  'unwritten.ui.mystery.needInscription': 'Needs an inscription',
  'unwritten.ui.mystery.needBlot': 'Needs a blot',

  // A shrine.
  'unwritten.ui.shrine.title': 'A Candlelit Shrine',
  'unwritten.ui.shrine.sub': 'Four offerings, and only one may be taken.',
  'unwritten.ui.shrine.rest': 'Rest',
  'unwritten.ui.shrine.restLine': 'Every standing champion heals {share}% of their max HP.',
  'unwritten.ui.shrine.rekindle': 'Rekindle',
  'unwritten.ui.shrine.rekindleLine': 'One fallen champion rises at {share}% HP.',
  'unwritten.ui.shrine.noneFallen': 'No one has fallen.',
  'unwritten.ui.shrine.reink': 'Re-ink',
  'unwritten.ui.shrine.reinkLine': 'One inscription gains a level.',
  'unwritten.ui.shrine.noneToDeepen': 'Nothing written can go deeper.',
  'unwritten.ui.shrine.scrape': 'Scrape',
  'unwritten.ui.shrine.scrapeLine': 'One blot is scraped from the page.',
  'unwritten.ui.shrine.noneBlots': 'The page is clean.',

  // The Peddler.
  'unwritten.ui.peddler.title': 'The Peddler of Lost Things',
  'unwritten.ui.peddler.purse': 'Your purse: {gilt} gilt',
  'unwritten.ui.peddler.sold': 'Sold',
  'unwritten.ui.peddler.salve': 'Salve',
  'unwritten.ui.peddler.salveLine': 'Every standing champion heals {share}% of their max HP.',
  'unwritten.ui.peddler.ash': 'Phoenix Ash',
  'unwritten.ui.peddler.ashLine': 'One fallen champion rises at {share}% HP. Once a visit.',
  'unwritten.ui.peddler.deepen': 'Deepening Ink',
  'unwritten.ui.peddler.deepenLine': 'One inscription gains a level. Once a visit.',
  'unwritten.ui.peddler.scrape': 'Scraper',
  'unwritten.ui.peddler.scrapeLine': 'One blot is scraped from the page.',
  'unwritten.ui.peddler.restock': 'Fresh Stock',
  'unwritten.ui.peddler.restockLine': 'The inscriptions on the cloth are drawn again. Once a visit.',
  'unwritten.ui.peddler.onceDone': 'Sold out for this visit.',
  'unwritten.ui.peddler.leave': 'Leave the Peddler',

  // The threshold: an Omen, a company.
  'unwritten.ui.omen.title': 'The Omens',
  'unwritten.ui.omen.hint': 'Win an expedition to open the next.',
  'unwritten.ui.omen.reading': 'The expedition is read under',
  'unwritten.ui.omen.named': 'Omen {omen} · {name}',
  'unwritten.ui.omen.foes': 'Foes',
  'unwritten.ui.omen.pages': 'Pages',
  'unwritten.ui.omen.tithe': 'Tithes left this week',
  'unwritten.ui.omen.calm': 'No twist yet. The Unwritten is only watching.',
  'unwritten.ui.omen.seal': 'The first victory here breaks its seal:',
  'unwritten.ui.begin': 'Begin the expedition',

  // The Scriptorium.
  'unwritten.ui.scriptorium.title': 'The Scriptorium',
  'unwritten.ui.scriptorium.sub':
    'Write Recovered Pages into its folios. What is written changes every expedition after, and is never lost.',
  'unwritten.ui.scriptorium.pages': 'Recovered Pages',
  'unwritten.ui.scriptorium.closed':
    'The candles are out while an expedition is under way. End it to write again.',
  'unwritten.ui.scriptorium.shelf': 'Shelf {shelf}',
  'unwritten.ui.scriptorium.opensAfter': 'Opens once {count} folios of Shelf {shelf} are written',
  'unwritten.ui.scriptorium.written': 'Written',

  // A Tale, line by line.
  'unwritten.ui.tale.fell.skirmish': '{who} fell in a skirmish.',
  'unwritten.ui.tale.fell.elite': '{who} fell to an Elite.',
  'unwritten.ui.tale.fell.warden': '{who} fell to the Warden.',
  'unwritten.ui.tale.fell.other': '{who} fell in a fight a mystery started.',
  'unwritten.ui.tale.rekindled': '{who} was rekindled.',
  'unwritten.ui.tale.inscribed': '{name} was written.',
  'unwritten.ui.tale.deepened': '{name} deepened to {level}.',
  'unwritten.ui.tale.relic': 'The company took up {name}.',
  'unwritten.ui.tale.blot': 'The page was stained: {name}.',
  'unwritten.ui.tale.echo': '{who} answered as an Echo.',
  'unwritten.ui.tale.illuminated': '{ink} illuminated.',
  'unwritten.ui.tale.illuminatedFully': '{ink} illuminated fully.',
  'unwritten.ui.tale.warden': '{name} was felled.',
  'unwritten.ui.tale.victory': 'The Pages Are Recovered',
  'unwritten.ui.tale.defeat': 'The Company Has Fallen',
  'unwritten.ui.tale.abandoned': 'The Company Turned Back',
  'unwritten.ui.tale.kicker': 'A Tale of Omen {omen}',
  'unwritten.ui.tale.reached': 'Folio reached',
  'unwritten.ui.tale.wardens': 'Wardens felled',
  'unwritten.ui.tale.pages': 'Pages brought home',
  'unwritten.ui.tale.relics': 'Relics carried',
  'unwritten.ui.tale.time': 'Time',
  'unwritten.ui.tale.company': 'The company: {names}',
  'unwritten.ui.tale.folio': 'Folio {folio}',
  'unwritten.ui.tale.quiet': 'Nothing was written before it ended.',

  // The Records.
  'unwritten.ui.records.title': 'The Records',
  'unwritten.ui.records.expeditions': 'Expeditions',
  'unwritten.ui.records.victories': 'Victories',
  'unwritten.ui.records.wardens': 'Wardens felled',
  'unwritten.ui.records.best': 'Best Omen won',
  'unwritten.ui.records.fastest': 'Fastest victory',
  'unwritten.ui.records.open': 'Highest Omen open',
  'unwritten.ui.records.tales': 'The last Tales',
  'unwritten.ui.records.won': 'Victory',
  'unwritten.ui.records.lost': 'Defeat',
  'unwritten.ui.records.left': 'Turned back',
  'unwritten.ui.records.row': 'Omen {omen} · Folio {folio} · {pages} Pages',
  'unwritten.ui.records.none': 'No Tale written yet. The first expedition writes one, however it ends.',

  // Moments: an ink lit, a folio turned, walking away, the end.
  'unwritten.ui.lit.once': '{ink} Illuminated',
  'unwritten.ui.lit.fully': '{ink} Fully Illuminated',
  'unwritten.ui.interlude.kicker': 'Folio {folio}',
  'unwritten.ui.interlude.rest': 'Between the pages, every standing champion heals {share}% of their max HP.',
  'unwritten.ui.abandon.title': 'Abandon the expedition?',
  'unwritten.ui.abandon.text':
    'It ends here, as a defeat would. {pages} Recovered Pages come home, and its Tale is written.',
  'unwritten.ui.abandon.keep': 'Keep going',
  'unwritten.ui.abandon.go': 'Abandon',
  'unwritten.ui.ending.paid': 'Brought home',
  'unwritten.ui.ending.close': 'Close the Tale',
} as const;

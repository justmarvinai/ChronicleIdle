/**
 * Campaign strings: the twelve settlements, their factions and rosters, the shared archetype
 * kits and the twelve stage bosses (docs/design/CAMPAIGN.md §5–§6).
 */
export const campaign = {
  // Shared archetype kits (docs/design/CAMPAIGN.md §5): every faction swings these.
  'ab.arch.raider.cleave.name': 'Cleave',
  'ab.arch.raider.cleave.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.arch.raider.reckless_swing.name': 'Reckless Swing',
  'ab.arch.raider.reckless_swing.description':
    'Attacks one enemy for {dmg}% of ATK. Cooldown {cooldown} turns.',

  'ab.arch.marksman.quick_shot.name': 'Quick Shot',
  'ab.arch.marksman.quick_shot.description': 'Attacks the enemy with the lowest health for {dmg}% of ATK.',
  'ab.arch.marksman.scatter_volley.name': 'Scatter Volley',
  'ab.arch.marksman.scatter_volley.description':
    'Attacks all enemies for {dmg}% of ATK. Cooldown {cooldown} turns.',

  'ab.arch.brute.club.name': 'Club',
  'ab.arch.brute.club.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns.',
  'ab.arch.brute.earthshaker.name': 'Earthshaker',
  'ab.arch.brute.earthshaker.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn. Cooldown {cooldown} turns.',

  'ab.arch.warden.shield_slam.name': 'Shield Slam',
  'ab.arch.warden.shield_slam.description': 'Attacks one enemy for {dmg}% of DEF.',
  'ab.arch.warden.hold_the_line.name': 'Hold the Line',
  'ab.arch.warden.hold_the_line.description':
    'Places [DEF Up] on all allies for {turns} turns and [Provoke] on all enemies for 1 turn. Cooldown {cooldown} turns.',

  'ab.arch.hexer.hex_bolt.name': 'Hex Bolt',
  'ab.arch.hexer.hex_bolt.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [ATK Down] for {turns} turns.',
  'ab.arch.hexer.miasma.name': 'Miasma',
  'ab.arch.hexer.miasma.description':
    'Places [Poison] on all enemies for {turns} turns with a {chance}% chance each. Cooldown {cooldown} turns.',

  'ab.arch.mender.thorn_lash.name': 'Thorn Lash',
  'ab.arch.mender.thorn_lash.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.arch.mender.mending_chant.name': 'Mending Chant',
  'ab.arch.mender.mending_chant.description':
    'Heals all allies for {heal}% of their max HP. Cooldown {cooldown} turns.',

  // Settlement 1 — Thornwood Crossing
  'settlement.thornwood_crossing.name': 'Thornwood Crossing',
  'settlement.thornwood_crossing.description':
    'The forest road out of Emberhold. Somebody has started charging for it.',
  'faction.thornwood_bandits.name': 'Thornwood Bandits',
  'enemy.thornwood_cutpurse.name': 'Thornwood Cutpurse',
  'enemy.thornwood_poacher.name': 'Thornwood Poacher',
  'enemy.thornwood_ox_bandit.name': 'Ox-Bandit',
  'enemy.thornwood_shieldbearer.name': 'Thornwood Shieldbearer',
  'enemy.thornwood_hedge_hexer.name': 'Hedge-Hexer',
  'enemy.thornwood_camp_medic.name': 'Bandit Camp Medic',
  'enemy.redcap_halvar.name': 'Redcap Halvar, Bandit King',
  'ab.redcap_halvar.red_hatchet.name': 'Red Hatchet',
  'ab.redcap_halvar.red_hatchet.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.redcap_halvar.toll_of_blood.name': 'Toll of Blood',
  'ab.redcap_halvar.toll_of_blood.description':
    'Attacks one enemy for {dmg}% of ATK and heals himself for 30% of the damage dealt. Cooldown {cooldown} turns.',
  'ab.redcap_halvar.kings_ransom.name': 'King’s Ransom',
  'ab.redcap_halvar.kings_ransom.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 2 — Millbrook Fields
  'settlement.millbrook_fields.name': 'Millbrook Fields',
  'settlement.millbrook_fields.description': 'Farmland gone sour. The livestock came back wrong, and hungry.',
  'faction.blighted_wildlife.name': 'Blighted Wildlife',
  'enemy.blight_wolf.name': 'Blight Wolf',
  'enemy.quill_shrike.name': 'Quill Shrike',
  'enemy.rotting_bull.name': 'Rotting Bull',
  'enemy.bark_elder.name': 'Bark Elder',
  'enemy.spore_crone.name': 'Spore Crone',
  'enemy.hollow_doe.name': 'Hollow Doe',
  'enemy.sow_of_millbrook.name': 'The Sow of Millbrook',
  'ab.sow_of_millbrook.gore.name': 'Gore',
  'ab.sow_of_millbrook.gore.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Bleed] for {turns} turns.',
  'ab.sow_of_millbrook.trample.name': 'Trample',
  'ab.sow_of_millbrook.trample.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn. Cooldown {cooldown} turns.',
  'ab.sow_of_millbrook.blighted_vigour.name': 'Blighted Vigour',
  'ab.sow_of_millbrook.blighted_vigour.description':
    'Heals herself for {heal}% of her max HP and places [ATK Up] on herself for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 3 — Greyhaven Harbor
  'settlement.greyhaven_harbor.name': 'Greyhaven Harbor',
  'settlement.greyhaven_harbor.description':
    'A working port flying the wrong colours. The corsairs collect the harbour dues now.',
  'faction.greyhaven_corsairs.name': 'Greyhaven Corsairs',
  'enemy.corsair_cutlass.name': 'Corsair Cutlass',
  'enemy.corsair_gunner.name': 'Corsair Gunner',
  'enemy.corsair_boatswain.name': 'Corsair Boatswain',
  'enemy.corsair_deck_warden.name': 'Deck Warden',
  'enemy.corsair_tide_hexer.name': 'Tide-Hexer',
  'enemy.corsair_surgeon.name': 'Ship’s Surgeon',
  'enemy.captain_morwenna.name': 'Captain Morwenna Tide',
  'ab.captain_morwenna.cutlass_dance.name': 'Cutlass Dance',
  'ab.captain_morwenna.cutlass_dance.description': 'Attacks one enemy twice for {dmg}% of ATK each.',
  'ab.captain_morwenna.grapeshot.name': 'Grapeshot',
  'ab.captain_morwenna.grapeshot.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.captain_morwenna.signal_the_fleet.name': 'Signal the Fleet',
  'ab.captain_morwenna.signal_the_fleet.description':
    'Fills her crew’s turn meters by {tm}% and places [SPD Up] on them for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 4 — Sunspire Bazaar
  'settlement.sunspire_bazaar.name': 'Sunspire Bazaar',
  'settlement.sunspire_bazaar.description':
    'A desert market city. Its new priesthood prays for the sun to go out.',
  'faction.sand_cult.name': 'The Sand Cult',
  'enemy.dune_stalker.name': 'Dune Stalker',
  'enemy.sling_zealot.name': 'Sling Zealot',
  'enemy.sand_colossus.name': 'Sand Colossus',
  'enemy.mirror_guard.name': 'Mirror Guard',
  'enemy.sun_cursed.name': 'The Sun-Cursed',
  'enemy.oasis_keeper.name': 'Oasis Keeper',
  'enemy.high_zealot_qorath.name': 'High Zealot Qorath',
  'ab.high_zealot_qorath.sun_curse.name': 'Sun Curse',
  'ab.high_zealot_qorath.sun_curse.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.high_zealot_qorath.strip_the_faithful.name': 'Strip the Faithful',
  'ab.high_zealot_qorath.strip_the_faithful.description':
    'Removes one buff from all enemies and places [Block Buffs] on them for {turns} turns with a {chance}% chance. Cooldown {cooldown} turns.',
  'ab.high_zealot_qorath.eclipse_rite.name': 'Eclipse Rite',
  'ab.high_zealot_qorath.eclipse_rite.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Burn] for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 5 — The Old Kingsroad
  'settlement.old_kingsroad.name': 'The Old Kingsroad',
  'settlement.old_kingsroad.description':
    'The road the crown sent an army down. The army is still here; the oaths are not.',
  'faction.kingsroad_deserters.name': 'Kingsroad Deserters',
  'enemy.deserter_blade.name': 'Deserter Blade',
  'enemy.turncoat_crossbow.name': 'Turncoat Crossbow',
  'enemy.road_breaker.name': 'Road Breaker',
  'enemy.oathless_guard.name': 'Oathless Guard',
  'enemy.camp_charlatan.name': 'Camp Charlatan',
  'enemy.field_chirurgeon.name': 'Field Chirurgeon',
  'enemy.ser_dagan.name': 'Ser Dagan the Oathbreaker',
  'ab.ser_dagan.oathbreakers_edge.name': 'Oathbreaker’s Edge',
  'ab.ser_dagan.oathbreakers_edge.description': 'Attacks one enemy for {dmg}% of DEF.',
  'ab.ser_dagan.broken_vow.name': 'Broken Vow',
  'ab.ser_dagan.broken_vow.description':
    'Places [DEF Up] and [Counterattack] on himself and [Provoke] on all enemies for {turns} turns. Cooldown {cooldown} turns.',
  'ab.ser_dagan.execution_order.name': 'Execution Order',
  'ab.ser_dagan.execution_order.description':
    'Attacks one enemy for {dmg}% of DEF with a {chance}% chance to place [Heal Reduction] for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 6 — Barrowdeep
  'settlement.barrowdeep.name': 'Barrowdeep',
  'settlement.barrowdeep.description': 'A tomb complex under the hills. Its tenants have taken to walking.',
  'faction.restless_dead.name': 'The Restless Dead',
  'enemy.grave_husk.name': 'Grave Husk',
  'enemy.bone_fletcher.name': 'Bone Fletcher',
  'enemy.barrow_ghoul.name': 'Barrow Ghoul',
  'enemy.tomb_sentinel.name': 'Tomb Sentinel',
  'enemy.crypt_whisperer.name': 'Crypt Whisperer',
  'enemy.grave_tender.name': 'Grave Tender',
  'enemy.barrow_wight.name': 'The Barrow Wight',
  'ab.barrow_wight.grave_touch.name': 'Grave Touch',
  'ab.barrow_wight.grave_touch.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [ATK Down] for {turns} turns.',
  'ab.barrow_wight.barrow_chill.name': 'Barrow Chill',
  'ab.barrow_wight.barrow_chill.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Freeze] for {turns} turn. Cooldown {cooldown} turns.',
  'ab.barrow_wight.call_the_barrow.name': 'Call the Barrow',
  'ab.barrow_wight.call_the_barrow.description':
    'Revives its fallen with {heal}% HP and places [ATK Up] on all of them for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 7 — Ashfall Plains
  'settlement.ashfall_plains.name': 'Ashfall Plains',
  'settlement.ashfall_plains.description':
    'A battlefield that never finished burning, held by a legion that never got the order to stop.',
  'faction.ashen_legion.name': 'The Ashen Legion',
  'enemy.ash_legionary.name': 'Ash Legionary',
  'enemy.cinder_archer.name': 'Cinder Archer',
  'enemy.slag_bruiser.name': 'Slag Bruiser',
  'enemy.legion_bulwark.name': 'Legion Bulwark',
  'enemy.emberbinder.name': 'Emberbinder',
  'enemy.pyre_warden.name': 'Pyre Warden',
  'enemy.warbrand_ulgrim.name': 'Warbrand Ulgrim',
  'ab.warbrand_ulgrim.ashen_cut.name': 'Ashen Cut',
  'ab.warbrand_ulgrim.ashen_cut.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Burn] for {turns} turns.',
  'ab.warbrand_ulgrim.warbrand_frenzy.name': 'Warbrand Frenzy',
  'ab.warbrand_ulgrim.warbrand_frenzy.description':
    'Attacks {hits} random enemies for {dmg}% of ATK each and takes another turn if the last target was below 30% HP. Cooldown {cooldown} turns.',
  'ab.warbrand_ulgrim.pyre_of_the_fallen.name': 'Pyre of the Fallen',
  'ab.warbrand_ulgrim.pyre_of_the_fallen.description':
    'Attacks all enemies for {dmg}% of ATK, placing [Burn] for {turns} turns with a {chance}% chance, and grows his own ATK. Cooldown {cooldown} turns.',

  // Settlement 8 — Frostvein Pass
  'settlement.frostvein_pass.name': 'Frostvein Pass',
  'settlement.frostvein_pass.description':
    'The only way over the mountains. The tribe that holds it fights with the cold itself.',
  'faction.frostvein_tribe.name': 'The Frostvein Tribe',
  'enemy.frost_reaver.name': 'Frost Reaver',
  'enemy.icicle_thrower.name': 'Icicle Thrower',
  'enemy.mammoth_rider.name': 'Mammoth Rider',
  'enemy.glacier_guard.name': 'Glacier Guard',
  'enemy.rime_shaman.name': 'Rime Shaman',
  'enemy.hearth_keeper.name': 'Hearth Keeper',
  'enemy.yrsa_frostmaw.name': 'Matriarch Yrsa Frostmaw',
  'ab.yrsa_frostmaw.frostmaw_swipe.name': 'Frostmaw Swipe',
  'ab.yrsa_frostmaw.frostmaw_swipe.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns.',
  'ab.yrsa_frostmaw.white_out.name': 'White Out',
  'ab.yrsa_frostmaw.white_out.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Freeze] for {turns} turn. Cooldown {cooldown} turns.',
  'ab.yrsa_frostmaw.hearth_of_the_pass.name': 'Hearth of the Pass',
  'ab.yrsa_frostmaw.hearth_of_the_pass.description':
    'Shields her tribe for {shield}% of her max HP and blocks debuffs on herself for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 9 — The Sunken Colosseum
  'settlement.sunken_colosseum.name': 'The Sunken Colosseum',
  'settlement.sunken_colosseum.description':
    'The crowd drowned a long time ago. The bouts carried on without them.',
  'faction.gladiator_shades.name': 'Gladiator Shades',
  'enemy.shade_duelist.name': 'Shade Duelist',
  'enemy.net_caster.name': 'Net Caster',
  'enemy.arena_colossus.name': 'Arena Colossus',
  'enemy.shield_champion.name': 'Shield Champion',
  'enemy.crowd_whisperer.name': 'Crowd Whisperer',
  'enemy.arena_physician.name': 'Arena Physician',
  'enemy.the_undefeated.name': 'The Undefeated',
  'ab.the_undefeated.crowd_pleaser.name': 'Crowd-Pleaser',
  'ab.the_undefeated.crowd_pleaser.description':
    'Attacks one enemy twice for {dmg}% of ATK each and heals for 20% of the damage dealt.',
  'ab.the_undefeated.first_blood.name': 'First Blood',
  'ab.the_undefeated.first_blood.description':
    'Attacks the weakest enemy for {dmg}% of ATK with a {chance}% chance to place [Bleed] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.the_undefeated.undefeated.name': 'Undefeated',
  'ab.the_undefeated.undefeated.description':
    'Places [C.RATE Up] and [Revive on Death] on itself, then attacks all enemies for {dmg}% of ATK. Cooldown {cooldown} turns.',

  // Settlement 10 — Duskmere Marsh
  'settlement.duskmere_marsh.name': 'Duskmere Marsh',
  'settlement.duskmere_marsh.description':
    'Black water and reeds. Every village it swallowed is still down there, listening.',
  'faction.marsh_horrors.name': 'Marsh Horrors',
  'enemy.bog_lurker.name': 'Bog Lurker',
  'enemy.spit_toad.name': 'Spit Toad',
  'enemy.mire_hulk.name': 'Mire Hulk',
  'enemy.reed_warden.name': 'Reed Warden',
  'enemy.fen_witch.name': 'Fen Witch',
  'enemy.leech_mother.name': 'Leech Mother',
  'enemy.grandmother_mire.name': 'Old Grandmother Mire',
  'ab.grandmother_mire.bog_grasp.name': 'Bog Grasp',
  'ab.grandmother_mire.bog_grasp.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns.',
  'ab.grandmother_mire.drowning_lullaby.name': 'Drowning Lullaby',
  'ab.grandmother_mire.drowning_lullaby.description':
    'Places [Sleep] on all enemies for {turns} turn and [Heal Reduction] on them, each with a {chance}% chance. Cooldown {cooldown} turns.',
  'ab.grandmother_mire.the_marsh_takes.name': 'The Marsh Takes',
  'ab.grandmother_mire.the_marsh_takes.description':
    'Attacks all enemies for {dmg}% of ATK and heals herself for {heal}% of her max HP. Cooldown {cooldown} turns.',

  // Settlement 11 — Ironcrag Citadel
  'settlement.ironcrag_citadel.name': 'Ironcrag Citadel',
  'settlement.ironcrag_citadel.description':
    'The last real fortress in Veyrath, and the knights who decided who deserves its gate.',
  'faction.citadel_knights.name': 'Citadel Knights',
  'enemy.citadel_blade.name': 'Citadel Blade',
  'enemy.wall_archer.name': 'Wall Archer',
  'enemy.siege_knight.name': 'Siege Knight',
  'enemy.gate_warden.name': 'Gate Warden',
  'enemy.chapel_inquisitor.name': 'Chapel Inquisitor',
  'enemy.field_cleric.name': 'Field Cleric',
  'enemy.castellan_vaughn.name': 'Castellan Vaughn',
  'ab.castellan_vaughn.castellans_hammer.name': 'Castellan’s Hammer',
  'ab.castellan_vaughn.castellans_hammer.description':
    'Attacks one enemy for {dmg}% of DEF with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.castellan_vaughn.close_the_gate.name': 'Close the Gate',
  'ab.castellan_vaughn.close_the_gate.description':
    'Cleanses his knights, places [DEF Up] on them for {turns} turns and puts [Ally Protection] on the line. Cooldown {cooldown} turns.',
  'ab.castellan_vaughn.judgement_of_ironcrag.name': 'Judgement of Ironcrag',
  'ab.castellan_vaughn.judgement_of_ironcrag.description':
    'Attacks all enemies for {dmg}% of DEF with a {chance}% chance to place [Block Buffs] for {turns} turns. Cooldown {cooldown} turns.',

  // Settlement 12 — The Eclipse Gate
  'settlement.eclipse_gate.name': 'The Eclipse Gate',
  'settlement.eclipse_gate.description':
    'The rift itself. Whatever keeps it open is standing directly in front of it.',
  'faction.eclipse_cult.name': 'The Eclipse Cult',
  'enemy.void_acolyte.name': 'Void Acolyte',
  'enemy.star_caller.name': 'Star-Caller',
  'enemy.rift_hulk.name': 'Rift Hulk',
  'enemy.eclipse_warden.name': 'Eclipse Warden',
  'enemy.nightbinder.name': 'Nightbinder',
  'enemy.soul_tender.name': 'Soul Tender',
  'enemy.the_gatekeeper.name': 'The Gatekeeper',
  'ab.the_gatekeeper.rift_lash.name': 'Rift Lash',
  'ab.the_gatekeeper.rift_lash.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to drain {tm}% of its turn meter.',
  'ab.the_gatekeeper.unmake.name': 'Unmake',
  'ab.the_gatekeeper.unmake.description':
    'Removes every buff from all enemies, attacks them for {dmg}% of ATK and places [Block Buffs] for {turns} turns with a {chance}% chance. Cooldown {cooldown} turns.',
  'ab.the_gatekeeper.the_gate_opens.name': 'The Gate Opens',
  'ab.the_gatekeeper.the_gate_opens.description':
    'Attacks all enemies for {dmg}% of ATK, places [Burn] for {turns} turns with a {chance}% chance, and swells its own ATK. Cooldown {cooldown} turns.',
} as const;

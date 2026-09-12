/**
 * Champion names, lore and ability texts (docs/design/CHAMPIONS.md §4). Ability descriptions use
 * the placeholders resolved by `engine/champions/describe.ts`: {dmg} {dmg2} {hits} {chance} {turns}
 * {value} {heal} {shield} {tm} {cooldown} {defIgnore}. Names never change with upgrades.
 */
export const champions = {
  // ---- Common -------------------------------------------------------------------------------
  'champ.gil_scrapper.name': 'Gil the Scrapper',
  'champ.gil_scrapper.lore':
    'Gil fought for coin in the Greyhaven docks until the Eclipse took the harbour. He still swings the same rusted cleaver, and still expects to be paid.',
  'ab.gil_scrapper.rusty_cleave.name': 'Rusty Cleave',
  'ab.gil_scrapper.rusty_cleave.description': 'Attacks one enemy for {dmg}% of ATK.',

  'champ.wenna_novice.name': 'Wenna, Novice Acolyte',
  'champ.wenna_novice.lore':
    'A first-year acolyte of the Faith who fled the burning chapter house with a prayer book and a bruised knuckle. She heals herself before she thinks of anyone else — for now.',
  'ab.wenna_novice.prayer_strike.name': 'Prayer Strike',
  'ab.wenna_novice.prayer_strike.description':
    'Attacks one enemy for {dmg}% of ATK and heals Wenna for {heal}% of her max HP.',

  'champ.bran_militia.name': 'Bran of the Militia',
  'champ.bran_militia.lore':
    'Bran held the Thornwood bridge with a kite shield and a borrowed spear until the militia broke around him. He does not talk about the bridge.',
  'ab.bran_militia.shield_jab.name': 'Shield Jab',
  'ab.bran_militia.shield_jab.description': 'Attacks one enemy for {dmg}% of DEF.',

  // ---- Uncommon -----------------------------------------------------------------------------
  'champ.orla_hedge_witch.name': 'Orla the Hedge Witch',
  'champ.orla_hedge_witch.lore':
    'Orla brews poultices from marsh herbs and threatens people with a thorned whip when they laugh at the smell. Nobody laughs twice.',
  'ab.orla_hedge_witch.thorn_whip.name': 'Thorn Whip',
  'ab.orla_hedge_witch.thorn_whip.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns.',
  'ab.orla_hedge_witch.poultice.name': 'Poultice',
  'ab.orla_hedge_witch.poultice.description':
    "Heals the ally with the lowest HP for {heal}% of Orla's max HP. Cooldown {cooldown} turns.",

  'champ.tobbe_pikeman.name': 'Tobbe Pikeman',
  'champ.tobbe_pikeman.lore':
    'Third rank, second file of the Kingsroad pike wall. Tobbe learned that a line of points beats a single hero, and he has been trying to be a line ever since.',
  'ab.tobbe_pikeman.pike_thrust.name': 'Pike Thrust',
  'ab.tobbe_pikeman.pike_thrust.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.tobbe_pikeman.line_charge.name': 'Line Charge',
  'ab.tobbe_pikeman.line_charge.description':
    'Attacks all enemies for {dmg}% of ATK. Cooldown {cooldown} turns.',

  'champ.mire_stalker.name': 'Mire Stalker',
  'champ.mire_stalker.lore':
    'A lizardfolk hunter of the Duskmere marsh who follows prey for days before striking once. The Eclipse drowned its clutch; it hunts the cult now.',
  'ab.mire_stalker.venom_bite.name': 'Venom Bite',
  'ab.mire_stalker.venom_bite.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns.',
  'ab.mire_stalker.ambush.name': 'Ambush',
  'ab.mire_stalker.ambush.description':
    'Attacks one enemy for {dmg}% of ATK with +20% critical rate on this hit. Cooldown {cooldown} turns.',

  // ---- Rare (starters) ----------------------------------------------------------------------
  'champ.sister_maelis.name': 'Sister Maelis',
  'champ.sister_maelis.lore':
    'The last sister of a chapter house the Eclipse emptied in one night. Maelis keeps the vigil for whoever is weakest in the room, and swings a censer heavy enough to crack bone.',
  'ab.sister_maelis.censer_swing.name': 'Censer Swing',
  'ab.sister_maelis.censer_swing.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.sister_maelis.blessed_light.name': 'Blessed Light',
  'ab.sister_maelis.blessed_light.description':
    'Heals all allies for {heal}% of their max HP and removes one debuff from each. Cooldown {cooldown} turns.',
  'ab.sister_maelis.vigil.name': 'Vigil',
  'ab.sister_maelis.vigil.description':
    'At the start of her turn, the ally with the lowest HP gains [Continuous Heal] for {turns} turn.',

  'champ.ser_corvin.name': 'Ser Corvin',
  'champ.ser_corvin.lore':
    'A knight of the Old Kingsroad who swore an oath to a king the Eclipse has since unmade. The oath outlived the king; Corvin keeps it for whoever stands behind him.',
  'ab.ser_corvin.shield_bash.name': 'Shield Bash',
  'ab.ser_corvin.shield_bash.description':
    'Attacks one enemy for {dmg}% of DEF with a {chance}% chance to place [Provoke] for {turns} turn.',
  'ab.ser_corvin.stand_fast.name': 'Stand Fast',
  'ab.ser_corvin.stand_fast.description':
    'Places [DEF Up] on all allies for {turns} turns and [Ally Protection] on the ally with the lowest HP for {turns} turns. Cooldown {cooldown} turns.',
  'ab.ser_corvin.oathbound.name': 'Oathbound',
  'ab.ser_corvin.oathbound.description': 'Takes 10% less damage while any ally is below 50% HP.',

  'champ.reva_ashblade.name': 'Reva Ashblade',
  'champ.reva_ashblade.lore':
    'Reva learned the sword in the Ashfall pits, where a fight ends when one fighter stops moving. She strikes twice because once was never enough there.',
  'ab.reva_ashblade.quick_cut.name': 'Quick Cut',
  'ab.reva_ashblade.quick_cut.description':
    'Attacks one enemy for {dmg}% of ATK with a 20% chance to strike a second time.',
  'ab.reva_ashblade.ash_flurry.name': 'Ash Flurry',
  'ab.reva_ashblade.ash_flurry.description':
    'Strikes three times at random enemies for {dmg}% of ATK each. Cooldown {cooldown} turns.',
  'ab.reva_ashblade.kindled.name': 'Kindled',
  'ab.reva_ashblade.kindled.description': 'Deals 5% more damage per debuff on the target, up to 15%.',

  // ---- Epic ---------------------------------------------------------------------------------
  'champ.anuria.name': 'Anuria, Silverwood Ranger',
  'champ.anuria.lore':
    'The Silverwood rangers marked their arrows with a sliver of moonsteel so the wood would remember every shot. Anuria is the last who still fletches them that way.',
  'ab.anuria.silver_arrow.name': 'Silver Arrow',
  'ab.anuria.silver_arrow.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.anuria.piercing_volley.name': 'Piercing Volley',
  'ab.anuria.piercing_volley.description':
    'Attacks all enemies for {dmg}% of ATK, ignoring {defIgnore}% of their DEF. Cooldown {cooldown} turns.',
  'ab.anuria.heartseeker.name': 'Heartseeker',
  'ab.anuria.heartseeker.description':
    'Attacks one enemy for {dmg}% of ATK. Always a critical hit if the target has a debuff. Cooldown {cooldown} turns.',
  'ab.anuria.rangers_focus.name': "Ranger's Focus",
  'ab.anuria.rangers_focus.description':
    'Critical hits deal 15% more damage against enemies with [DEF Down].',

  'champ.darius.name': 'Darius the Wayfarer',
  'champ.darius.lore':
    'Darius walked out of the Eclipse Gate carrying an hourglass that runs backwards. He will not say what he traded for it, only that the sand is not sand.',
  'ab.darius.wayfarers_bolt.name': "Wayfarer's Bolt",
  'ab.darius.wayfarers_bolt.description':
    "Attacks one enemy for {dmg}% of ATK with a {chance}% chance to decrease the target's turn meter by {tm}%.",
  'ab.darius.stitch_in_time.name': 'Stitch in Time',
  'ab.darius.stitch_in_time.description':
    'Fills the turn meter of all allies by {tm}% and places [SPD Up] on them for {turns} turns. Cooldown {cooldown} turns.',
  'ab.darius.hourglass_shatter.name': 'Hourglass Shatter',
  'ab.darius.hourglass_shatter.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn, and decreases their turn meters by 25%. Cooldown {cooldown} turns.',
  'ab.darius.threads_of_fate.name': 'Threads of Fate',
  'ab.darius.threads_of_fate.description': 'When Darius stuns an enemy, he fills his own turn meter by 10%.',

  'champ.khazgor.name': 'Khazgor the Unburied',
  'champ.khazgor.lore':
    'Khazgor was buried with honours at Barrowdeep and dug himself out three winters later, furious that the war had gone on without him. He has not stopped since.',
  'ab.khazgor.grave_slash.name': 'Grave Slash',
  'ab.khazgor.grave_slash.description':
    'Attacks one enemy for {dmg}% of DEF with a {chance}% chance to place [ATK Down] for {turns} turns.',
  'ab.khazgor.unyielding_wall.name': 'Unyielding Wall',
  'ab.khazgor.unyielding_wall.description':
    'Places [Provoke] on all enemies for 1 turn, then [DEF Up] and [Counterattack] on Khazgor for {turns} turns. Cooldown {cooldown} turns.',
  'ab.khazgor.bone_bulwark.name': 'Bone Bulwark',
  'ab.khazgor.bone_bulwark.description':
    "Places a [Shield] equal to {shield}% of Khazgor's max HP on all allies for {turns} turns. Cooldown {cooldown} turns.",
  'ab.khazgor.unburied.name': 'Unburied',
  'ab.khazgor.unburied.description':
    'Once per battle, when Khazgor would die he survives at 1 HP and heals 20% of his max HP at the start of his next turn.',

  'champ.maruan.name': 'Maruan, Starlight Adept',
  'champ.maruan.lore':
    'Maruan reads the sky over Sunspire the way others read ledgers. Every constellation is a promise, and Maruan keeps them all.',
  'ab.maruan.starlight.name': 'Starlight',
  'ab.maruan.starlight.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns.',
  'ab.maruan.constellation.name': 'Constellation',
  'ab.maruan.constellation.description':
    'Heals all allies for {heal}% of their max HP and places [Continuous Heal] on the two lowest for {turns} turns. Cooldown {cooldown} turns.',
  'ab.maruan.astral_ward.name': 'Astral Ward',
  'ab.maruan.astral_ward.description':
    'Places [Block Debuffs] and [C.RATE Up] on all allies for {turns} turns. Cooldown {cooldown} turns.',
  'ab.maruan.guiding_star.name': 'Guiding Star',
  'ab.maruan.guiding_star.description': 'Allies healed by Maruan gain [ATK Up] 8% for 1 turn.',

  'champ.rattledagger.name': 'Rattledagger',
  'champ.rattledagger.lore':
    'Nobody hired Rattledagger; it simply appeared behind whoever was about to be paid. It rattles when it is pleased, which is usually a bad sign for someone.',
  'ab.rattledagger.rattle_stab.name': 'Rattle Stab',
  'ab.rattledagger.rattle_stab.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns.',
  'ab.rattledagger.shadowstep.name': 'Shadowstep',
  'ab.rattledagger.shadowstep.description':
    'Attacks one enemy for {dmg}% of ATK with +30% critical rate on this hit. Grants an extra turn if this kills the target. Cooldown {cooldown} turns.',
  'ab.rattledagger.bone_rattle.name': 'Bone Rattle',
  'ab.rattledagger.bone_rattle.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Poison] for {turns} turns, then detonates existing [Poison] for 50% of its remaining damage. Cooldown {cooldown} turns.',
  'ab.rattledagger.between_the_ribs.name': 'Between the Ribs',
  'ab.rattledagger.between_the_ribs.description':
    '[Poison] placed by Rattledagger deals 6% of max HP per turn instead of 5%.',

  'champ.sethlurias.name': 'Sethlurias, Bonecaller',
  'champ.sethlurias.lore':
    'A skeletal priest of the old Justice who found that the dead make attentive congregations. His war chants raise the living as readily as the fallen.',
  'ab.sethlurias.splinter_hex.name': 'Splinter Hex',
  'ab.sethlurias.splinter_hex.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns.',
  'ab.sethlurias.war_chant.name': 'War Chant',
  'ab.sethlurias.war_chant.description':
    'Places [ATK Up] on all allies for {turns} turns and fills their turn meters by {tm}%. Cooldown {cooldown} turns.',
  'ab.sethlurias.bone_storm.name': 'Bone Storm',
  'ab.sethlurias.bone_storm.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Heal Reduction] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.sethlurias.old_bones.name': 'Old Bones',
  'ab.sethlurias.old_bones.description':
    'At the start of each wave, all allies fill their turn meters by 10%.',

  'champ.thordakk.name': 'Thordakk Skullsplitter',
  'champ.thordakk.lore':
    'Thordakk once split a Frostvein warlord from crown to collarbone and asked who was next. The axe has been asking ever since.',
  'ab.thordakk.cleave.name': 'Cleave',
  'ab.thordakk.cleave.description':
    'Attacks one enemy for {dmg}% of ATK and one adjacent enemy for {dmg2}% of ATK.',
  'ab.thordakk.skullsplitter.name': 'Skullsplitter',
  'ab.thordakk.skullsplitter.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn. Cooldown {cooldown} turns.',
  'ab.thordakk.whirling_axe.name': 'Whirling Axe',
  'ab.thordakk.whirling_axe.description':
    'Attacks all enemies for {dmg}% of ATK and places [ATK Up] on Thordakk for {turns} turns. Cooldown {cooldown} turns.',
  'ab.thordakk.blood_fury.name': 'Blood Fury',
  'ab.thordakk.blood_fury.description': 'Deals 4% more damage for every 10% of missing HP, up to 40%.',

  // ---- Legendary ----------------------------------------------------------------------------
  'champ.aurelia_dawnwarden.name': 'Aurelia Dawnwarden',
  'champ.aurelia_dawnwarden.lore':
    'Warden of the last chapel that still sees dawn. Aurelia stands where the light is thinnest and dares the dark to try.',
  'ab.aurelia_dawnwarden.dawn_strike.name': 'Dawn Strike',
  'ab.aurelia_dawnwarden.dawn_strike.description':
    'Attacks one enemy for {dmg}% of DEF with a {chance}% chance to place [ATK Down] for {turns} turns.',
  'ab.aurelia_dawnwarden.sanctuary.name': 'Sanctuary',
  'ab.aurelia_dawnwarden.sanctuary.description':
    'Places [Ally Protection] 30% on all allies for {turns} turns and a [Shield] of 15% of her max HP on Aurelia. Cooldown {cooldown} turns.',
  'ab.aurelia_dawnwarden.purifying_light.name': 'Purifying Light',
  'ab.aurelia_dawnwarden.purifying_light.description':
    'Removes all debuffs from all allies and heals them for {heal}% of their max HP. Cooldown {cooldown} turns.',
  'ab.aurelia_dawnwarden.judgement.name': 'Judgement',
  'ab.aurelia_dawnwarden.judgement.description':
    'Attacks all enemies for {dmg}% of DEF with a {chance}% chance to place [Block Buffs] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.aurelia_dawnwarden.wardens_oath.name': "Warden's Oath",
  'ab.aurelia_dawnwarden.wardens_oath.description':
    'When an ally drops below 30% HP, Aurelia grants them a [Shield] of 20% of her max HP for 1 turn (once per ally per wave).',
  'ab.aurelia_dawnwarden.dawn_aura.name': 'Dawn Aura',
  'ab.aurelia_dawnwarden.dawn_aura.description': 'Increases the DEF of all allies by 15% when Aurelia leads.',

  'champ.vorrak_bloodhowl.name': 'Vorrak Bloodhowl',
  'champ.vorrak_bloodhowl.lore':
    'The pack that raised Vorrak was wiped out at Ironcrag. He learned to howl alone, and then to make sure he never had to fight alone again.',
  'ab.vorrak_bloodhowl.ragged_bite.name': 'Ragged Bite',
  'ab.vorrak_bloodhowl.ragged_bite.description':
    'Attacks one enemy for {dmg}% of ATK and heals Vorrak for 20% of the damage dealt.',
  'ab.vorrak_bloodhowl.bloodhowl.name': 'Bloodhowl',
  'ab.vorrak_bloodhowl.bloodhowl.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Bleed] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.vorrak_bloodhowl.feeding_frenzy.name': 'Feeding Frenzy',
  'ab.vorrak_bloodhowl.feeding_frenzy.description':
    'Attacks all enemies {hits} times for {dmg}% of ATK. Each kill adds one more sweep, up to five. Cooldown {cooldown} turns.',
  'ab.vorrak_bloodhowl.apex_predator.name': 'Apex Predator',
  'ab.vorrak_bloodhowl.apex_predator.description':
    'Places [ATK Up] 50% and [C.RATE Up] 30% on Vorrak for {turns} turns and fills his turn meter completely. Cooldown {cooldown} turns.',
  'ab.vorrak_bloodhowl.scent_of_blood.name': 'Scent of Blood',
  'ab.vorrak_bloodhowl.scent_of_blood.description': 'Deals 10% more damage to enemies below 50% HP.',
  'ab.vorrak_bloodhowl.pack_aura.name': 'Pack Aura',
  'ab.vorrak_bloodhowl.pack_aura.description': 'Increases the ATK of all allies by 20% when Vorrak leads.',

  'champ.seraphine_vale.name': 'Seraphine Vale',
  'champ.seraphine_vale.lore':
    'Seraphine died at Greyhaven and came back with wings she does not talk about. Since then, nobody under her care has stayed dead for long.',
  'ab.seraphine_vale.grace.name': 'Grace',
  'ab.seraphine_vale.grace.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Heal Reduction] for {turns} turns.',
  'ab.seraphine_vale.renewal.name': 'Renewal',
  'ab.seraphine_vale.renewal.description':
    'Heals all allies for {heal}% of their max HP and removes two debuffs from each. Cooldown {cooldown} turns.',
  'ab.seraphine_vale.guardian_wings.name': 'Guardian Wings',
  'ab.seraphine_vale.guardian_wings.description':
    'Places [Revive on Death] on all allies for {turns} turns; a fallen ally returns with 30% HP. Cooldown {cooldown} turns.',
  'ab.seraphine_vale.ascension.name': 'Ascension',
  'ab.seraphine_vale.ascension.description':
    'Revives all dead allies with 50% HP, heals the living for {heal}% of their max HP and places [Block Debuffs] on all allies for {turns} turns. Cooldown {cooldown} turns.',
  'ab.seraphine_vale.halo.name': 'Halo',
  'ab.seraphine_vale.halo.description':
    'At the start of her turn, heals the ally with the lowest HP for 5% of their max HP.',
  'ab.seraphine_vale.grace_aura.name': 'Grace Aura',
  'ab.seraphine_vale.grace_aura.description': 'Increases the HP of all allies by 15% when Seraphine leads.',

  'champ.morrigan_nightweaver.name': 'Morrigan Nightweaver',
  'champ.morrigan_nightweaver.lore':
    'Morrigan weaves the dark itself into a cloak, and the cloak into a blade. Those who try to strike her find they were aiming at the wrong shadow.',
  'ab.morrigan_nightweaver.nightweave.name': 'Nightweave',
  'ab.morrigan_nightweaver.nightweave.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Sleep] for {turns} turn.',
  'ab.morrigan_nightweaver.shadow_lash.name': 'Shadow Lash',
  'ab.morrigan_nightweaver.shadow_lash.description':
    'Attacks the two enemies with the highest ATK for {dmg}% of ATK and decreases their turn meters by {tm}%. Cooldown {cooldown} turns.',
  'ab.morrigan_nightweaver.umbral_cage.name': 'Umbral Cage',
  'ab.morrigan_nightweaver.umbral_cage.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Stun] for 1 turn and places [Block Buffs] for 2 turns. Cooldown {cooldown} turns.',
  'ab.morrigan_nightweaver.eclipse_requiem.name': 'Eclipse Requiem',
  'ab.morrigan_nightweaver.eclipse_requiem.description':
    'Attacks one enemy for {dmg}% of ATK, ignoring {defIgnore}% of DEF. If this kills the target, all enemies lose 25% of their turn meter. Cooldown {cooldown} turns.',
  'ab.morrigan_nightweaver.veiled.name': 'Veiled',
  'ab.morrigan_nightweaver.veiled.description':
    'Morrigan cannot be targeted by single-target attacks while another ally is alive.',
  'ab.morrigan_nightweaver.night_aura.name': 'Night Aura',
  'ab.morrigan_nightweaver.night_aura.description':
    'Increases the SPD of all allies by 15% in campaign battles when Morrigan leads.',

  'champ.kaelith_stormcaller.name': 'Kaelith Stormcaller',
  'champ.kaelith_stormcaller.lore':
    'Kaelith climbed Frostvein Pass in a lightning storm and came down speaking to it. The storm, it turns out, is a good listener and a better weapon.',
  'ab.kaelith_stormcaller.spark.name': 'Spark',
  'ab.kaelith_stormcaller.spark.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns.',
  'ab.kaelith_stormcaller.chain_lightning.name': 'Chain Lightning',
  'ab.kaelith_stormcaller.chain_lightning.description':
    'Attacks one enemy for {dmg}% of ATK, then arcs to two random enemies for {dmg2}% of ATK each. Cooldown {cooldown} turns.',
  'ab.kaelith_stormcaller.thunderhead.name': 'Thunderhead',
  'ab.kaelith_stormcaller.thunderhead.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [DEF Down] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.kaelith_stormcaller.tempest.name': 'Tempest',
  'ab.kaelith_stormcaller.tempest.description':
    'Attacks all enemies for {dmg}% of ATK. Always a critical hit against enemies with [DEF Down]. Cooldown {cooldown} turns.',
  'ab.kaelith_stormcaller.static.name': 'Static',
  'ab.kaelith_stormcaller.static.description':
    '+10% critical rate for every enemy with [DEF Down], up to 30%.',
  'ab.kaelith_stormcaller.storm_aura.name': 'Storm Aura',
  'ab.kaelith_stormcaller.storm_aura.description':
    'Increases the critical rate of all allies by 20% when Kaelith leads.',

  'champ.eldric_chronicler.name': 'Eldric the Chronicler',
  'champ.eldric_chronicler.lore':
    'Eldric keeps the book of Emberhold, and the book keeps him. Every page he turns is a moment given back; the last page, he says, is still unwritten.',
  'ab.eldric_chronicler.quill_strike.name': 'Quill Strike',
  'ab.eldric_chronicler.quill_strike.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [SPD Down] for {turns} turns.',
  'ab.eldric_chronicler.turn_the_page.name': 'Turn the Page',
  'ab.eldric_chronicler.turn_the_page.description':
    'Fills the turn meter of all allies by {tm}% and removes one debuff from each. Cooldown {cooldown} turns.',
  'ab.eldric_chronicler.written_fate.name': 'Written Fate',
  'ab.eldric_chronicler.written_fate.description':
    'Places [Block Debuffs] and [RES Up] on all allies for {turns} turns. Cooldown {cooldown} turns.',
  'ab.eldric_chronicler.final_chapter.name': 'Final Chapter',
  'ab.eldric_chronicler.final_chapter.description':
    'Attacks all enemies for {dmg}% of ATK, decreases their turn meters by {tm}% and places [Weaken] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.eldric_chronicler.unfinished_story.name': 'Unfinished Story',
  'ab.eldric_chronicler.unfinished_story.description':
    'Once per battle, Eldric revives himself with 40% HP when he dies.',
  'ab.eldric_chronicler.chronicle_aura.name': 'Chronicle Aura',
  'ab.eldric_chronicler.chronicle_aura.description':
    'Increases the HP of all allies by 12% and their SPD by 8 when Eldric leads.',

  // ---- Mythic -------------------------------------------------------------------------------
  'champ.varkos_sundered_king.name': 'Varkos, the Sundered King',
  'champ.varkos_sundered_king.lore':
    'Varkos ruled the kingdom the Eclipse swallowed first. Half of him came back through the gate; the other half is still down there, wearing the crown.',
  'ab.varkos_sundered_king.sundering_blow.name': 'Sundering Blow',
  'ab.varkos_sundered_king.sundering_blow.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns.',
  'ab.varkos_sundered_king.crown_of_ash.name': 'Crown of Ash',
  'ab.varkos_sundered_king.crown_of_ash.description':
    'Attacks all enemies for {dmg}% of ATK, removes one buff from each and heals Varkos for 15% of the damage dealt. Cooldown {cooldown} turns.',
  'ab.varkos_sundered_king.sovereign_will.name': 'Sovereign Will',
  'ab.varkos_sundered_king.sovereign_will.description':
    'Places [ATK Up], [DEF Up] and [Block Debuffs] on all allies for {turns} turns. Cooldown {cooldown} turns.',
  'ab.varkos_sundered_king.the_kingdom_falls.name': 'The Kingdom Falls',
  'ab.varkos_sundered_king.the_kingdom_falls.description':
    'Attacks one enemy for {dmg}% of ATK, ignoring {defIgnore}% of DEF. If this kills the target, deals {dmg2}% of ATK to all remaining enemies and grants an extra turn. Cooldown {cooldown} turns.',
  'ab.varkos_sundered_king.sundered.name': 'Sundered',
  'ab.varkos_sundered_king.sundered.description':
    'Once per battle, Varkos revives with 50% HP and a [Shield] of 30% of his max HP for 2 turns. Takes 15% less damage from Eclipse enemies.',
  'ab.varkos_sundered_king.sovereign_aura.name': 'Sovereign Aura',
  'ab.varkos_sundered_king.sovereign_aura.description':
    'Increases the ATK of all allies by 18% and their HP by 10% when Varkos leads.',
} as const;

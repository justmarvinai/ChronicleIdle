/** Enemy names and kits, and the Training Grounds encounters. */
export const enemies = {
  'enemy.remnant_raider.name': 'Remnant Raider',
  'ab.remnant_raider.cleave.name': 'Cleave',
  'ab.remnant_raider.cleave.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.remnant_raider.reckless_swing.name': 'Reckless Swing',
  'ab.remnant_raider.reckless_swing.description':
    'Attacks one enemy for {dmg}% of ATK. Cooldown {cooldown} turns.',

  'enemy.remnant_marksman.name': 'Remnant Marksman',
  'ab.remnant_marksman.quick_shot.name': 'Quick Shot',
  'ab.remnant_marksman.quick_shot.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.remnant_marksman.scatter_volley.name': 'Scatter Volley',
  'ab.remnant_marksman.scatter_volley.description':
    'Attacks all enemies for {dmg}% of ATK. Cooldown {cooldown} turns.',

  'enemy.remnant_brute.name': 'Remnant Brute',
  'ab.remnant_brute.club.name': 'Club',
  'ab.remnant_brute.club.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns.',
  'ab.remnant_brute.earthshaker.name': 'Earthshaker',
  'ab.remnant_brute.earthshaker.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn. Cooldown {cooldown} turns.',

  'enemy.remnant_warden.name': 'Remnant Warden',
  'ab.remnant_warden.shield_slam.name': 'Shield Slam',
  'ab.remnant_warden.shield_slam.description': 'Attacks one enemy for {dmg}% of DEF.',
  'ab.remnant_warden.hold_the_line.name': 'Hold the Line',
  'ab.remnant_warden.hold_the_line.description':
    'Places [DEF Up] on all allies for {turns} turns and [Provoke] on all enemies for 1 turn. Cooldown {cooldown} turns.',

  'enemy.remnant_hexer.name': 'Remnant Hexer',
  'ab.remnant_hexer.hex_bolt.name': 'Hex Bolt',
  'ab.remnant_hexer.hex_bolt.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [ATK Down] for {turns} turns.',
  'ab.remnant_hexer.miasma.name': 'Miasma',
  'ab.remnant_hexer.miasma.description':
    'Has a {chance}% chance to place [Poison] on all enemies for {turns} turns. Cooldown {cooldown} turns.',

  'enemy.remnant_mender.name': 'Remnant Mender',
  'ab.remnant_mender.thorn_lash.name': 'Thorn Lash',
  'ab.remnant_mender.thorn_lash.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.remnant_mender.mending_chant.name': 'Mending Chant',
  'ab.remnant_mender.mending_chant.description':
    'Heals all allies for {heal}% of their max HP. Cooldown {cooldown} turns.',

  'enemy.remnant_warlord.name': 'Remnant Warlord',
  'ab.remnant_warlord.warlords_cleave.name': "Warlord's Cleave",
  'ab.remnant_warlord.warlords_cleave.description': 'Attacks one enemy for {dmg}% of ATK.',
  'ab.remnant_warlord.breaking_wheel.name': 'Breaking Wheel',
  'ab.remnant_warlord.breaking_wheel.description':
    'Attacks all enemies for {dmg}% of ATK with a {chance}% chance to place [Weaken] for {turns} turns. Cooldown {cooldown} turns.',
  'ab.remnant_warlord.skullcrusher.name': 'Skullcrusher',
  'ab.remnant_warlord.skullcrusher.description':
    'Attacks one enemy for {dmg}% of ATK with a {chance}% chance to place [Stun] for {turns} turn. Cooldown {cooldown} turns.',

  'encounter.training.1.name': 'Sparring Ground',
  'encounter.training.1.description':
    'Two waves of Remnant raiders on the practice field. Learn the turn meter and the basics of targeting.',
  'encounter.training.2.name': 'Remnant Ambush',
  'encounter.training.2.description':
    'Three waves with a hexer, a brute and a mender in the mix. Focus the healer, cleanse the poison, watch your DEF.',
  'encounter.training.3.name': "The Warlord's Pit",
  'encounter.training.3.description':
    'A four-champion fight against a wall of Remnants and their enraging Warlord. Bring a leader with an aura.',
} as const;

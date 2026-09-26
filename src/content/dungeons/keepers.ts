/**
 * The four dungeon keepers (docs/design/DUNGEONS.md §3).
 *
 * A keeper stands on every stage of its dungeon, from the first to the fortieth: the fight is the
 * same shape all the way up and only the numbers move, which is what makes a dungeon a ladder you
 * learn once and climb forty times. Each is authored with `defineEnemy` like a stage boss, so it
 * scales with the stage's multiplier rather than carrying fixed stats the way a period boss does.
 *
 * Their kits are written around what their dungeon *sells*. The Cinder Warden is a wall, because
 * Cindervault holds the sets that make walls; the Ashwake takes extra turns, because Ashenreach
 * holds the sets that take extra turns. Bringing a keep's own gear to its keep should feel like
 * bringing the right tool.
 */
import { extraTurn, heal, hit, status } from '@content/champions/dsl';
import { defineEnemy } from '@content/enemies/dsl';

/**
 * Cindervault — a forge sealed in stone. Slow, enormously armoured, and it strikes with its own
 * plate rather than its arm, so armour is the stat that answers it. The gentlest of the four:
 * this is where a chronicle learns what a keeper is.
 */
export const cinderWarden = defineEnemy({
  id: 'enemy.cinder_warden',
  archetype: 'boss',
  element: 'valor',
  role: 'defense',
  stats: [1_680, 88, 96, 84, 10, 50, 45, 25],
  art: { tint: '#d2662c', scale: 1.38 },
  abilities: [
    {
      slot: 'a1',
      key: 'anvil_blow',
      icon: 'spell.weapon_warhammer',
      effects: [hit(2.4, 'single_enemy', { stat: 'DEF' })],
    },
    {
      slot: 'a2',
      key: 'bank_the_fires',
      icon: 'spell.crest_ember_shield',
      cooldown: 3,
      effects: [
        status('shield', 2, { target: 'self', value: 22 }),
        status('def_up', 2, { target: 'self', value: 30 }),
      ],
    },
    {
      slot: 'a3',
      key: 'tap_the_crucible',
      icon: 'spell.earth_lava_well',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        hit(2.6, 'all_enemies', { stat: 'DEF' }),
        status('burn', 2, { target: 'all_enemies', chance: 70, value: 4 }),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: ['stun', 'freeze', 'provoke'],
    enrageAfterTurn: 14,
    damageTakenMult: 1,
  },
});

/**
 * The Pale Expanse — a white waste that does not end. The Herald does not out-damage anyone; it
 * outlasts them, healing itself and shutting off theirs until the turn limit does its work. The
 * keep that sells Warding and Truesight is the keep that punishes having neither.
 */
export const paleHerald = defineEnemy({
  id: 'enemy.pale_herald',
  archetype: 'boss',
  element: 'faith',
  role: 'support',
  stats: [1_400, 94, 74, 96, 10, 50, 45, 40],
  art: { tint: '#b9cfe4', scale: 1.3 },
  abilities: [
    {
      slot: 'a1',
      key: 'hoarfrost_touch',
      icon: 'spell.orb_frostwind',
      effects: [hit(2.8), status('weaken', 2, { chance: 60, value: 25 })],
    },
    {
      slot: 'a2',
      key: 'the_long_white',
      icon: 'spell.fx_frost_comet',
      cooldown: 3,
      /*
       * 8 % of its own max HP. A percentage self-heal on an enemy whose HP pool *scales with the
       * stage* gets relatively stronger the deeper you go — the party's damage does not grow with
       * the keeper's pool — so a number that reads fair at Normal 1 is a wall at Hard 20.
       *
       * The heal's multiplier is a fraction like every other heal in the game: until 0.9.10 it was
       * written `8`, which the engine reads as eight times the Herald's max HP — a full heal every
       * fourth action, which is what had been carrying the keep's difficulty. The HP pool (above)
       * went back up to 1,400 from the 1,180 it had been cut to around that full heal, which puts
       * the Expanse's Normal rungs with the other three keeps (DUNGEONS.md §7).
       */
      effects: [heal(0.08, 'self', 'CASTER_MAX_HP'), status('res_up', 3, { target: 'self', value: 25 })],
    },
    {
      slot: 'a3',
      key: 'whiteout',
      icon: 'spell.tech_frost_cannon',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        hit(2.7, 'all_enemies'),
        status('freeze', 1, { target: 'all_enemies', chance: 30 }),
        status('heal_reduction', 2, { target: 'all_enemies', chance: 55, value: 40 }),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a3', 'a1', 'a2'],
    immunities: ['freeze', 'sleep', 'heal_reduction'],
    enrageAfterTurn: 12,
    damageTakenMult: 1,
  },
});

/**
 * Velkora's Cradle — a nest, and the thing that made it. Velkora is fragile for a keeper and hits
 * like nothing else in the game when she crits; she is the crit fight, which is why her keep holds
 * Keen Eye, Executioner and Retaliation.
 */
export const velkora = defineEnemy({
  id: 'enemy.velkora',
  archetype: 'boss',
  element: 'eclipse',
  role: 'attack',
  stats: [1_330, 124, 62, 108, 40, 85, 35, 40],
  art: { tint: '#8a5bb8', scale: 1.32 },
  abilities: [
    {
      slot: 'a1',
      key: 'brood_lash',
      icon: 'spell.blood_serpent_coil',
      effects: [hit(3.1), status('def_down', 2, { chance: 55, value: 30 })],
    },
    {
      slot: 'a2',
      key: 'the_cradle_stirs',
      icon: 'spell.blood_hex_circle',
      cooldown: 3,
      effects: [status('crit_rate_up', 3, { target: 'self', value: 30 }), hit(2.2, { random_enemies: 3 })],
    },
    {
      slot: 'a3',
      key: 'unsleeping',
      icon: 'spell.blood_crimson_moon',
      cooldown: 5,
      startsOnCooldown: true,
      effects: [hit(4.1, 'all_enemies'), status('poison', 3, { target: 'all_enemies', chance: 75 })],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a1', 'a3'],
    immunities: ['stun', 'sleep', 'fear'],
    enrageAfterTurn: 10,
    damageTakenMult: 1,
  },
});

/**
 * Ashenreach — the far grey, where the light gave up. The Ashwake is the fastest thing in the
 * game and takes turns out of order; losing to it feels like never getting one. Its keep holds
 * Swiftfoot, Relentless, Lifedrinker and Stunlock, which is exactly the answer to it — the
 * hardest dungeon sells the tools for the hardest dungeon.
 */
export const ashwake = defineEnemy({
  id: 'enemy.ashwake',
  archetype: 'boss',
  element: 'eclipse',
  role: 'attack',
  stats: [1_460, 116, 70, 124, 25, 70, 45, 45],
  art: { tint: '#6f6a72', scale: 1.36 },
  abilities: [
    {
      slot: 'a1',
      key: 'grey_tide',
      icon: 'spell.orb_voidspiral',
      // It finishes what it starts: a kill hands it the turn straight back.
      effects: [hit(2.9), extraTurn({ killedThisAction: true })],
    },
    {
      slot: 'a2',
      key: 'cinders_underfoot',
      icon: 'spell.rune_eclipse_mark',
      cooldown: 3,
      effects: [
        hit(2.4, 'all_enemies'),
        status('spd_down', 2, { target: 'all_enemies', chance: 65, value: 25 }),
        status('atk_up', 3, { target: 'self', value: 25 }),
      ],
    },
    {
      slot: 'a3',
      key: 'the_light_gives_up',
      icon: 'spell.fire_void_flame',
      cooldown: 4,
      startsOnCooldown: true,
      effects: [
        hit(3.6, 'all_enemies'),
        status('stun', 1, { target: 'all_enemies', chance: 30 }),
        extraTurn(),
      ],
    },
  ],
  boss: {
    rotation: ['a1', 'a2', 'a3', 'a1'],
    immunities: ['stun', 'freeze', 'sleep', 'provoke', 'fear'],
    enrageAfterTurn: 9,
    damageTakenMult: 1,
  },
});

/** Every keeper, in the order their dungeons read on the overview. */
export const DUNGEON_KEEPERS = [cinderWarden, paleHerald, velkora, ashwake] as const;

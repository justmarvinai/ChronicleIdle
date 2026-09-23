import { set } from './set';

export default set({
  slug: 'stunlock',
  pieces: 4,
  icon: 'spell.earth_lightspike',
  emblem: 'emblem.stunlock',
  art: {
    weapon: 'gear.stunlock.weapon',
    helmet: 'gear.stunlock.helmet',
    shield: 'gear.stunlock.shield',
    gauntlets: 'gear.stunlock.gauntlets',
    chestplate: 'gear.stunlock.chestplate',
    boots: 'gear.stunlock.boots',
  },
  grants: [
    {
      trigger: 'onHit',
      effects: [{ kind: 'apply_status', target: 'single_enemy', status: 'stun', turns: 1, chance: 18 }],
    },
  ],
  homes: [9],
});

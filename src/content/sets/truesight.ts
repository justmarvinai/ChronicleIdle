import { set } from './set';

export default set({
  slug: 'truesight',
  pieces: 2,
  icon: 'spell.hunt_bird_flight',
  emblem: 'emblem.truesight',
  art: {
    weapon: 'gear.truesight.weapon',
    helmet: 'gear.truesight.helmet',
    shield: 'gear.truesight.shield',
    gauntlets: 'gear.truesight.gauntlets',
    chestplate: 'gear.truesight.chestplate',
    boots: 'gear.truesight.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'acc', flat: 40 }] }],
  homes: [4],
});

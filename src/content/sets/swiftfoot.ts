import { set } from './set';

export default set({
  slug: 'swiftfoot',
  pieces: 2,
  icon: 'spell.orb_frostwind',
  emblem: 'emblem.swiftfoot',
  art: {
    weapon: 'gear.swiftfoot.weapon',
    helmet: 'gear.swiftfoot.helmet',
    shield: 'gear.swiftfoot.shield',
    gauntlets: 'gear.swiftfoot.gauntlets',
    chestplate: 'gear.swiftfoot.chestplate',
    boots: 'gear.swiftfoot.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'spd', percent: 12 }] }],
  homes: [2, 8],
});

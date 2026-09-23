import { set } from './set';

export default set({
  slug: 'retaliation',
  pieces: 4,
  icon: 'spell.hero_voidguard',
  emblem: 'emblem.retaliation',
  art: {
    weapon: 'gear.retaliation.weapon',
    helmet: 'gear.retaliation.helmet',
    shield: 'gear.retaliation.shield',
    gauntlets: 'gear.retaliation.gauntlets',
    chestplate: 'gear.retaliation.chestplate',
    boots: 'gear.retaliation.boots',
  },
  grants: [{ effects: [{ kind: 'counterattack', chance: 30 }] }],
  homes: [6, 11],
});

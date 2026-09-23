import { set } from './set';

export default set({
  slug: 'ember_guard',
  pieces: 2,
  icon: 'spell.crest_ember_shield',
  emblem: 'emblem.ember_guard',
  art: {
    weapon: 'gear.ember_guard.weapon',
    helmet: 'gear.ember_guard.helmet',
    shield: 'gear.ember_guard.shield',
    gauntlets: 'gear.ember_guard.gauntlets',
    chestplate: 'gear.ember_guard.chestplate',
    boots: 'gear.ember_guard.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }],
  homes: [1, 5],
});

import { set } from './set';

export default set({
  slug: 'ironhide',
  pieces: 2,
  icon: 'spell.crest_stone_guard',
  emblem: 'emblem.ironhide',
  art: {
    weapon: 'gear.ironhide.weapon',
    helmet: 'gear.ironhide.helmet',
    shield: 'gear.ironhide.shield',
    gauntlets: 'gear.ironhide.gauntlets',
    chestplate: 'gear.ironhide.chestplate',
    boots: 'gear.ironhide.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'def', percent: 15 }] }],
  homes: [2, 6],
});

import { set } from './set';

export default set({
  slug: 'relentless',
  pieces: 4,
  icon: 'spell.hero_stormblade',
  emblem: 'emblem.relentless',
  art: {
    weapon: 'gear.relentless.weapon',
    helmet: 'gear.relentless.helmet',
    shield: 'gear.relentless.shield',
    gauntlets: 'gear.relentless.gauntlets',
    chestplate: 'gear.relentless.chestplate',
    boots: 'gear.relentless.boots',
  },
  grants: [{ effects: [{ kind: 'extra_turn_chance', chance: 18 }] }],
  homes: [7, 12],
});

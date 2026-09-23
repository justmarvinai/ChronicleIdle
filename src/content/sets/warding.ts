import { set } from './set';

export default set({
  slug: 'warding',
  pieces: 2,
  icon: 'spell.crest_warded_shield',
  emblem: 'emblem.warding',
  art: {
    weapon: 'gear.warding.weapon',
    helmet: 'gear.warding.helmet',
    shield: 'gear.warding.shield',
    gauntlets: 'gear.warding.gauntlets',
    chestplate: 'gear.warding.chestplate',
    boots: 'gear.warding.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'res', flat: 30 }] }],
  homes: [3, 11],
});

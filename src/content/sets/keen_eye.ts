import { set } from './set';

export default set({
  slug: 'keen_eye',
  pieces: 2,
  icon: 'spell.fire_ember_eye',
  emblem: 'emblem.keen_eye',
  art: {
    weapon: 'gear.keen_eye.weapon',
    helmet: 'gear.keen_eye.helmet',
    shield: 'gear.keen_eye.shield',
    gauntlets: 'gear.keen_eye.gauntlets',
    chestplate: 'gear.keen_eye.chestplate',
    boots: 'gear.keen_eye.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'critRate', flat: 12 }] }],
  homes: [3, 10],
});

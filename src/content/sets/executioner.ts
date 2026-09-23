import { set } from './set';

export default set({
  slug: 'executioner',
  pieces: 2,
  icon: 'spell.blood_sanguine_blade',
  emblem: 'emblem.executioner',
  art: {
    weapon: 'gear.executioner.weapon',
    helmet: 'gear.executioner.helmet',
    shield: 'gear.executioner.shield',
    gauntlets: 'gear.executioner.gauntlets',
    chestplate: 'gear.executioner.chestplate',
    boots: 'gear.executioner.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'critDmg', flat: 20 }] }],
  homes: [4, 9],
});

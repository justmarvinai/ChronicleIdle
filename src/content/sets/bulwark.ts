import { set } from './set';

export default set({
  slug: 'bulwark',
  pieces: 4,
  icon: 'spell.tech_energy_shield',
  emblem: 'emblem.bulwark',
  art: {
    weapon: 'gear.bulwark.weapon',
    helmet: 'gear.bulwark.helmet',
    shield: 'gear.bulwark.shield',
    gauntlets: 'gear.bulwark.gauntlets',
    chestplate: 'gear.bulwark.chestplate',
    boots: 'gear.bulwark.boots',
  },
  grants: [
    {
      trigger: 'onWaveStart',
      effects: [
        { kind: 'apply_status', target: 'self', status: 'shield', value: 0.2, turns: 3, chance: 100 },
      ],
    },
  ],
  homes: [10],
});

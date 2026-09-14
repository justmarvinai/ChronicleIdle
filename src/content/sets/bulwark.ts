import { set } from './set';

export default set({
  slug: 'bulwark',
  pieces: 4,
  icon: 'spell.tech_energy_shield',
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

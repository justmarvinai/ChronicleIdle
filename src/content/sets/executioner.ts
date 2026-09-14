import { set } from './set';

export default set({
  slug: 'executioner',
  pieces: 2,
  icon: 'spell.blood_sanguine_blade',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'critDmg', flat: 20 }] }],
  homes: [4, 9],
});

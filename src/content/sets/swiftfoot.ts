import { set } from './set';

export default set({
  slug: 'swiftfoot',
  pieces: 2,
  icon: 'spell.orb_frostwind',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'spd', percent: 12 }] }],
  homes: [2, 8],
});

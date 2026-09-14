import { set } from './set';

export default set({
  slug: 'truesight',
  pieces: 2,
  icon: 'spell.hunt_bird_flight',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'acc', flat: 40 }] }],
  homes: [4],
});

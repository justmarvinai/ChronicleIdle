import { set } from './set';

export default set({
  slug: 'lifedrinker',
  pieces: 4,
  icon: 'spell.blood_chalice',
  grants: [{ trigger: 'onHit', effects: [{ kind: 'lifesteal', percent: 30 }] }],
  homes: [5, 12],
});

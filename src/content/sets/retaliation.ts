import { set } from './set';

export default set({
  slug: 'retaliation',
  pieces: 4,
  icon: 'spell.hero_voidguard',
  grants: [{ effects: [{ kind: 'counterattack', chance: 30 }] }],
  homes: [6, 11],
});

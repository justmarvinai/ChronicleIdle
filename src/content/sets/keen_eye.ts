import { set } from './set';

export default set({
  slug: 'keen_eye',
  pieces: 2,
  icon: 'spell.fire_ember_eye',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'critRate', flat: 12 }] }],
  homes: [3, 10],
});

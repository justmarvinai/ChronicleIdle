import { set } from './set';

export default set({
  slug: 'ember_guard',
  pieces: 2,
  icon: 'spell.crest_ember_shield',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] }],
  homes: [1, 5],
});

import { set } from './set';

export default set({
  slug: 'ironhide',
  pieces: 2,
  icon: 'spell.crest_stone_guard',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'def', percent: 15 }] }],
  homes: [2, 6],
});

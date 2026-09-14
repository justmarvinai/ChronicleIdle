import { set } from './set';

export default set({
  slug: 'warcry',
  pieces: 2,
  icon: 'spell.crest_warmark',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'atk', percent: 15 }] }],
  homes: [1, 7],
});

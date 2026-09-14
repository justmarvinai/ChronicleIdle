import { set } from './set';

export default set({
  slug: 'warding',
  pieces: 2,
  icon: 'spell.crest_warded_shield',
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'res', flat: 30 }] }],
  homes: [3, 11],
});

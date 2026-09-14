import { set } from './set';

export default set({
  slug: 'relentless',
  pieces: 4,
  icon: 'spell.hero_stormblade',
  grants: [{ effects: [{ kind: 'extra_turn_chance', chance: 18 }] }],
  homes: [7, 12],
});

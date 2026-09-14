import { set } from './set';

export default set({
  slug: 'immortal',
  pieces: 4,
  icon: 'spell.crest_sacred_anchor',
  grants: [
    // The stat half has to be its own static passive: a `stat_mod` on a trigger is never read.
    { effects: [{ kind: 'stat_mod', stat: 'hp', percent: 15 }] },
    {
      trigger: 'onTurnStart',
      effects: [{ kind: 'heal', target: 'self', mult: 0.03, stat: 'CASTER_MAX_HP' }],
    },
  ],
  homes: [8],
});

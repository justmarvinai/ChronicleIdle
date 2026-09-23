import { set } from './set';

export default set({
  slug: 'immortal',
  pieces: 4,
  icon: 'spell.crest_sacred_anchor',
  emblem: 'emblem.immortal',
  art: {
    weapon: 'gear.immortal.weapon',
    helmet: 'gear.immortal.helmet',
    shield: 'gear.immortal.shield',
    gauntlets: 'gear.immortal.gauntlets',
    chestplate: 'gear.immortal.chestplate',
    boots: 'gear.immortal.boots',
  },
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

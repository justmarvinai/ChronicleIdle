import { set } from './set';

export default set({
  slug: 'lifedrinker',
  pieces: 4,
  icon: 'spell.blood_chalice',
  emblem: 'emblem.lifedrinker',
  art: {
    weapon: 'gear.lifedrinker.weapon',
    helmet: 'gear.lifedrinker.helmet',
    shield: 'gear.lifedrinker.shield',
    gauntlets: 'gear.lifedrinker.gauntlets',
    chestplate: 'gear.lifedrinker.chestplate',
    boots: 'gear.lifedrinker.boots',
  },
  grants: [{ trigger: 'onHit', effects: [{ kind: 'lifesteal', percent: 30 }] }],
  homes: [5, 12],
});

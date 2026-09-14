import { set } from './set';

export default set({
  slug: 'stunlock',
  pieces: 4,
  icon: 'spell.earth_lightspike',
  grants: [
    {
      trigger: 'onHit',
      effects: [{ kind: 'apply_status', target: 'single_enemy', status: 'stun', turns: 1, chance: 18 }],
    },
  ],
  homes: [9],
});

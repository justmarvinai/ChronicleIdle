import { set } from './set';

export default set({
  slug: 'warcry',
  pieces: 2,
  icon: 'spell.crest_warmark',
  emblem: 'emblem.warcry',
  art: {
    weapon: 'gear.warcry.weapon',
    helmet: 'gear.warcry.helmet',
    shield: 'gear.warcry.shield',
    gauntlets: 'gear.warcry.gauntlets',
    chestplate: 'gear.warcry.chestplate',
    boots: 'gear.warcry.boots',
  },
  grants: [{ effects: [{ kind: 'stat_mod', stat: 'atk', percent: 15 }] }],
  homes: [1, 7],
});

/**
 * Chapter 4 — The Binding (docs/design/TUTORIAL.md §3): the Portal at level 4. Eldric hands over
 * the Ancient Shard he kept back, and the reveal it buys is always an Epic.
 */
import { chapter, gift, provision, step } from './dsl';

export default chapter({
  slug: 'the_binding',
  index: 4,
  trigger: { type: 'feature', feature: 'summoning' },
  steps: [
    // 3.1 — the shard arrives with the lesson, so the Portal is never opened empty-handed.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.portal'],
      allow: 'all',
      complete: { type: 'screen', screen: 'portal' },
      grant: gift('ancient_shard', { currency: 'shard_ancient', amount: 1 }),
    }),
    // 3.2 — place it, and read the colour. The scripted pull (SUMMONING.md §4).
    step({
      when: { type: 'screen', screen: 'portal' },
      spotlight: ['portal.shard', 'portal.summon'],
      complete: { type: 'counter', key: 'summon.pulls', count: 1 },
      script: 'summon',
    }),
    // 3.3 — the new name in the chronicle.
    step({
      when: { type: 'screen', screen: 'portal' },
      spotlight: ['summon.card'],
      complete: { type: 'acknowledged' },
      grant: provision('tutorial.the_binding'),
    }),
  ],
});

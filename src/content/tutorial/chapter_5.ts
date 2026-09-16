/**
 * Chapter 5 — The Path (docs/design/TUTORIAL.md §5): the Chronicler's Hall at level 6, where the
 * hundred and twenty pages Eldric wrote are waiting.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'the_path',
  index: 5,
  trigger: { type: 'feature', feature: 'missions' },
  steps: [
    // 5.1 — the Hall itself; the ledger button below it opens the same screen.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.missions', 'hub.hall'],
      allow: 'all',
      complete: { type: 'screen', screen: 'missions' },
    }),
    // 5.2 — the first page, already earned by the stand at Thornwood.
    step({
      when: { type: 'screen', screen: 'missions' },
      spotlight: ['missions.card'],
      complete: { type: 'counter', key: 'missions.claimed', count: 1 },
      grant: provision('tutorial.the_path'),
    }),
  ],
});

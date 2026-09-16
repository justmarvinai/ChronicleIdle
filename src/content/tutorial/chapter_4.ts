/**
 * Chapter 4 — Routine (docs/design/TUTORIAL.md §4): the daily board and the Idle Chest, both at
 * level 5 — the two habits the rest of the chronicle is built on.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'routine',
  index: 4,
  trigger: { type: 'feature', feature: 'quests_daily' },
  steps: [
    // 4.1 — the ledger.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.quests'],
      complete: { type: 'screen', screen: 'quests' },
    }),
    // 4.2 — the one quest that is already done: logging in.
    step({
      spotlight: ['quests.login'],
      complete: { type: 'counter', key: 'quests.claimed', count: 1 },
    }),
    // 4.3 — the chest at the docks, and the warning not to let it overflow.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.idle', 'idle.claim'],
      complete: { type: 'counter', key: 'idle.claims', count: 1 },
      grant: provision('tutorial.routine'),
    }),
  ],
});

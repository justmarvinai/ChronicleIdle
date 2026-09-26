/**
 * Chapter 5 — Routine (docs/design/TUTORIAL.md §4): the daily board and the Idle Chest at level 5,
 * and the Mine at 6 — the three habits the rest of the chronicle is built on. The Mine's two beats
 * wait for its level, so a chronicle that reaches 5 walks the first three and hears the rest the
 * moment it reaches 6; one that already had (a save from before 0.10.0) hears them on its next
 * visit to the hub.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'routine',
  index: 5,
  trigger: { type: 'feature', feature: 'quests_daily' },
  steps: [
    // 4.1 — the ledger.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.quests'],
      allow: 'all',
      complete: { type: 'screen', screen: 'quests' },
    }),
    // 4.2 — the one quest that is already done: logging in.
    step({
      when: { type: 'screen', screen: 'quests' },
      spotlight: ['quests.login'],
      complete: { type: 'counter', key: 'quests.claimed', count: 1 },
    }),
    // 4.3 — the chest at the docks, and the warning not to let it overflow. The chest is a dialog
    // over the hub, and the lesson points inside it, so it names that dialog as well as the screen.
    step({
      when: {
        type: 'any',
        of: [
          { type: 'screen', screen: 'hub' },
          { type: 'dialog', dialog: 'idle-chest' },
        ],
      },
      spotlight: ['hub.idle', 'idle.claim'],
      allow: 'all',
      complete: { type: 'counter', key: 'idle.claims', count: 1 },
      grant: provision('tutorial.routine'),
    }),
    // 4.4 — the Mine (6): its first store is already full, so there is always something to take.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'mine' },
          {
            type: 'any',
            of: [
              { type: 'screen', screen: 'hub' },
              { type: 'dialog', dialog: 'mine' },
            ],
          },
        ],
      },
      spotlight: ['hub.mine', 'mine.collect'],
      allow: 'all',
      complete: { type: 'counter', key: 'mine.collections', count: 1 },
    }),
    // 4.5 — and the level below it: what digging deeper buys, and what it asks for.
    step({
      when: { type: 'dialog', dialog: 'mine' },
      spotlight: ['mine.dig'],
      complete: { type: 'acknowledged' },
    }),
  ],
});

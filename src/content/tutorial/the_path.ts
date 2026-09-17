/**
 * Chapter 2 — The Path (docs/design/TUTORIAL.md §5): the Chronicler's Hall, opened the moment the
 * first stand is won.
 *
 * It is taught second, straight after the Awakening, because the missions are the guide — they are
 * what tells a new Chronicler what this world holds and in what order to reach for it (the owner's
 * first batch). Its second lesson pays out immediately: the stand at Thornwood has already earned
 * the Path's first page, so the chapter ends by claiming something rather than promising it.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'the_path',
  index: 2,
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

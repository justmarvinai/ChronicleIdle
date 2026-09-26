/**
 * Chapter 6 — Steel and Bone (docs/design/TUTORIAL.md §6): the single-step lessons of levels 7 and
 * up, from the rank-up at 7 to the Hall of Deeds at 13 and auto-repeat's second tier at 20. They do
 * not queue behind one another — each waits for its own feature and for the player to
 * walk into the room it lives in, so a chronicle that has not been to the Tavern since level 7
 * still gets the Forge's lesson at 8.
 *
 * The auto-repeat lesson waits for the second tier rather than the first (`USER_QUESTIONS.md` Q44):
 * level 5 already carries chapter 4's two lessons, and the first tier is what the selector opens on.
 */
import { chapter, step } from './dsl';

export default chapter({
  slug: 'steel_and_bone',
  index: 6,
  trigger: { type: 'feature', feature: 'tavern_rank' },
  sequential: false,
  steps: [
    // 6.1 — rank-up (7): stars cost copies.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'tavern_rank' },
          { type: 'screen', screen: 'tavern' },
        ],
      },
      spotlight: ['tavern.rankTab'],
      complete: { type: 'acknowledged' },
    }),
    // 6.2 — the Forge (8): sigils in, a piece out.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'forge' },
          { type: 'screen', screen: 'forge' },
        ],
      },
      spotlight: ['forge.craftTab'],
      complete: { type: 'acknowledged' },
    }),
    // 6.3 — skills (9): tomes sharpen what a champion already knows.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'tavern_skills' },
          { type: 'screen', screen: 'tavern' },
        ],
      },
      spotlight: ['tavern.skillsTab'],
      complete: { type: 'acknowledged' },
    }),
    // 6.4 — the daily boss (10): keys, accumulated damage, chests at thresholds.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'daily_boss' },
          { type: 'screen', screen: 'bosses' },
        ],
      },
      spotlight: ['boss.keys'],
      complete: { type: 'acknowledged' },
    }),
    // 6.5 — the weekly board (12): the same habit, at a week's pace.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'quests_weekly' },
          { type: 'screen', screen: 'quests' },
        ],
      },
      spotlight: ['quests.track'],
      complete: { type: 'acknowledged' },
    }),
    // 6.6 — the Titan (15): read its sheet before you spend a key on it.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'weekly_boss' },
          { type: 'screen', screen: 'bosses' },
        ],
      },
      spotlight: ['boss.sheet'],
      complete: { type: 'acknowledged' },
    }),
    // 6.7 — refining (18): a twin piece, spent to move one line.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'gear_refine' },
          { type: 'screen', screen: 'forge' },
        ],
      },
      spotlight: ['forge.refineTab'],
      complete: { type: 'acknowledged' },
    }),
    // 6.8 — auto-repeat (20): the selector that farms a stand while you are elsewhere.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'auto_repeat_25' },
          { type: 'screen', screen: 'battle-setup' },
        ],
      },
      spotlight: ['setup.repeat'],
      complete: { type: 'acknowledged' },
    }),
    // 6.9 — instant clears (11): a mastered stand written down rather than fought. It waits for a
    // battle setup on a stand with every star, so the press it points at is one that works.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'instant_clear' },
          { type: 'screen', screen: 'battle-setup' },
          { type: 'stand_mastered' },
        ],
      },
      spotlight: ['setup.instant'],
      complete: { type: 'acknowledged' },
    }),
    // 6.10 — the Hall of Deeds (13): one line, wherever it is first heard. On the hub it points
    // at the Hall's button; inside the Hall, at the press that claims everything already waiting.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'deeds' },
          {
            type: 'any',
            of: [
              { type: 'screen', screen: 'hub' },
              { type: 'screen', screen: 'deeds' },
            ],
          },
        ],
      },
      spotlight: ['hub.deeds', 'deeds.claimAll'],
      allow: 'all',
      complete: { type: 'acknowledged' },
    }),
  ],
});

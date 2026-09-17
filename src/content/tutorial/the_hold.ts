/**
 * Chapter 3 — The Hold (docs/design/TUTORIAL.md §2): the Tavern at level 2, gear at level 3. Two
 * lessons in one chapter, each waiting on the unlock that makes it true.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'the_hold',
  index: 3,
  trigger: { type: 'feature', feature: 'tavern_level' },
  steps: [
    // 2.1 — the Tavern.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.tavern'],
      allow: 'all',
      complete: { type: 'screen', screen: 'tavern' },
    }),
    // 2.2 — who is being raised.
    step({
      when: { type: 'screen', screen: 'tavern' },
      spotlight: ['tavern.roster'],
      complete: { type: 'clicked' },
    }),
    // 2.3 — the brews, and why the element matters.
    step({
      when: { type: 'screen', screen: 'tavern' },
      spotlight: ['tavern.brews'],
      complete: { type: 'clicked' },
    }),
    // 2.4 — the press.
    step({
      when: { type: 'screen', screen: 'tavern' },
      spotlight: ['tavern.upgrade'],
      complete: { type: 'counter', key: 'tavern.levelUps', count: 1 },
    }),
    // 2.5 — gear opens at level 3: the Champions hall, then the champion himself.
    step({
      when: {
        type: 'all',
        of: [
          { type: 'feature', feature: 'gear' },
          { type: 'screen', screen: 'hub' },
        ],
      },
      spotlight: ['hub.champions', 'champions.roster'],
      allow: 'all',
      complete: { type: 'screen', screen: 'champions' },
    }),
    // 2.6 — the six slots, beginning with the weapon.
    step({
      when: { type: 'screen', screen: 'champions' },
      spotlight: ['champions.gearTab', 'champions.weaponSlot'],
      complete: { type: 'dialog', dialog: 'gear-picker' },
    }),
    // 2.7 — the piece that fell at Thornwood.
    step({
      when: { type: 'dialog', dialog: 'gear-picker' },
      spotlight: ['gear.picker', 'gear.equip'],
      complete: { type: 'gear_worn', slot: 'weapon' },
    }),
    // 2.8 — gold into steel, at the racks. The pointer follows the player there.
    step({
      when: {
        type: 'any',
        of: [
          { type: 'screen', screen: 'champions' },
          { type: 'screen', screen: 'armoury' },
        ],
      },
      spotlight: ['champions.armoury', 'armoury.racks', 'armoury.upgrade'],
      allow: 'all',
      complete: { type: 'counter', key: 'gear.levels', count: 1 },
      grant: provision('tutorial.the_hold'),
    }),
  ],
});

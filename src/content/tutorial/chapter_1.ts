/**
 * Chapter 1 — Awakening (docs/design/TUTORIAL.md §1): from the naming of the chronicle to the
 * first stand cleared and the Chronicler's Provisions. The one chapter that cannot be skipped, and
 * the one that must be over inside six minutes.
 */
import { chapter, provision, step } from './dsl';

export default chapter({
  slug: 'awakening',
  index: 1,
  trigger: { type: 'new_game' },
  skippable: false,
  steps: [
    // 1.1 — the name. Eldric speaks before the chronicle exists, so this step runs off the empty
    // tutorial state and is recorded the moment the starter screen opens.
    step({
      when: { type: 'dialog', dialog: 'new-game' },
      spotlight: ['name.input'],
      allow: ['name.input', 'name.begin'],
      complete: { type: 'screen', screen: 'starter' },
    }),
    // 1.2 — the binding.
    step({
      spotlight: ['starter.cards'],
      complete: { type: 'starter_bound' },
    }),
    // 1.3 — out of Emberhold: the gate, then the campaign card behind it.
    step({
      when: { type: 'screen', screen: 'hub' },
      spotlight: ['hub.campaign', 'modes.campaign'],
      complete: { type: 'screen', screen: 'campaign' },
    }),
    // 1.4 — Thornwood Crossing, and the first stand on its list.
    step({
      spotlight: ['campaign.settlement1', 'settlement.stage1'],
      complete: { type: 'screen', screen: 'battle-setup' },
    }),
    // 1.5 — the team is pre-placed; all that is left is to begin. This is the fight that runs on
    // the fixed seed, so 1.6–1.8 always have their moments.
    step({
      spotlight: ['setup.team', 'setup.start'],
      allow: ['setup.team', 'setup.start'],
      complete: { type: 'screen', screen: 'battle' },
      script: 'battle',
    }),
    // 1.6 — the first turn: an ability, then a target.
    step({
      when: { type: 'battle_turn' },
      spotlight: ['battle.ability1'],
      allow: ['battle.ability1', 'battle.units'],
      complete: { type: 'ability_used', slot: 'a1' },
    }),
    // 1.7 — the second wave, and the cooldown that came with the first.
    step({
      when: { type: 'battle_turn', wave: 2 },
      spotlight: ['battle.ability2'],
      allow: ['battle.ability2', 'battle.units'],
      complete: { type: 'ability_used', slot: 'a2' },
    }),
    // 1.8 — handing the fight over.
    step({
      when: { type: 'battle_turn' },
      spotlight: ['battle.auto'],
      allow: ['battle.auto', 'battle.speed'],
      complete: { type: 'auto_battle' },
    }),
    // 1.9 — the spoils.
    step({
      when: { type: 'screen', screen: 'battle-result' },
      spotlight: ['result.rewards'],
      complete: { type: 'acknowledged' },
    }),
    // 1.10 — free play until the third stand falls: nothing is dimmed and nothing is blocked.
    step({
      when: { type: 'screen', screen: 'settlement' },
      spotlight: ['settlement.stage2'],
      allow: 'all',
      complete: { type: 'stage_cleared', settlement: 1, stage: 3 },
    }),
    // 1.11 — the Provisions, counted up on the pill while he says the number.
    step({
      when: {
        type: 'any',
        of: [
          { type: 'screen', screen: 'settlement' },
          { type: 'screen', screen: 'campaign' },
          { type: 'screen', screen: 'hub' },
        ],
      },
      spotlight: ['topbar.energy'],
      complete: { type: 'acknowledged' },
      grant: provision('tutorial.awakening'),
    }),
  ],
});

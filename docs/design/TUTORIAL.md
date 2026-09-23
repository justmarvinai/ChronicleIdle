# Tutorial & Onboarding

Related: `GAME_DESIGN.md` §6 (unlock levels), `docs/tech/UI_DESIGN.md` §5.18 (tutorial overlay).

The tutorial is an **interactive, scripted overlay** driven by data (`src/content/tutorial/*.ts`):
Eldric Lorekeeper (portrait `tutorial_npc_avatar.jpg`) speaks in a dialogue panel; the rest of
the screen is dimmed except a **spotlight** cut-out around the element the player must use; a
pointer hand pulses on it. A step that only asks to be read (*Continue* finishes it) has no
element to use, so every element it names is lit while he speaks instead — cut out of the dim and
ringed, to be seen rather than pressed. Each step declares: `when` (trigger), `spotlight`
(element id), `dialogue`, `allow` (which interactions are enabled), `complete` (event that
finishes the step), `skippable`. Steps are grouped into **chapters** that are triggered by
unlocks, so the tutorial teaches each feature when it appears, not all at once.

Design rules: never more than three consecutive dialogue boxes; every step ends with the player
doing the thing; the whole first chapter takes < 6 minutes; the tutorial state is saved per step so
reloading resumes; after chapter 1 an "Skip this lesson" button exists per chapter
(owner's answer, Q4).

Provisions: chapter 1 grants **500 Energy**, chapters 2–5 grant **250 Energy** each (1,500 in
total) — the early-game generosity the owner asked for (`ECONOMY.md` §5.1).

## Chapter 1 — Awakening (from Title to first victory)

| Step | Trigger | Spotlight / action | Dialogue (Eldric) | Completes when |
| --- | --- | --- | --- | --- |
| 1.1 | New Chronicle | Name input | "Every chronicle begins with a name. What shall the world call you, Chronicler?" | name confirmed |
| 1.2 | after 1.1 | Starter cards (Maelis / Corvin / Reva) | "Three pages remain legible in the book of Emberhold. Choose the champion you bind first — the others will find their way to you later." | starter chosen (card flip + binding FX) |
| 1.3 | after 1.2 | Hub → Campaign gate | "The Eclipse took Thornwood first. Let us take it back. To the crossing!" | campaign map opened |
| 1.4 | Campaign map | Settlement 1 → stage 1-1 | "Each settlement holds ten stands. Clear them, and the next one opens." | stage 1-1 selected |
| 1.5 | Battle setup | Team slots (3: starter + Bran + Wenna pre-placed; Gil waits in the roster) | "Your starter leads. Bran holds the line, Wenna keeps you standing — for now. Begin." | Start pressed |
| 1.6 | Battle, first ally turn | Ability A1 | "Speed decides who acts. When it is your turn, choose an ability, then a target." | A1 used |
| 1.7 | Wave 2, ally turn | A2 button of starter | "Stronger abilities rest between uses — mind the cooldown counter." | A2 used |
| 1.8 | after 1.7 | Auto + speed buttons | "You need not command every blow. Auto lets your champions decide; ×2 quickens the fight." | Auto toggled |
| 1.9 | Victory screen | The stars in the crest, and the spoils panel | "Three stars mark a flawless stand. Gold, experience, spoils — all yours." | Continue |
| 1.10 | Back on map | Stage 1-2 | "Onward. I will speak again when you have earned your second stand." (free play until 1-3 clear) | 1-3 cleared |
| 1.11 | 1-3 cleared | Energy pill in the top bar | "A Chronicler marches on full provisions. Take these — five hundred measures of energy — and do not ration them; more comes every minute." (**grants 500 Energy**) | Continue |

## Chapter 2 — The Path (from the first victory: Missions)

> **Moved.** This chapter used to sit fifth, behind level 6. The missions now open with the
> chronicle and are taught straight after the Awakening: they are what guides a player through what
> the game holds, in the role the Arbiter plays in the games this one is in the family of (the
> owner's first batch of changes).

| Step | Trigger | Spotlight | Dialogue | Completes when |
| --- | --- | --- | --- | --- |
| 5.1 | Level 6, on hub | Chronicler's Hall | "I have written you a path — one hundred and twenty pages of it. Walk it, and at its end I will fight beside you." | Missions opened |
| 5.2 | Missions | Mission 1.1 (already complete) | "Claim what you have already earned." (**grants 250 Energy**) | claimed |

## Chapter 3 — The Hold (player level 2–3: Tavern, Gear)

| Step | Trigger | Spotlight | Dialogue | Completes when |
| --- | --- | --- | --- | --- |
| 2.1 | Level 2 reached, on hub | Tavern building | "Your champions grow with drink and company. Visit the Tavern." | Tavern opened |
| 2.2 | Tavern | Starter in roster rail | "Choose the champion to raise." | starter selected |
| 2.3 | Tavern | Brew slots | "Brews are distilled experience. A brew of the champion's own element runs stronger." | brew placed |
| 2.4 | Tavern | Upgrade button | "Now — raise them." | level-up animation done |
| 2.5 | Gear unlocked (level 1), on hub | Champions building → champion detail | "Steel wins wars. Let us arm your champion." | champion detail opened |
| 2.6 | Champion detail | Empty weapon slot | "Every champion wears six pieces. Begin with the weapon." | slot opened |
| 2.7 | Gear list | The dropped weapon | "This one fell at Thornwood. Compare, then equip." | equipped |
| 2.8 | Gear panel | Upgrade (+1) button | "Gold sharpens steel. Raise it once." (**grants 250 Energy** on completion) | gear leveled |

## Chapter 4 — The Binding (level 4: Summoning)

| Step | Trigger | Spotlight | Dialogue | Completes when |
| --- | --- | --- | --- | --- |
| 3.1 | Level 4, on hub | Portal | "The Portal reads the shards. I kept one Ancient Shard for this moment." (grants 1 Ancient Shard) | Portal opened |
| 3.2 | Portal | Ancient Shard → Summon | "Place it and watch the light. Every colour it climbs is a rarer answer." | reveal finished (deterministic Epic) |
| 3.3 | Reveal | New champion card | "A new name in your chronicle. Add them to your team before the next stand." (**grants 250 Energy**) | Continue |

## Chapter 5 — Routine (level 5: Quests, Idle Chest)

| Step | Trigger | Spotlight | Dialogue | Completes when |
| --- | --- | --- | --- | --- |
| 4.1 | Level 5, on hub | Quests button | "Each day brings its duties, each week its labours. Fulfil them and the chests open." | Quests opened |
| 4.2 | Quests | Login quest claim | "This one is already done. Claim it." | claimed |
| 4.3 | Hub | Idle Chest at the docks | "While you are away, Emberhold works for you. The chest fills with time — until it is full. Do not let it overflow." (**grants 250 Energy**) | chest opened & claimed |

## Chapter 6 — Steel and Bone (levels 7–15: Rank-up, Forge, Skills, Bosses)

Short, single-step lessons triggered on first visit: Rank-up (7), Forge (8), Skill upgrade (9),
the Gargoyle (10, includes the "damage accumulates, chests at thresholds, keys reset" explanation),
Weekly Quests (12), the Titan (15), Refine (18), Auto-repeat (5/20/30). Each is one dialogue +
one spotlighted action.

## Data shape

**As shipped (0.0.14).** The script lives in `src/content/tutorial/`, one file per chapter named
for it (`awakening`, `the_path`, `the_hold`, `the_binding`, `routine`, `steel_and_bone`; 35 steps)
with `index.ts` holding the order, and is validated with everything else by
`pnpm content:validate`; the overlay is
`src/ui/tutorial/TutorialOverlay.tsx` and the step machine `src/engine/tutorial/script.ts`.


```ts
defineTutorialChapter({
  id: 'tut.awakening', trigger: { type: 'new_game' },
  steps: [
    { id: 'tut.1.6', when: { event: 'battle.decision_request', first: true }, spotlight: 'battle.ability.a1',
      dialogue: 'tut.1.6.text', allow: ['battle.ability.a1', 'battle.target.*'], complete: { event: 'battle.ability_used', ability: 'a1' } },
    ...
  ],
});
```

Tutorial state in save: `{ completedSteps: string[], skippedChapters: string[] }`. The step that is
*open* is derived from those, the chronicle and where the player is standing (ADR-042) — storing it
as well would be a third fact that can disagree with the other two (CLAUDE.md §5.5).

The battle in 1.5–1.9 uses a fixed seed so the scripted moments always occur, and 3.2 always turns
up an Epic through a rarity floor on that one press (`SUMMONING.md` §1).

Two rules the script holds to, both visible in the data:

- **A lesson points; only some cage.** `allow: 'all'` leaves the screen the player's own with the
  ring and the caret still on the target — every "go to the X" step reads that way. The steps that
  cage are the ones inside a panel or a fight, where a wrong press is what confuses a new player.
- **A turn lesson names the ability it teaches.** Turn order is not always the starter's, and a
  Common companion has one ability at level 1, so 1.7 waits for a turn that actually offers A2.
- **Eldric waits his turn.** Every step names where it is taught, and none opens over a dialog it
  does not name: the Welcome Back report and a level-up are answered first, because a lesson holds
  the screen while it speaks.

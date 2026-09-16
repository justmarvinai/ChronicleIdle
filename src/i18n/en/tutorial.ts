/**
 * Eldric the Chronicler (docs/design/TUTORIAL.md). One line per step, keyed by where the step sits
 * in the script, so this file reads in the order the game teaches itself. The lines of chapters 1
 * to 5 are the ones the design bible sets down; chapter 6's are written in the same voice.
 */
export const tutorial = {
  // The overlay's own chrome (`UI_DESIGN.md` §5.18).
  'tut.speaker': 'Eldric the Chronicler',
  'tut.continue': 'Continue',
  'tut.skip': 'Skip this lesson',
  'tut.skipped': 'Lesson skipped. Eldric will speak again at the next chapter.',
  'tut.lesson': 'Lesson {index} of {total}',
  'tut.chapterLabel': 'Chapter {index} — {name}',
  'tut.hint': 'Use the marked control to go on.',
  'tut.provision': 'Chronicler’s Provisions: {amount} energy.',
  'tut.gift': 'Eldric hands you what he kept back.',

  // Chapter names
  'tut.chapter.awakening.name': 'Awakening',
  'tut.chapter.the_hold.name': 'The Hold',
  'tut.chapter.the_binding.name': 'The Binding',
  'tut.chapter.routine.name': 'Routine',
  'tut.chapter.the_path.name': 'The Path',
  'tut.chapter.steel_and_bone.name': 'Steel and Bone',

  // Chapter 1 — Awakening
  'tut.1.1.text': 'Every chronicle begins with a name. What shall the world call you, Chronicler?',
  'tut.1.2.text':
    'Three pages remain legible in the book of Emberhold. Choose the champion you bind first — the others will find their way to you later.',
  'tut.1.3.text': 'The Eclipse took Thornwood first. Let us take it back. To the crossing!',
  'tut.1.4.text': 'Each settlement holds ten stands. Clear them, and the next one opens.',
  'tut.1.5.text': 'Your starter leads. Bran holds the line, Wenna keeps you standing — for now. Begin.',
  'tut.1.6.text': 'Speed decides who acts. When it is your turn, choose an ability, then a target.',
  'tut.1.7.text': 'Stronger abilities rest between uses — mind the cooldown counter.',
  'tut.1.8.text': 'You need not command every blow. Auto lets your champions decide; ×2 quickens the fight.',
  'tut.1.9.text': 'Three stars mark a flawless stand. Gold, experience, spoils — all yours.',
  'tut.1.10.text': 'Onward. I will speak again when you have earned your second stand.',
  'tut.1.11.text':
    'A Chronicler marches on full provisions. Take these — five hundred measures of energy — and do not ration them; more comes every minute.',

  // Chapter 2 — The Hold
  'tut.2.1.text': 'Your champions grow with drink and company. Visit the Tavern.',
  'tut.2.2.text': 'Choose the champion to raise.',
  'tut.2.3.text': 'Brews are distilled experience. A brew of the champion’s own element runs stronger.',
  'tut.2.4.text': 'Now — raise them.',
  'tut.2.5.text': 'Steel wins wars. Let us arm your champion.',
  'tut.2.6.text': 'Every champion wears six pieces. Begin with the weapon.',
  'tut.2.7.text': 'This one fell at Thornwood. Compare, then equip.',
  'tut.2.8.text': 'Gold sharpens steel. Raise it once.',

  // Chapter 3 — The Binding
  'tut.3.1.text': 'The Portal reads the shards. I kept one Ancient Shard for this moment.',
  'tut.3.2.text': 'Place it. Watch the colour — it tells the rarity before the page turns.',
  'tut.3.3.text': 'A new name in your chronicle. Add them to your team before the next stand.',

  // Chapter 4 — Routine
  'tut.4.1.text': 'Each day brings its duties, each week its labours. Fulfil them and the chests open.',
  'tut.4.2.text': 'This one is already done. Claim it.',
  'tut.4.3.text':
    'While you are away, Emberhold works for you. The chest fills with time — until it is full. Do not let it overflow.',

  // Chapter 5 — The Path
  'tut.5.1.text':
    'I have written you a path — one hundred and twenty pages of it. Walk it, and at its end I will fight beside you.',
  'tut.5.2.text': 'Claim what you have already earned.',

  // Chapter 6 — Steel and Bone
  'tut.6.1.text':
    'A sixth star is not bought with gold. It is bought with kin: copies of the same champion, given to the table. Rank raises the ceiling — the level follows after.',
  'tut.6.2.text':
    'The Forge eats what you no longer wear. Break the useless down for sigils, then strike something worth carrying.',
  'tut.6.3.text':
    'Tomes teach nothing new — they sharpen what a champion already knows. Four ranks to an ability, and the last one is always the dearest.',
  'tut.6.4.text':
    'Gravemaw cannot be killed, only worn down. Your keys buy attempts; the damage of each one is written together, and the chests open as the total passes each mark. Keys return with the day.',
  'tut.6.5.text':
    'The week keeps its own ledger, and it is slower and heavier than the day’s. Seven days of small duties fill it.',
  'tut.6.6.text':
    'Nyxara answers only once a week, and she answers differently in every phase. Read her sheet before you spend a key on her — what never lands on her is written there.',
  'tut.6.7.text':
    'Refining spends a twin piece to move one line on the piece you keep. It is the last polish, not the first.',
  'tut.6.8.text':
    'You have farmed enough stands by hand. Set the repeat and the stand runs itself while your energy lasts.',
} as const;

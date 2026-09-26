/** Instant clears (docs/design/CAMPAIGN.md §10, `UI_DESIGN.md` §5.8, §5.30). */
export const instant = {
  // The battle setup's second press, beside Start battle.
  'instant.button': 'Instant clear',
  'instant.buttonTimes': 'Instant ×{count}',
  'instant.hint': 'Mastered: written into the chronicle without a fight — same energy, same spoils.',
  'instant.noEnergy': 'Not enough energy: one run costs {cost} ⚡.',
  'instant.needsStars': 'Take all three stars here to clear it instantly.',
  // The results.
  'instant.title': 'Instant clear',
  'instant.kicker': 'Written into the chronicle',
  'instant.stand': 'Stand {settlement}-{stage} · {difficulty}',
  'instant.cleared': 'Cleared',
  'instant.times': '×{count}',
  'instant.spent': '{energy} ⚡ spent',
  'instant.short': 'Your energy covered {count} of the {total} runs you asked for.',
  'instant.team': 'The team',
  'instant.teamHint': 'The champions you sent take the XP, as if they had fought.',
  'instant.level': 'Level {level}',
  'instant.xp': '+{amount} XP',
  'instant.levelUp': 'Level up',
  'instant.levels': '+{count} levels',
  'instant.maxLevel': 'Max level',
  'instant.again': 'Again ×{count}',
  'instant.againNoEnergy': 'Not enough energy for another run',
  'instant.done': 'Done',
  'instant.toast': 'Cleared {count} times without a fight.',
  // Where a mastered stand is marked.
  'instant.ready': 'Instant',
  'instant.readyHint': 'Mastered — can be cleared instantly',
  'instant.mastered': 'Stand mastered: clear it instantly from now on',
  'instant.masteredLater': 'Stand mastered: instant clears open at chronicle level {level}',
} as const;

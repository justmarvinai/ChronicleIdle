/**
 * The Brewery (docs/design/BREWERY.md). Four halls, five stages each, and the one number that
 * matters said plainly: how many runs the day has left.
 */
export const brewery = {
  'brewery.title': 'The Brewery',
  'brewery.subtitle': 'Where champions’ brews are made. Twenty runs a day, across all four halls.',

  /** The four halls. */
  'brewery.justice.name': 'The Gilded Cask',
  'brewery.justice.description':
    'Corsairs, then gladiators, then the Citadel’s own knights — every one of them guarding the casks they were paid to guard.',
  'brewery.valor.name': 'The Ember Vats',
  'brewery.valor.description':
    'Bandits at the door and the Ashen Legion at the bottom of the stair, all of them drinking the profits.',
  'brewery.faith.name': 'The Frostwell Cellar',
  'brewery.faith.description':
    'Cut into the ice of Frostvein Pass, where the tribe keeps its wells and shares nothing.',
  'brewery.eclipse.name': 'The Waning Cellar',
  'brewery.eclipse.description':
    'The cult brews only under the old calendar: the middle of the week, and the whole of the weekend.',

  /** The day's allowance, shared by every hall. */
  'brewery.runs': '{left} of {total} runs left today',
  'brewery.runsNone': 'No runs left today',
  'brewery.resets': 'Resets in {time}',
  'brewery.spent': 'Every hall draws on the same twenty runs.',

  /** A hall's doors. */
  'brewery.open': 'Open today',
  'brewery.closed': 'Closed today',
  'brewery.openDays': 'Open {days}',
  'brewery.everyDay': 'every day',
  'brewery.closedBody': 'These doors are barred today — they open {day}, in {time}.',
  'brewery.closedBodyNoDay': 'These doors are barred today.',

  /** A stage. */
  'brewery.stage': 'Stage {stage}',
  'brewery.stageOf': 'Stage {stage} of {total}',
  'brewery.guards': '{count} guards · level {level}',
  'brewery.guardsBoss': 'Their captain and {count} guards · level {level}',
  'brewery.heldBy': 'Held by {faction}',
  'brewery.reward': '{count} × {brew}',
  'brewery.cleared': 'Cleared',
  'brewery.next': 'Next',
  'brewery.locked': 'Clear stage {stage} first',
  'brewery.enter': 'Brew',
  'brewery.runCost': 'One run',
  'brewery.bring': 'Bring {element} champions — they have the advantage here.',
  'brewery.bringNothing': 'No element has the advantage over Eclipse. Bring your strongest.',

  /** What the hall is worth, so a day's runs can be placed before they are spent. */
  'brewery.holdings': 'Your brews',
  'brewery.deepest':
    'Your deepest cellar here is stage {stage} — all {runs} runs on it would pour {brews} brews.',
  'brewery.deepestNone': 'Nothing brewed here yet. Stage 1 is open, and it pays one brew a run.',

  /** What each stage is pitched at, so a player knows which one to try. */
  'brewery.tier.1': 'Starting out',
  'brewery.tier.2': 'Early game',
  'brewery.tier.3': 'Mid game',
  'brewery.tier.4': 'Late game',
  'brewery.tier.5': 'Endgame',

  /** The result screen. */
  'brewery.result.title': 'Brewed',
  'brewery.result.runs': '{left} runs left today',
  'brewery.result.firstClear': 'Stage {stage} cleared for the first time — stage {next} is open.',
  'brewery.result.lost': 'The guards held. The run is spent either way.',
  'brewery.result.back': 'Back to the Brewery',

  /** Weekdays, as the hall's own sign writes them. */
  'brewery.day.0': 'Sunday',
  'brewery.day.1': 'Monday',
  'brewery.day.2': 'Tuesday',
  'brewery.day.3': 'Wednesday',
  'brewery.day.4': 'Thursday',
  'brewery.day.5': 'Friday',
  'brewery.day.6': 'Saturday',
  'brewery.dayShort.0': 'Sun',
  'brewery.dayShort.1': 'Mon',
  'brewery.dayShort.2': 'Tue',
  'brewery.dayShort.3': 'Wed',
  'brewery.dayShort.4': 'Thu',
  'brewery.dayShort.5': 'Fri',
  'brewery.dayShort.6': 'Sat',

  /** The Game Modes card. */
  'gameModes.brewery': 'The Brewery',
  'gameModes.brewery.body':
    'Four halls, one per element, and the brews that raise your champions. Twenty runs a day between them.',
  'gameModes.brewery.note': '{left}/{total} runs · {halls} halls open',
} as const;

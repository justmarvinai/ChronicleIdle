/**
 * The Glorious Palace (docs/design/GLORIOUS_PALACE.md). Node names repeat across a branch's rings
 * the way a skill tree's do — eleven names cover all 133 nodes, and the tooltip carries the
 * numbers, which come from the node's own `grants`.
 */
export const palace = {
  'palace.title': 'The Glorious Palace',
  'palace.subtitle': 'Every point spent here lifts a whole element of your roster, for good.',
  'hub.palace': 'Glorious Palace',

  'palace.points': 'Skill Points',
  'palace.pointsAvailable': '{count} to spend',
  'palace.pointsNone': 'No points to spend',
  'palace.spent': '{spent} of {total} spent',
  'palace.reset': 'Reclaim all points',
  'palace.resetConfirm.title': 'Reclaim every point?',
  'palace.resetConfirm.body':
    'Every node in the Palace goes dark and all {count} points return to you. Nothing is lost — you can spend them again however you like.',
  'palace.resetConfirm.confirm': 'Reclaim them',
  'palace.resetNothing': 'Nothing is spent yet.',
  'palace.locked': 'The Palace opens when the first settlement falls.',

  'palace.cost': '{cost} point',
  'palace.costPlural': '{cost} points',
  'palace.owned': 'Bought',
  'palace.reachable': 'Ready to buy',
  'palace.unreachable': 'Reach it through the nodes before it',
  'palace.tooShort': 'Not enough points',
  'palace.appliesTo': 'Every {element} champion you own',
  'palace.appliesToAll': 'Every champion you own',
  'palace.branchSpent': '{spent}/{total}',
  'palace.nodes': '{owned} of {total} nodes lit',

  /** The tree itself: what it is called to a screen reader, and how it is worked. */
  'palace.tree': 'The tree of the Glorious Palace',
  'palace.hint': 'Drag to move · scroll to zoom · click a node to spend',
  'palace.zoom.in': 'Closer',
  'palace.zoom.out': 'Further out',
  'palace.zoom.fit': 'Show the whole Palace',

  /** What a clear is worth, said on the screen that follows the fight. */
  'palace.pointsEarned': '+{count} Skill Point',
  'palace.pointsEarnedPlural': '+{count} Skill Points',

  /** What the bought nodes are worth right now, summed on the ledger. */
  'palace.gains.title': 'What the Palace gives',
  'palace.gains.core': '+{pct}% HP to every champion you own.',
  'palace.gains.none': 'Nothing yet — spend a point to light the Heart.',

  /** Where the points come from, printed on the Palace's own ledger. */
  'palace.earned.title': 'Where points come from',
  'palace.earned.settlement': 'One for each settlement you finish, on each difficulty — 36 in all.',
  'palace.earned.tower': 'One for every fifth floor of the Eternal Tower, again each season.',
  'palace.earned.dailyBoss': 'One for emptying the Gargoyle’s pool.',
  'palace.earned.weeklyBoss': 'Three for emptying the Titan’s pool.',

  /** The eleven node names. */
  'palace.node.heart': 'Heart of the Palace',
  'palace.node.heart.detail': '+{pct}% HP to every champion you own, whatever their element.',
  'palace.node.vigour': 'Vigour',
  'palace.node.edge': 'Edge',
  'palace.node.bulwark': 'Bulwark',
  'palace.node.swiftness': 'Swiftness',
  'palace.node.keenEye': 'Keen Eye',
  'palace.node.cruelty': 'Cruelty',
  'palace.node.warding': 'Warding',
  'palace.node.focus': 'Focus',
  'palace.node.crown': 'Crown of Glory',
  'palace.node.tempo': 'Quickened Oath',
  'palace.node.malice': 'Sharpened Malice',

  /** The purple line beside the green one on a champion's stats. */
  'champions.palaceBonus': 'From the Glorious Palace',
  'champions.palaceBonus.detail':
    'The Palace adds {value} to this champion because of the nodes you have bought in the {element} branch.',
  'champions.palaceBonus.core': 'The Heart of the Palace adds {value} to every champion you own.',
} as const;

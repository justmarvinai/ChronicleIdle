/**
 * The Daily Login Calendar (docs/design/LOGIN.md).
 *
 * Thirty days that **count logins, not consecutive days** (the owner's brief). Miss a Tuesday and
 * nothing is lost: the board simply waits, and Wednesday is still day 12. There is no streak to
 * break, which is the one thing this kind of calendar usually gets wrong.
 *
 * The board **repeats** (the owner's answer): claim day 30 and the next login is day 1 again, the
 * same thirty rewards forever. That makes it a permanent income line rather than an onboarding
 * arc, which is why `pnpm sim:economy` holds it to a band — see §5 of the design doc.
 *
 * Where a chronicle stands is **derived from one number**: how many days it has ever claimed. Day
 * *n* of the board is `(claimed mod 30) + 1`. There is no per-day list to fall out of step with
 * the count, and no streak timestamp to go stale (`CLAUDE.md` §5.5).
 */

/** Days on the board. Thirty, and it loops. */
export const LOGIN_DAYS = 30;

/**
 * The frame a day's tile is drawn in. It says how dear the day is, and it is **shuffled** across
 * the board on purpose (the owner's brief): day 7 is better than day 8, and a player reading the
 * board sees a scatter rather than a ramp. The only rule is the last three.
 */
export const LOGIN_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

export type LoginTier = (typeof LOGIN_TIERS)[number];

/**
 * The first day of the finale. Days 28, 29 and 30 are the best on the board, every cycle — the one
 * place the rewards are allowed to climb (the owner's brief). `validateLoginBoard` refuses a board
 * where any earlier day is `legendary`, or where one of these three is not.
 */
export const LOGIN_FINALE_FROM = 28;

/** Which day of the board a chronicle that has claimed `claimed` days is owed next. */
export function loginDayFor(claimed: number): number {
  return (Math.max(0, Math.trunc(claimed)) % LOGIN_DAYS) + 1;
}

/** How many full boards a chronicle has walked — what the screen prints beside the day. */
export function loginCycle(claimed: number): number {
  return Math.floor(Math.max(0, Math.trunc(claimed)) / LOGIN_DAYS) + 1;
}

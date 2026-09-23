/**
 * The face-off's measures, in stage pixels (docs/tech/UI_DESIGN.md §5.8). The team's seats and the
 * enemy's cards share them, so the two sides of the screen mirror each other card for card.
 */

/** The row the seats (or the cards) share. */
export const SEATS_WIDTH = 732;
export const SEAT_GAP = 20;
/** No seat grows past this, however few share the row. */
export const SEAT_MAX = 220;
/** Every seat is this tall whether three or four share the row: a narrow one crops, not shrinks. */
export const SEAT_HEIGHT = 316;

/** How wide each of `count` seats is in the row: shared evenly, never past `SEAT_MAX`. */
export function seatWidth(count: number): number {
  const n = Math.max(1, count);
  return Math.min(SEAT_MAX, Math.floor((SEATS_WIDTH - SEAT_GAP * (n - 1)) / n));
}

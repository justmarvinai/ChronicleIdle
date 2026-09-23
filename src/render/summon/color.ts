/** Colour arithmetic for the ritual's tints, on 0xRRGGBB numbers (Pixi's own form). */

/** `a` moved `amount` of the way towards `b`, channel by channel. */
export function mixColor(a: number, b: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const channel = (shift: number): number => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

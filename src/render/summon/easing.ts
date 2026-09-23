/** The curves the ritual moves along: pure maths, shared by the scene and the gate's lean. */

/** Smoothstep: eases out of its start and into its end. */
export const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Runs a touch past its end and settles back: a crystal forming out of light. */
export const backOut = (x: number): number => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

/** Moves `value` towards `target` at `rate` per second, frame-rate independent. */
export const ease = (value: number, target: number, rate: number, dt: number): number =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

/** A heartbeat's thump: a narrow swell centred on `at` seconds. */
export const thump = (s: number, at: number): number => Math.exp(-Math.pow((s - at) / 0.055, 2));

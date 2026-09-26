/**
 * How a panel of the Unwritten takes a step: it hands the screen the command to run and the sound
 * the step should make if it lands. The screen runs it, tells what it left (an ink lit, a blot, the
 * Tale), and plays the error when the engine refuses it.
 */
import type { SoundKey } from '@audio/index';
import type { Result } from '@engine/errors';
import type { UnwrittenStep } from '@state/unwritten/commands';

export type Act = (step: () => Result<UnwrittenStep>, sound?: SoundKey) => void;

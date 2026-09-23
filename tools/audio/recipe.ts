/**
 * What a generated sound is, and the note helper the recipe tables share (docs/tech/UI_DESIGN.md §7
 * "generated").
 */
import { bell, note, type Stereo } from './synth.ts';

export interface Recipe {
  key: string;
  loop: boolean;
  /** Ogg Vorbis VBR quality (−0.1…1). */
  quality: number;
  render: () => Stereo;
}

/** A bell struck on a MIDI note. */
export const chime = (midi: number, seconds: number, brightness = 1): ReturnType<typeof bell> =>
  bell(note(midi), seconds, brightness);

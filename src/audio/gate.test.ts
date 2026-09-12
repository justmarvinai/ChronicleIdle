import { describe, expect, it } from 'vitest';
import { armAudio, audioArmed, installAudioGate, onAudioArmed } from './gate';

describe('audio gate', () => {
  it('holds listeners until the first gesture, then runs them once', () => {
    expect(audioArmed()).toBe(false);
    let runs = 0;
    onAudioArmed(() => runs++);
    const uninstall = installAudioGate(document);
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(audioArmed()).toBe(true);
    expect(runs).toBe(1);
    document.dispatchEvent(new Event('keydown', { bubbles: true }));
    expect(runs).toBe(1);
    onAudioArmed(() => runs++);
    expect(runs).toBe(2);
    armAudio();
    expect(runs).toBe(2);
    uninstall();
  });
});

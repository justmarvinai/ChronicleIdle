import { useEffect } from 'react';
import { setAmbience, setMusic } from '@audio/index';
import type { AmbienceScene } from '@audio/ambience';
import type { MusicState } from '@audio/music';

/** Declares the music state and ambience scene of a screen. */
export function useSceneAudio(music: MusicState, ambience: AmbienceScene): void {
  useEffect(() => {
    setMusic(music);
    setAmbience(ambience);
  }, [music, ambience]);
}

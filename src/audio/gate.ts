/**
 * Browsers refuse to play audio before a user gesture, so nothing is downloaded before one
 * either: the multi-megabyte music beds would otherwise compete with the first paint. The
 * directors remember what a screen asked for and start it on the first pointer/key event.
 */
let armed = false;
const waiting = new Set<() => void>();

export function audioArmed(): boolean {
  return armed;
}

export function armAudio(): void {
  if (armed) return;
  armed = true;
  for (const listener of waiting) listener();
  waiting.clear();
}

/** Runs `listener` once audio is armed (immediately when it already is). */
export function onAudioArmed(listener: () => void): void {
  if (armed) listener();
  else waiting.add(listener);
}

/** Arms audio on the first gesture anywhere in the document; returns the uninstaller. */
export function installAudioGate(target: Document = document): () => void {
  const arm = (): void => armAudio();
  target.addEventListener('pointerdown', arm, { once: true, passive: true });
  target.addEventListener('keydown', arm, { once: true });
  return () => {
    target.removeEventListener('pointerdown', arm);
    target.removeEventListener('keydown', arm);
  };
}

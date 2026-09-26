import { useMemo } from 'react';
import { playSfx } from '@audio/index';
import type { PortraitFrameDef } from '@content/deeds/types';
import { content } from '@content/registry';
import { isFrameEarned } from '@engine/deeds/hall';
import { t, translate } from '@i18n/index';
import { selectActions, selectProfile, selectSave, selectWornFrame } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { FramedPortrait } from '@ui/components/Portrait/FramedPortrait';
import styles from './FramePickerDialog.module.css';

/** The portraits the picker shows, in stage pixels. */
const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 166;
const THUMB_THICKNESS = 10;

/** What earns a frame, in the words a player reads. */
function sourceLine({ source }: PortraitFrameDef): string {
  if (source.kind === 'rank') {
    const rank = content.hallRanks.find((def) => def.rank === source.rank);
    return t('profile.frames.fromRank', { rank: source.rank, name: rank ? translate(rank.name) : '' });
  }
  const challenge = content.challengeById(source.id);
  return t('profile.frames.fromChallenge', { name: challenge ? translate(challenge.name) : '' });
}

/**
 * Every portrait frame, earned or not (docs/design/ACHIEVEMENTS.md §3): the chronicle's own gold,
 * then the Hall's seven, each drawn round the chronicler's own portrait so the choice is made by
 * looking. The ones still locked say what earns them.
 */
export function FramePickerDialog() {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const profile = useGameStore(selectProfile);
  const worn = useGameStore(selectWornFrame);
  // Opened from the profile, so both exits go back to it rather than to the game.
  const back = (): void => actions.openDialog({ name: 'profile' });
  const earned = useMemo(
    () =>
      new Set(
        save ? content.frames.filter((frame) => isFrameEarned(frame, save.deeds)).map((f) => f.id) : [],
      ),
    [save],
  );
  if (!profile) return null;

  const choose = (id: string | null): void => {
    if (!actions.wearFrame(id).ok) return;
    playSfx('ui.confirm');
    back();
  };

  const entry = (id: string | null, name: string, line: string, open: boolean) => (
    <li key={id ?? 'default'}>
      <button
        type="button"
        className={[styles.entry, worn === id ? styles.selected : '', open ? '' : styles.locked].join(' ')}
        aria-pressed={worn === id}
        disabled={!open}
        data-testid={`frame-${id ?? 'default'}`}
        onMouseEnter={() => open && playSfx('ui.hover')}
        onClick={() => choose(id)}
      >
        <FramedPortrait
          avatarChampionId={profile.avatarChampionId ?? null}
          frameId={id}
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          thickness={THUMB_THICKNESS}
          className={styles.thumb ?? ''}
        />
        <span className={styles.text}>
          <strong className="display">{name}</strong>
          <em>{line}</em>
        </span>
        {open ? null : (
          <span className={styles.lock} aria-hidden="true">
            <Glyph glyph="glyph.broken_shackle" size={22} color="var(--text-3)" />
          </span>
        )}
      </button>
    </li>
  );

  return (
    <Dialog title={t('profile.frames.title')} onClose={back} width={1100} testId="dialog-frame-picker">
      <p className={styles.hint}>
        {t('profile.frames.earnedCount', { earned: earned.size, total: content.frames.length })}
      </p>
      <ul className={styles.list}>
        {entry(null, t('profile.frames.default'), t('profile.frames.defaultHint'), true)}
        {content.frames.map((frame) =>
          entry(frame.id, translate(frame.name), sourceLine(frame), earned.has(frame.id)),
        )}
      </ul>
    </Dialog>
  );
}

import type { ReactNode } from 'react';
import { backdrop } from '@assets/manifest';
import type { BackdropKey, GlyphKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { CARD_FRAME, CARD_TINT } from '@ui/styles/display-maps';
import styles from './ModeCard.module.css';

export interface ModeCardProps {
  /** Headline, and the blurb under the art. */
  title: string;
  body: string;
  art: BackdropKey;
  glyph: GlyphKey;
  /** Where the player stands in this mode — keys left, the stand they are on. */
  note?: string | undefined;
  unlocked: boolean;
  /** What the button says when the card is shut; defaults to nothing, so pass the gate's words. */
  lockedLabel: string;
  /** Its position in the row, which is all the entry stagger needs. */
  index: number;
  onOpen: (unlocked: boolean) => void;
  testId: string;
  /** Anything the card shows above its button — a countdown, a warning. */
  children?: ReactNode;
}

/**
 * One tall illustrated card in a menu of modes (docs/tech/UI_DESIGN.md §5.7): art under a shade,
 * the mode's glyph over it, and the blurb, the live note and the way in at the foot.
 *
 * Shared by Game Modes and the Bosses menu it opens, so a second menu reads as the same furniture
 * one level down rather than as a different screen.
 */
export function ModeCard({
  title,
  body,
  art,
  glyph,
  note,
  unlocked,
  lockedLabel,
  index,
  onOpen,
  testId,
  children,
}: ModeCardProps) {
  const image = backdrop(art);
  return (
    <DecoFrame
      frame={unlocked ? CARD_FRAME.unlocked : CARD_FRAME.locked}
      tint={unlocked ? CARD_TINT.unlocked : CARD_TINT.locked}
      thickness={16}
      className={[styles.card, unlocked ? '' : styles.cardLocked].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={testId}
    >
      <div className={styles.art} style={{ backgroundImage: `url("${image.url}")` }} />
      <div className={styles.shade} />
      <div className={styles.head}>
        <h2 className={`display ${styles.title}`}>{title}</h2>
      </div>
      <div className={styles.glyph}>
        <Glyph
          glyph={unlocked ? glyph : 'glyph.broken_shackle'}
          size={120}
          color={unlocked ? 'rgba(243,236,220,0.9)' : 'rgba(141,133,119,0.8)'}
        />
      </div>
      <div className={styles.foot}>
        <p className={styles.body}>{body}</p>
        {/* Anything static the card carries sits above the live number, which sits above the way
            in: context, then state, then the press. */}
        {unlocked ? children : null}
        {/* A card that is still shut reports nothing live: the button says what it is waiting for. */}
        {unlocked && note ? (
          <p className={`num ${styles.note}`} data-testid={`note-${testId.replace(/^mode-/, '')}`}>
            {note}
          </p>
        ) : null}
        {unlocked ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => onOpen(true)}
            data-testid={`enter-${testId.replace(/^mode-/, '')}`}
          >
            {t('gameModes.enter')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            sound="ui.cancel"
            onClick={() => (playSfx('ui.error'), onOpen(false))}
            data-testid={`enter-${testId.replace(/^mode-/, '')}`}
          >
            {lockedLabel}
          </Button>
        )}
      </div>
    </DecoFrame>
  );
}

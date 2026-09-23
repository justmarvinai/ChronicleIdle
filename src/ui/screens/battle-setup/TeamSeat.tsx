import { useRef, type CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import type { ChampionDef } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { useFitText } from '@ui/hooks/useFitText';
import { elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH, RARITY_HEX, ROLE_GLYPH } from '@ui/styles/display-maps';
import styles from './TeamSeat.module.css';

/** The frame a seated champion's portrait wears: the rarer the champion, the grander the frame. */
function seatFrame(def: ChampionDef): number {
  return def.rarity === 'mythic' ? 26 : def.rarity === 'legendary' ? 13 : 3;
}
/** An empty seat's frame, in the kit's quiet bronze. */
const EMPTY_FRAME = 16;
const EMPTY_TINT = '#6f5a3a';
/** The name's sizes, largest first: a four-seat row is narrow, and long names must still read. */
const NAME_SIZES = [18, 17, 16, 15, 14] as const;

export interface TeamSeatProps {
  index: number;
  /** Stage pixels. A narrow seat crops its portrait's sides rather than shrinking the face. */
  width: number;
  height: number;
  def: ChampionDef | undefined;
  instance: ChampionInstance | undefined;
  power: number;
  onRemove: () => void;
  onLead: () => void;
}

/**
 * One seat of the team (docs/tech/UI_DESIGN.md §5.8): the champion's painting framed in their
 * rarity, stars and level at its foot, element, role and power under the name — or an empty seat
 * with the kit's silhouette in it. The first seat is the leader's and says so; any other filled
 * seat offers to take it. Pressing a filled seat empties it.
 */
export function TeamSeat({ index, width, height, def, instance, power, onRemove, onLead }: TeamSeatProps) {
  const leader = index === 0;
  const style = { '--seat-w': `${width}px`, '--seat-h': `${height}px` } as CSSProperties;
  const nameRef = useRef<HTMLSpanElement>(null);
  const name = def ? translate(def.name) : '';
  useFitText(nameRef, NAME_SIZES, name);

  if (!def || !instance) {
    return (
      <div className={[styles.seat, styles.empty].join(' ')} style={style}>
        <DecoFrame frame={EMPTY_FRAME} tint={EMPTY_TINT} thickness={12} className={styles.frame}>
          <button
            type="button"
            className={styles.card}
            aria-label={t('battleSetup.slotEmpty')}
            data-testid={`team-slot-${index}`}
          >
            <span
              className={styles.silhouette}
              style={{
                backgroundImage: `url("${imageUrl(
                  index % 2 === 0
                    ? 'ui.dark_ember.silhouette_warrior_m'
                    : 'ui.dark_ember.silhouette_warrior_f',
                )}")`,
              }}
              aria-hidden="true"
            />
            <span className={`display ${styles.emptyText}`}>{t('battleSetup.choose')}</span>
          </button>
        </DecoFrame>
        {leader ? <span className={`display ${styles.ribbon}`}>{t('battleSetup.leader')}</span> : null}
      </div>
    );
  }

  const art = championAvatar(def, 512);
  const tone = {
    ...style,
    '--rarity': RARITY_HEX[def.rarity],
    '--element': ELEMENT_COLOR[def.element],
  } as CSSProperties;
  return (
    <div className={[styles.seat, leader ? styles.leader : ''].join(' ')} style={tone}>
      <DecoFrame frame={seatFrame(def)} tint={RARITY_HEX[def.rarity]} thickness={14} className={styles.frame}>
        <button
          type="button"
          className={styles.card}
          onClick={onRemove}
          aria-label={`${name}, ${t('battleSetup.remove')}`}
          data-testid={`team-slot-${index}`}
          data-champion={def.id}
        >
          <span
            className={styles.portrait}
            style={{ backgroundImage: `url("${art.url}")` }}
            aria-hidden="true"
          >
            {art.tint ? (
              <span
                className={styles.tint}
                style={{
                  backgroundColor: art.tint,
                  WebkitMaskImage: `url("${art.url}")`,
                  maskImage: `url("${art.url}")`,
                }}
              />
            ) : null}
          </span>
          <span className={styles.shade} aria-hidden="true" />
          <span className={`num ${styles.level}`} title={t('battleSetup.level', { level: instance.level })}>
            {instance.level}
          </span>
          <span className={styles.foot}>
            <StarRow stars={instance.stars} max={6} size={15} />
            <span ref={nameRef} className={`display ${styles.name}`}>
              {name}
            </span>
            <span className={styles.meta}>
              <span className={styles.sigil} title={elementLabel(def.element)}>
                <Glyph glyph={ELEMENT_GLYPH[def.element]} size={16} color="var(--text-1)" />
              </span>
              <Glyph
                glyph={ROLE_GLYPH[def.role]}
                size={16}
                color="var(--text-2)"
                label={roleLabel(def.role)}
              />
              <span className={`num ${styles.power}`}>
                <Glyph glyph="glyph.crossed_swords" size={14} color="var(--gold-2)" />
                {power.toLocaleString('en-US')}
              </span>
            </span>
          </span>
          <span className={styles.remove} aria-hidden="true">
            ✕
          </span>
        </button>
      </DecoFrame>
      {leader ? (
        <span className={`display ${styles.ribbon}`}>{t('battleSetup.leader')}</span>
      ) : (
        <button
          type="button"
          className={`display ${styles.lead}`}
          onClick={onLead}
          data-testid={`team-lead-${index}`}
        >
          {t('battleSetup.makeLeader')}
        </button>
      )}
    </div>
  );
}

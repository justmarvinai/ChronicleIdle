import { playSfx } from '@audio/index';
import type { ShardId } from '@content/balance/summon';
import { t } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { CARD_TINT, SHARD_HEX } from '@ui/styles/display-maps';
import type { ShardView } from '@ui/summon/portal-view';
import { RarityRange } from './RarityRange';
import styles from './ShardRail.module.css';

export interface ShardRailProps {
  shards: readonly ShardView[];
  selected: ShardId;
  onSelect: (shard: ShardId) => void;
  /** A champion the campaign owes (SUMMONING.md §5 "the champion picker"), offered under the shards. */
  owed: { reason: string } | null;
  onClaim: () => void;
}

/**
 * The left rail (docs/tech/UI_DESIGN.md §5.12): a card a shard — its icon in a socket lit with its
 * light, what it can answer with, and how many the purse holds in plain numerals — and under them,
 * while the campaign owes one, the champion to claim.
 */
export function ShardRail({ shards, selected, onSelect, owed, onClaim }: ShardRailProps) {
  return (
    <section className={styles.rail} aria-label={t('portal.shards')}>
      <h2 className={`display ${styles.heading}`}>{t('portal.shards')}</h2>
      {shards.map((view) => {
        const on = view.shard === selected;
        return (
          <DecoFrame
            key={view.shard}
            frame={on ? 13 : 16}
            tint={on ? CARD_TINT.unlocked : CARD_TINT.locked}
            thickness={12}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            className={[styles.card, on ? styles.cardOn : ''].join(' ')}
            style={{ ['--shard' as string]: SHARD_HEX[view.shard] }}
            data-testid={`portal-shard-${view.shard}`}
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => {
              playSfx('ui.tab');
              onSelect(view.shard);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(view.shard);
              }
            }}
          >
            <span className={styles.socket}>
              <AssetImage
                asset={view.icon}
                size={128}
                className={styles.icon}
                alt=""
                {...(view.tint ? { tint: view.tint } : {})}
              />
            </span>
            <div className={styles.text}>
              <span className={`display ${styles.name}`}>{view.name}</span>
              <RarityRange shard={view.shard} />
              <span className={styles.blurb}>{view.blurb}</span>
            </div>
            <span
              className={styles.count}
              data-empty={view.held === 0}
              data-testid={`portal-held-${view.shard}`}
            >
              <span className={`num ${styles.number}`}>{view.held}</span>
              <span className={styles.countLabel}>{t('portal.held.label')}</span>
            </span>
          </DecoFrame>
        );
      })}
      {owed ? (
        <DecoFrame frame={13} tint={CARD_TINT.unlocked} thickness={12} className={styles.owed}>
          <Glyph
            glyph="glyph.trophy_cup"
            size={40}
            color="var(--gold-3)"
            className={styles.owedGlyph ?? ''}
          />
          <div className={styles.owedText}>
            <span className={`display ${styles.owedTitle}`}>{t('portal.choice.title')}</span>
            <span className={styles.owedReason}>{owed.reason}</span>
          </div>
          <Button variant="primary" size="sm" onClick={onClaim} data-testid="portal-choice">
            {t('portal.choice.take')}
          </Button>
        </DecoFrame>
      ) : null}
    </section>
  );
}

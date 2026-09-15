import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { BossDef } from '@content/bosses/types';
import { t, translate, type I18nKey } from '@i18n/index';
import type { BossTierView } from '@state/bosses';
import { Bar } from '@ui/components/Bar/Bar';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './TierCard.module.css';

export interface TierCardProps {
  boss: BossDef;
  view: BossTierView;
  selected: boolean;
  onSelect: () => void;
  onClaim: (pct: number) => void;
}

/** A number the way the gate says it: 12,500 rather than 12500. */
const count = (value: number): string => Math.round(value).toLocaleString('en-US');

/**
 * One tier of a boss (docs/design/BOSSES.md §4): the pool, the damage the period has put into it,
 * the chest ladder that damage has earned, and the best the chronicle has ever managed.
 */
export function TierCard({ boss, view, selected, onSelect, onClaim }: TierCardProps) {
  const { tier } = view;
  const name = t(tier.name as I18nKey);
  return (
    <Panel
      kind={selected ? 'ember-wide' : 'thin'}
      padding={14}
      className={[styles.card, selected ? styles.selected : ''].join(' ')}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={name}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      data-testid={`boss-tier-${tier.id}`}
    >
      <div className={styles.head}>
        <Glyph glyph="glyph.flaming_skull" size={30} color={selected ? 'var(--ember-3)' : 'var(--text-3)'} />
        <div className={styles.headText}>
          <span className={`display ${styles.name}`}>{name}</span>
          <span className={styles.level}>{translate('bosses.tierLevel', { level: tier.enemyLevel })}</span>
        </div>
        <span className={`num ${styles.xp}`}>{translate('bosses.tierXp', { xp: tier.playerXp })}</span>
      </div>

      <Bar
        value={view.damage}
        max={tier.stats.hp}
        kind="ember"
        height={26}
        label={translate('bosses.damageOf', { damage: count(view.damage), pool: count(tier.stats.hp) })}
      />

      <ul className={styles.chests} data-testid={`boss-chests-${tier.id}`}>
        {view.chests.map((chest, index) => {
          const def = tier.chests[index];
          const claimable = chest.state === 'claimable';
          const contents = (
            <div className={styles.tip}>
              <strong className={styles.tipTitle}>
                {translate('bosses.chestAt', { pct: chest.pct, damage: count(chest.threshold) })}
              </strong>
              {(def?.currencies ?? []).map((entry) => (
                <span key={entry.currency}>
                  {t(CURRENCY_BY_ID[entry.currency].name as I18nKey)} ×{count(entry.amount)}
                </span>
              ))}
              {def?.gear ? (
                <span>
                  {translate('bosses.chestGear', {
                    rarity: t(`rarity.${def.gear.rarity}` as I18nKey),
                    stars: def.gear.stars,
                  })}
                </span>
              ) : null}
            </div>
          );
          return (
            <li key={chest.pct}>
              <Tooltip content={contents}>
                <button
                  type="button"
                  className={[styles.chest, styles[chest.state] ?? ''].join(' ')}
                  disabled={!claimable}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClaim(chest.pct);
                  }}
                  data-testid={`boss-chest-${tier.id}-${chest.pct}`}
                  aria-label={translate('bosses.chestAt', {
                    pct: chest.pct,
                    damage: count(chest.threshold),
                  })}
                >
                  <Glyph
                    glyph={chest.state === 'claimed' ? 'glyph.trophy_cup' : 'glyph.burning_scroll'}
                    size={22}
                    color={claimable ? 'var(--gold-2)' : 'var(--text-3)'}
                  />
                  <span className="num">{chest.pct} %</span>
                </button>
              </Tooltip>
            </li>
          );
        })}
      </ul>

      <p className={styles.record} data-testid={`boss-record-${tier.id}`}>
        {view.record
          ? translate('bosses.best', {
              damage: count(view.record.damage),
              date: new Date(view.record.at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              }),
            })
          : translate('bosses.noRecord', { boss: t(boss.name as I18nKey) })}
      </p>
    </Panel>
  );
}

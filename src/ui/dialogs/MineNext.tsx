import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { t } from '@i18n/index';
import type { MineView } from '@state/mine';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { sigilRate, stratumName } from './mine-text';
import styles from './MineNext.module.css';

function Gain({ currency, text }: { currency: CurrencyId; text: string }) {
  const def = CURRENCY_BY_ID[currency];
  return (
    <li className={styles.gain}>
      <TintedIcon asset={def.icon} tint={def.tint} size={24} />
      <span className="num">{text}</span>
    </li>
  );
}

/**
 * The level below this one (docs/tech/UI_DESIGN.md §5.29): its name, what it adds, what it costs
 * against what the wallet holds, and what still stands in the way — the chronicle's level, a
 * currency it is short of, or nothing at all. The press settles the store first, and says so.
 */
export function MineNext({ view, onDig }: { view: MineView; onDig: () => void }) {
  const { next, gain, block } = view;
  if (!next || !gain)
    return (
      <section className={`${styles.card} ${styles.done}`} data-testid="mine-next">
        <Glyph glyph="glyph.pickaxe" size={56} color="var(--gold-3)" />
        <p className={styles.deepest}>{t('mine.deepest')}</p>
      </section>
    );

  const firstSigils = view.level.sigilsPerDay === 0 && next.sigilsPerDay > 0;
  return (
    <section className={styles.card} data-testid="mine-next" data-block={block?.reason ?? 'open'}>
      <header className={styles.head}>
        <span className={`display ${styles.kicker}`}>{t('mine.next.title')}</span>
        <strong className={`display ${styles.name}`}>{stratumName(next.level)}</strong>
        <span className={`num ${styles.level}`}>{t('mine.level', { level: next.level })}</span>
      </header>

      <ul className={styles.gains} data-testid="mine-gains">
        <Gain currency="gems" text={t('mine.next.gems', { amount: gain.gemsPerDay })} />
        <Gain currency="gems" text={t('mine.next.store', { amount: gain.storeGems })} />
        {firstSigils ? (
          <Gain currency="mat_glyph_sigil" text={t('mine.next.firstSigils')} />
        ) : gain.sigilsPerDay > 0 ? (
          <Gain
            currency="mat_glyph_sigil"
            text={t('mine.next.sigils', { amount: sigilRate(gain.sigilsPerDay) })}
          />
        ) : null}
      </ul>

      <h4 className={`display ${styles.subhead}`}>{t('mine.next.cost')}</h4>
      <ul className={styles.cost} data-testid="mine-cost">
        {view.cost.map((line) => (
          <li
            key={line.currency}
            className={[styles.line, line.short > 0 ? styles.short : ''].join(' ')}
            data-short={line.short > 0}
          >
            <CurrencyLabel currency={line.currency} amount={line.amount} size={22} />
            <span className={`num ${styles.held}`}>
              {line.short > 0
                ? t('mine.next.short', { amount: line.short.toLocaleString('en-US') })
                : line.owned.toLocaleString('en-US')}
            </span>
          </li>
        ))}
      </ul>

      {block?.reason === 'level' ? (
        <p className={styles.gate} data-testid="mine-gate">
          <Glyph glyph="glyph.broken_shackle" size={20} color="var(--text-2)" />
          {t('mine.next.gate', { level: block.opensAt })}
        </p>
      ) : (
        <p className={styles.note}>{t('mine.next.settles')}</p>
      )}

      <Button
        variant="primary"
        size="lg"
        disabled={block !== null}
        onClick={onDig}
        data-testid="mine-dig"
        icon={<Glyph glyph="glyph.pickaxe" size={26} color="var(--gold-3)" />}
      >
        {t('mine.dig', { level: next.level })}
      </Button>
    </section>
  );
}

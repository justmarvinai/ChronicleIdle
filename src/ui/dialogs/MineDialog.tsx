import { useEffect, useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { mineView, type MineView } from '@state/mine';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useNow } from '@ui/hooks/useNow';
import { MineNext } from './MineNext';
import { MineStrata } from './MineStrata';
import { sigilRate, stratumName } from './mine-text';
import { MineVault, type MineHaulShown } from './MineVault';
import styles from './MineDialog.module.css';

/** How long the haul stays over the vault before it goes back to showing the store. */
const HAUL_SHOWN_MS = 2_800;
/** The next gem is counted to the second, so the dialog reads the clock that often. */
const TICK_MS = 1_000;

/** Whole gems and Sigils as the wallet rows they became, gems first. */
function paidRows(gems: number, sigils: number): CurrencyAmount[] {
  const rows: CurrencyAmount[] = [];
  if (gems > 0) rows.push({ currency: 'gems', amount: gems });
  if (sigils > 0) rows.push({ currency: 'mat_glyph_sigil', amount: sigils });
  return rows;
}

/**
 * The Mine (docs/design/MINE.md, docs/tech/UI_DESIGN.md §5.29): the store in its vault on the
 * left, the level below this one in the middle, and the whole shaft on the right — ten strata,
 * dug and dark. Collect empties the store; Dig deeper settles it and opens the next level.
 * Everything is derived from the save and the clock, so the dialog cannot disagree with the wait.
 */
export default function MineDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const now = useNow(TICK_MS);
  const [haul, setHaul] = useState<MineHaulShown | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [presses, setPresses] = useState(0);
  const reduced = prefersReducedMotion();
  const view = useMemo(() => (save ? mineView(save, now) : null), [save, now]);

  // The haul rises, holds a beat, and gives the vault back to the store.
  useEffect(() => {
    if (!haul) return undefined;
    const timer = window.setTimeout(() => setHaul(null), HAUL_SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [haul]);

  if (!view || !save) return null;

  const show = (paid: CurrencyAmount[], wasFull: boolean): void => {
    const key = presses + 1;
    setPresses(key);
    setHaul(paid.length ? { paid, key, wasFull } : null);
  };

  const collect = (): void => {
    const result = actions.collectMine();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    const paid = paidRows(result.value.gems, result.value.sigils);
    playSfx('mine.strike');
    playSfx('reward.medium');
    show(paid, result.value.wasFull);
    actions.toast('reward', 'mine.toast', undefined, paid);
  };

  const dig = (): void => {
    const result = actions.upgradeMine();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    const { level, collected } = result.value;
    playSfx('mine.deepen');
    playSfx('reward.large');
    setFresh(level);
    show(paidRows(collected.gems, collected.sigils), false);
    const rate = view.next?.gemsPerDay ?? view.level.gemsPerDay;
    if (collected.gems > 0) actions.toast('reward', 'mine.dugCollected', { level, gems: collected.gems });
    else actions.toast('reward', 'mine.dug', { level, gems: rate });
  };

  return (
    <Dialog
      title={t('mine.title')}
      onClose={onClose}
      width={1180}
      testId="dialog-mine"
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={!view.store.collectable}
          onClick={collect}
          data-testid="mine-collect"
          icon={<Glyph glyph="glyph.pickaxe" size={26} color="var(--gold-3)" />}
        >
          {view.store.collectable ? t('mine.collect') : t('mine.collectWait')}
        </Button>
      }
    >
      <div className={styles.layout}>
        <section className={styles.store}>
          <p className={styles.subtitle}>{t('mine.subtitle')}</p>
          <MineVault view={view} haul={haul} reduced={reduced} />
          <Rates view={view} />
        </section>
        <MineNext view={view} onDig={dig} />
        <MineStrata level={view.level.level} playerLevel={save.profile.level} fresh={fresh} />
      </div>
    </Dialog>
  );
}

function RateRow({ currency, text }: { currency: CurrencyId; text: string }) {
  const def = CURRENCY_BY_ID[currency];
  return (
    <li className={styles.rate}>
      <TintedIcon asset={def.icon} tint={def.tint} size={22} />
      <span className="num">{text}</span>
    </li>
  );
}

/** What this level digs: the day's gems, the store and how long it takes to fill, the Sigils. */
function Rates({ view }: { view: MineView }) {
  const { level, store } = view;
  return (
    <div className={styles.plate} data-testid="mine-rates">
      <p className={styles.plateHead}>
        <span className="display">{stratumName(level.level)}</span>
        <span className={`num ${styles.plateLevel}`}>{t('mine.level', { level: level.level })}</span>
      </p>
      <ul className={styles.rates}>
        <RateRow currency="gems" text={t('mine.rate.gems', { amount: level.gemsPerDay })} />
        <RateRow
          currency="gems"
          text={t('mine.rate.store', { gems: level.storeGems, time: formatDuration(store.storeMs) })}
        />
        {level.sigilsPerDay > 0 ? (
          <RateRow
            currency="mat_glyph_sigil"
            text={t('mine.rate.sigils', { amount: sigilRate(level.sigilsPerDay) })}
          />
        ) : null}
      </ul>
    </div>
  );
}

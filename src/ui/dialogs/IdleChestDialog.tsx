import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { IDLE_CHANCES } from '@content/balance/idle';
import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { idleView, type IdleClaimSummary } from '@state/idle';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useNow } from '@ui/hooks/useNow';
import { pieceName } from '@ui/gear/gear-view';
import styles from './IdleChestDialog.module.css';

/** Hours as the chest talks about them: "4h 20m", minutes under an hour, and "0m" for nothing. */
function hoursLabel(hours: number): string {
  if (hours <= 0) return '0m';
  return formatDuration(Math.round(hours * 3_600_000));
}

/**
 * The Idle Chest (docs/design/ECONOMY.md §6): how full it is, how long until it stops counting,
 * what is waiting inside, and the moment it is opened. Everything shown here is derived from one
 * stored instant, so the dialog cannot disagree with the wait.
 */
export function IdleChestDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // Re-read on the minute: the chest accrues at that resolution and nothing here ticks faster.
  const now = useNow(30_000);
  const [haul, setHaul] = useState<IdleClaimSummary | null>(null);
  const reduced = prefersReducedMotion();

  // The save is replaced whenever anything is written to it, opening the chest included, so the
  // view recomputes on a claim without the dialog having to watch the timestamp itself.
  const view = useMemo(() => (save ? idleView(save, now) : null), [save, now]);

  const open = (): void => {
    const result = actions.claimIdleChest();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('chest.open');
    setHaul(result.value);
    actions.toast('reward', 'idle.toast', { hours: hoursLabel(result.value.hours) });
  };

  if (!view) return null;
  const { fill, guaranteed } = view;
  const settlement = content.settlementByIndex(view.settlementIndex);
  const rows = haul ? haul.rewards : guaranteed.currencies;
  const playerXp = haul ? haul.playerXp : guaranteed.playerXp;

  return (
    <Dialog
      title={t('idle.title')}
      onClose={onClose}
      width={760}
      testId="dialog-idle-chest"
      footer={
        haul ? (
          <Button variant="primary" onClick={onClose} data-testid="idle-continue">
            {t('common.continue')}
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!fill.claimable || view.tier <= 0}
            onClick={open}
            data-testid="idle-claim"
          >
            {fill.claimable ? t('idle.claim') : t('idle.claimWait')}
          </Button>
        )
      }
    >
      <div className={styles.head}>
        <motion.div
          className={styles.chest}
          animate={reduced || !fill.full ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AssetImage asset="ui.stone_vine.icon_chest" className={styles.chestIcon} alt="" />
          {fill.full ? <span className={styles.fullMark}>{t('hub.idleChest.full')}</span> : null}
        </motion.div>
        <div className={styles.headText}>
          <p className={styles.subtitle}>{t('idle.subtitle')}</p>
          <Bar
            value={fill.fraction * 100}
            max={100}
            kind="ember"
            height={28}
            label={translate('idle.fill', {
              hours: hoursLabel(fill.hours),
              capacity: hoursLabel(view.capacityHours),
            })}
          />
          <p className={styles.timer} data-testid="idle-timer">
            {fill.full ? t('idle.full') : translate('idle.filling', { time: formatDuration(fill.msToFull) })}
          </p>
          {view.tier > 0 ? (
            <p className={styles.tier} data-testid="idle-tier">
              {translate('idle.tier', {
                settlement: settlement ? t(settlement.name as I18nKey) : String(view.settlementIndex),
                tier: view.tier,
              })}
            </p>
          ) : (
            <p className={styles.warn} data-testid="idle-no-farm">
              {t('idle.noFarm')}
            </p>
          )}
          <p className={styles.capacity} data-testid="idle-capacity">
            {view.nextCapacity
              ? translate('idle.capacity', {
                  hours: hoursLabel(view.capacityHours),
                  next: hoursLabel(view.nextCapacity.hours),
                  level: view.nextCapacity.level,
                })
              : translate('idle.capacityMax', { hours: hoursLabel(view.capacityHours) })}
          </p>
        </div>
      </div>

      <ScrollArea height={300} className={styles.scroll}>
        <section className={styles.section}>
          <h3 className={`display ${styles.sectionTitle}`}>{haul ? t('idle.haul') : t('idle.preview')}</h3>
          {rows.length === 0 && playerXp === 0 ? (
            <p className={styles.empty}>{view.tier > 0 ? t('idle.empty') : t('idle.noFarm')}</p>
          ) : (
            <ul className={styles.rewards} data-testid="idle-rewards">
              {rows.map((entry) => (
                <li key={entry.currency}>
                  <span>{translate(CURRENCY_BY_ID[entry.currency].name)}</span>
                  <span className="num">+{entry.amount.toLocaleString('en-US')}</span>
                </li>
              ))}
              {playerXp > 0 ? (
                <li data-testid="idle-player-xp">
                  <span>{t('idle.playerXp')}</span>
                  <span className="num">+{playerXp.toLocaleString('en-US')}</span>
                </li>
              ) : null}
            </ul>
          )}
          {!haul && view.tier > 0 && rows.length > 0 ? (
            <p className={styles.hint}>{t('idle.previewHint')}</p>
          ) : null}
        </section>

        {haul && Object.keys(haul.procs).length > 0 ? (
          <section className={styles.section} data-testid="idle-lucky">
            <h3 className={`display ${styles.sectionTitle}`}>{t('idle.lucky')}</h3>
            <ul className={styles.lucky}>
              {IDLE_CHANCES.filter((def) => (haul.procs[def.id] ?? 0) > 0).map((def) => (
                <li key={def.id}>
                  <Glyph glyph="glyph.celestial_body" size={24} color="var(--gold-3)" />
                  <span>
                    {t(`idle.lucky.${def.id}` as I18nKey)}
                    {(haul.procs[def.id] ?? 0) > 1 ? ` ×${haul.procs[def.id]}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {haul && haul.gear.length > 0 ? (
          <section className={styles.section} data-testid="idle-gear">
            <ul className={styles.lucky}>
              {haul.gear.map((piece) => (
                <li key={piece.instanceId}>
                  <Glyph glyph="glyph.spiked_cleaver" size={24} color="var(--gold-3)" />
                  <span>{pieceName(piece)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {haul && haul.gearLost > 0 ? (
          <p className={styles.warn}>{translate('idle.gearLost', { count: haul.gearLost })}</p>
        ) : null}
        {haul?.wasFull ? (
          <p className={styles.hint} data-testid="idle-overflow">
            {translate('idle.overflow', { hours: hoursLabel(view.capacityHours) })}
          </p>
        ) : null}
      </ScrollArea>
    </Dialog>
  );
}

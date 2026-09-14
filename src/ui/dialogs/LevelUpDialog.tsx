import { useEffect } from 'react';
import { motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { energyCap } from '@engine/economy/energy';
import { t, translate, type I18nKey } from '@i18n/index';
import { selectActions, selectLevelUp, selectProfile } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import styles from './LevelUpDialog.module.css';

/**
 * The level-up moment (docs/design/ECONOMY.md §4): the new level, everything the levels paid, the
 * energy they refilled and the gates they opened. One dialog covers a whole batch of levels.
 */
export function LevelUpDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const levelUp = useGameStore(selectLevelUp);
  const profile = useGameStore(selectProfile);

  useEffect(() => {
    playSfx('stinger.levelup');
  }, []);

  if (!levelUp || levelUp.levels.length === 0 || !profile) return null;
  const reached = levelUp.levels[levelUp.levels.length - 1]?.level ?? profile.level;
  const from = (levelUp.levels[0]?.level ?? reached) - 1;
  const energy = levelUp.changes.find((change) => change.currency === 'energy')?.delta ?? 0;
  const currencies = levelUp.changes.filter((change) => change.currency !== 'energy');

  const close = (): void => {
    actions.clearLevelUp();
    onClose();
  };

  return (
    <Dialog
      title={t('levelUp.title')}
      onClose={close}
      width={720}
      testId="dialog-level-up"
      footer={
        <Button variant="primary" onClick={close} data-testid="level-up-continue">
          {t('common.continue')}
        </Button>
      }
    >
      <div className={styles.hero}>
        <motion.div
          className={styles.burst}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0.65], scale: [0.5, 1.15, 1] }}
          transition={{ duration: 0.9, times: [0, 0.45, 1] }}
        />
        <motion.span
          className={`display ${styles.level}`}
          data-testid="level-up-level"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          {reached}
        </motion.span>
        <span className={styles.heroLabel}>
          {levelUp.levels.length > 1
            ? t('levelUp.fromTo', { from, to: reached })
            : t('levelUp.reached', { level: reached })}
        </span>
      </div>

      <ScrollArea height={420} className={styles.scroll}>
        <section className={styles.section}>
          <h3 className={`display ${styles.sectionTitle}`}>{t('levelUp.rewards')}</h3>
          <ul className={styles.rewards} data-testid="level-up-rewards">
            {currencies.map((change) => (
              <li key={change.currency}>
                <span>{translate(CURRENCY_BY_ID[change.currency].name)}</span>
                <span className="num">+{change.delta.toLocaleString('en-US')}</span>
              </li>
            ))}
            {energy > 0 ? (
              <li data-testid="level-up-energy">
                <span>{t('levelUp.energyRefill')}</span>
                <span className="num">+{energy.toLocaleString('en-US')}</span>
              </li>
            ) : null}
            <li>
              <span>{t('profile.energyCap')}</span>
              <span className="num">{energyCap(reached).toLocaleString('en-US')}</span>
            </li>
          </ul>
        </section>

        {levelUp.unlocks.length ? (
          <section className={styles.section}>
            <h3 className={`display ${styles.sectionTitle}`}>{t('levelUp.unlocked')}</h3>
            <ul className={styles.unlocks} data-testid="level-up-unlocks">
              {levelUp.unlocks.map((feature) => (
                <li key={feature}>
                  <Glyph glyph="glyph.broken_shackle" size={26} color="var(--gold-3)" />
                  <span>
                    <strong className="display">{t(`feature.${feature}.name` as I18nKey)}</strong>
                    <em>{t(`feature.${feature}.hint` as I18nKey)}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {levelUp.titlesEarned.length ? (
          <section className={styles.section}>
            <h3 className={`display ${styles.sectionTitle}`}>{t('levelUp.titles')}</h3>
            <ul className={styles.unlocks} data-testid="level-up-titles">
              {levelUp.titlesEarned.map((id) => {
                const def = content.titleById(id);
                return (
                  <li key={id}>
                    <Glyph glyph="glyph.trophy_cup" size={26} color="var(--gold-3)" />
                    <span>
                      <strong className="display">{def ? translate(def.name) : id}</strong>
                      <em>{def ? translate(def.description) : ''}</em>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </ScrollArea>
    </Dialog>
  );
}

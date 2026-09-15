import { BOSS_ENRAGE_STEP } from '@content/balance/battle';
import { content } from '@content/registry';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import { t, translate, type I18nKey } from '@i18n/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import styles from './BossSheetDialog.module.css';

/**
 * The mechanics sheet (docs/design/BOSSES.md §4): the kit in the order it comes, what never lands
 * on this boss, and the way in. A damage race is only fair if the player can read the wall.
 */
export function BossSheetDialog({ bossId, onClose }: { bossId: string; onClose: () => void }) {
  const boss = content.bossById(bossId);
  if (!boss) return null;
  const tier = boss.tiers[0];
  const abilities = tier?.enemy.abilities ?? [];
  const passives = tier?.enemy.passives ?? [];
  const rotation = tier?.enemy.boss?.rotation ?? [];

  return (
    <Dialog
      title={t(boss.name as I18nKey)}
      onClose={onClose}
      width={760}
      testId="dialog-boss-sheet"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <p className={styles.lore}>{t(boss.lore as I18nKey)}</p>

      <ScrollArea height={380} className={styles.scroll}>
        <section className={styles.section}>
          <h3 className={`display ${styles.title}`}>{t('bosses.sheet.kit')}</h3>
          <p className={styles.rotation} data-testid="boss-sheet-rotation">
            {translate('bosses.sheet.rotation', {
              order: rotation.map((slot) => slot.toUpperCase()).join(' · '),
            })}
          </p>
          <ul className={styles.list}>
            {abilities.map((ability) => (
              <li key={ability.id} className={styles.row}>
                <AbilityIcon icon={ability.icon} label={t(ability.name as I18nKey)} size={44} />
                <div className={styles.text}>
                  <span className={styles.name}>{t(ability.name as I18nKey)}</span>
                  <span className={styles.body}>
                    {translate(ability.description as I18nKey, { ...abilityNumbers(ability) })}
                  </span>
                </div>
              </li>
            ))}
            {passives.map((passive) => (
              <li key={passive.id} className={styles.row}>
                <AbilityIcon icon={passive.icon} label={t(passive.name as I18nKey)} size={44} passive />
                <div className={styles.text}>
                  <span className={styles.name}>
                    {t(passive.name as I18nKey)} · {t('bosses.sheet.passive')}
                  </span>
                  <span className={styles.body}>
                    {translate(passive.description as I18nKey, { ...passiveNumbers(passive.effects) })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={`display ${styles.title}`}>{t('bosses.sheet.unshakeable')}</h3>
          <p className={styles.body} data-testid="boss-sheet-immunities">
            {translate('bosses.sheet.immune', {
              list: boss.immunities.map((id) => t(`status.${id}.name` as I18nKey)).join(', '),
            })}
          </p>
        </section>

        <section className={styles.section}>
          <h3 className={`display ${styles.title}`}>{t('bosses.sheet.tips')}</h3>
          <ul className={styles.tips}>
            <li>{t('bosses.sheet.tip.dots')}</li>
            <li>{t('bosses.sheet.tip.debuffs')}</li>
            <li>
              {translate('bosses.sheet.tip.enrage', {
                turn: tier?.enrageTurn ?? 0,
                step: Math.round(BOSS_ENRAGE_STEP * 100),
                every: boss.enrageEvery,
              })}
            </li>
            <li>{t('bosses.sheet.tip.damage')}</li>
          </ul>
        </section>
      </ScrollArea>
    </Dialog>
  );
}

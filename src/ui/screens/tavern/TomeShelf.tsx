import type { CSSProperties } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { ChampionDef } from '@content/champions/types';
import { tomeFor } from '@engine/progression/tavern-skills';
import { t, translate, type I18nKey } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import styles from './TomeShelf.module.css';

export interface TomeShelfProps {
  def: ChampionDef;
  tomesHeld: number;
}

/**
 * The Skills track under the champion (docs/tech/UI_DESIGN.md §5.5): the tome this champion reads,
 * how many are held and what one does. The kit and its presses are in the column beside it.
 */
export function TomeShelf({ def, tomesHeld }: TomeShelfProps) {
  const tome = tomeFor(def.rarity);
  const tomeDef = tome ? CURRENCY_BY_ID[tome] : null;
  return (
    <section className={styles.shelf} data-testid="tavern-tome-shelf">
      {tomeDef ? (
        <div className={styles.tome} style={{ '--tome': tomeDef.tint ?? 'var(--gold-3)' } as CSSProperties}>
          <span className={styles.glow} aria-hidden="true" />
          <TintedIcon asset={tomeDef.icon} tint={tomeDef.tint} size={84} />
          <span className={styles.tomeText}>
            <strong className={`display ${styles.tomeName}`}>{translate(tomeDef.name)}</strong>
            <span className={`num ${styles.tomeHeld}`}>{t('tavern.tome.held', { count: tomesHeld })}</span>
            <span className={styles.tomeBody}>{translate(tomeDef.description)}</span>
          </span>
        </div>
      ) : (
        <p className={styles.none}>
          {t('tavern.tome.none', { rarity: t(`rarity.${def.rarity}` as I18nKey) })}
        </p>
      )}
    </section>
  );
}

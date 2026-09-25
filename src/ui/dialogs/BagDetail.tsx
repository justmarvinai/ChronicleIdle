import type { CSSProperties } from 'react';
import type { ConsumableDef } from '@content/consumables/types';
import { needsChampion } from '@content/consumables/types';
import type { SaveGame } from '@engine/schema/save';
import { t, translate } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { consumableKind } from '@ui/screens/market/market-view';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import { itemStatus } from './bag-view';
import styles from './BagDetail.module.css';

export interface BagDetailProps {
  def: ConsumableDef;
  count: number;
  save: SaveGame;
  now: number;
  /** Uses it now, or — for the two that act on a champion — asks which one first. */
  onUse: () => void;
}

/**
 * One item in full (docs/tech/UI_DESIGN.md §5.26): its art in its rarity's frame, what kind of
 * thing it is and how many are held, what using it does, and how the thing it acts on stands right
 * now — then the one press. A consumable is bought once and used weeks later, so the panel says
 * everything a player would otherwise have to remember.
 */
export function BagDetail({ def, count, save, now, onUse }: BagDetailProps) {
  const slug = def.id.replace('item.', '');
  const rarity = { '--rarity': RARITY_COLOR[def.rarity] } as CSSProperties;
  return (
    <Panel
      kind="ember-wide"
      padding={26}
      className={styles.detail}
      contentClassName={styles.body}
      style={rarity}
      data-testid="bag-detail"
      data-item={def.id}
    >
      <span className={styles.art}>
        <AssetImage asset={def.icon} width={112} height={112} alt="" />
      </span>
      <span className={`display ${styles.kind}`}>
        {translate('bag.kindLine', { rarity: t(`rarity.${def.rarity}`), kind: consumableKind(def) })}
      </span>
      <h3 className={`display ${styles.name}`}>{translate(def.name)}</h3>
      <span className={`num ${styles.held}`}>{translate('bag.held', { count })}</span>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.description}>{translate(def.description)}</p>
      <p className={styles.status} data-testid="bag-status">
        {itemStatus(def, save, now)}
      </p>
      <div className={styles.press}>
        <Button variant="primary" size="lg" onClick={onUse} data-testid={`bag-use-${slug}`}>
          {needsChampion(def) ? t('bag.useOn') : t('bag.use')}
        </Button>
      </div>
    </Panel>
  );
}

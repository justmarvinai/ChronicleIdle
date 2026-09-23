import { useEffect, useRef } from 'react';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { TowerFloorView } from '@state/tower';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import styles from './TowerLadder.module.css';

export interface TowerLadderProps {
  floors: readonly TowerFloorView[];
  selected: number;
  keys: number;
  onSelect: (floor: number) => void;
  onClimb: (floor: number) => void;
}

/**
 * The tower itself (docs/tech/UI_DESIGN.md §5.13a): a hundred floors stacked as stone slabs under
 * an arch, floor 1 at the foot and the climb running upward as the tower does. A slab is pressed
 * to read its floor in the dossier; the floors a key may open carry their own **Fight**. It opens
 * on the selected floor and follows the selection when it changes from elsewhere.
 */
export function TowerLadder({ floors, selected, keys, onSelect, onClimb }: TowerLadderProps) {
  const list = useRef<HTMLOListElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    const node = list.current?.querySelector(`[data-floor="${selected}"]`);
    // Centred on arrival; after that only brought into view, so a slab pressed in place stays put.
    node?.scrollIntoView({ block: opened.current ? 'nearest' : 'center' });
    opened.current = true;
  }, [selected]);
  return (
    <section className={styles.ladder} aria-label={t('tower.ladder')}>
      <Panel kind="arch" padding={8} className={styles.frame} contentClassName={styles.inner}>
        <ScrollArea height="100%" fade className={styles.scroll} data-testid="tower-ladder">
          <ol ref={list} className={styles.floors} reversed>
            {[...floors].reverse().map((floor) => (
              <FloorSlab
                key={floor.floor}
                floor={floor}
                selected={floor.floor === selected}
                keys={keys}
                onSelect={onSelect}
                onClimb={onClimb}
              />
            ))}
          </ol>
        </ScrollArea>
      </Panel>
    </section>
  );
}

const STATE_LABEL = {
  next: 'tower.floor.next',
  repeatable: 'tower.floor.repeatable',
  cleared: 'tower.floor.cleared',
  locked: 'tower.floor.locked',
} as const;

/** One slab: its number, who holds it — the keeper by name on a boss floor, with the shard odds — and its state. */
function FloorSlab({
  floor,
  selected,
  keys,
  onSelect,
  onClimb,
}: {
  floor: TowerFloorView;
  selected: boolean;
  keys: number;
  onSelect: (floor: number) => void;
  onClimb: (floor: number) => void;
}) {
  const settlement = content.settlementByIndex(floor.settlement);
  const faction = settlement ? content.factionById(settlement.faction) : undefined;
  const place = settlement ? translate(settlement.name) : '';
  const open = floor.state === 'next' || floor.state === 'repeatable';
  return (
    <li
      className={[
        styles.slab,
        styles[floor.state],
        floor.boss ? styles.boss : '',
        selected ? styles.selected : '',
      ].join(' ')}
      data-floor={floor.floor}
      data-state={floor.state}
      data-selected={selected}
      data-testid={`tower-floor-${floor.floor}`}
    >
      <button
        type="button"
        className={styles.pick}
        aria-pressed={selected}
        onClick={() => onSelect(floor.floor)}
        data-testid={`tower-pick-${floor.floor}`}
      >
        <span className={`num ${styles.number}`}>{floor.floor}</span>
        <span className={styles.text}>
          {floor.boss ? (
            <>
              <span className={`display ${styles.keeper}`}>
                <Glyph
                  glyph="glyph.flaming_skull"
                  size={16}
                  color="var(--ember-3)"
                  label={t('tower.floor.boss')}
                />
                {faction ? translate(faction.boss.name) : place}
              </span>
              <span className={`num ${styles.odds}`} data-testid={`tower-odds-${floor.floor}`}>
                {floor.shards.sacred > 0
                  ? t('tower.odds.both', { ancient: floor.shards.ancient, sacred: floor.shards.sacred })
                  : t('tower.odds.ancient', { ancient: floor.shards.ancient })}
              </span>
            </>
          ) : (
            <span className={styles.place}>{place}</span>
          )}
        </span>
        {open ? null : <span className={styles.state}>{t(STATE_LABEL[floor.state])}</span>}
      </button>
      {open ? (
        <Button
          variant={floor.state === 'next' ? 'primary' : 'secondary'}
          size="sm"
          disabled={keys < 1}
          onClick={() => onClimb(floor.floor)}
          className={styles.fight}
          data-testid={`tower-fight-${floor.floor}`}
        >
          {t('tower.fight')}
        </Button>
      ) : null}
    </li>
  );
}

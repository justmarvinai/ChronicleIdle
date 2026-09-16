import { memo } from 'react';
import { STATUS_BY_ID } from '@content/statuses/index';
import type { UnitView } from '@engine/battle/index';
import { t, translate } from '@i18n/index';
import { plateAnchor } from '@render/battle/index';
import { Bar } from '@ui/components/Bar/Bar';
import { StatusIcon } from '@ui/components/StatusIcon/StatusIcon';
import styles from './BattleScreen.module.css';

export interface UnitPlateProps {
  unit: UnitView;
  active: boolean;
  targetable: boolean;
  targeted: boolean;
  onPick?: ((id: string) => void) | undefined;
  onHover?: ((id: string | null) => void) | undefined;
}

/** HUD plate above a unit: name, level, HP (with shield), TM and the status row. */
export const UnitPlate = memo(function UnitPlate({
  unit,
  active,
  targetable,
  targeted,
  onPick,
  onHover,
}: UnitPlateProps) {
  const anchor = plateAnchor(unit.side, unit.slot, unit.art.scale, unit.guarding !== null);
  const shieldPct = unit.maxHp > 0 ? Math.min(100, (unit.shield / unit.maxHp) * 100) : 0;
  const interactive = targetable && !!onPick;
  return (
    <div
      className={[
        styles.plate,
        unit.side === 'ally' ? styles.plateAlly : styles.plateEnemy,
        active ? styles.plateActive : '',
        targetable ? styles.plateTargetable : '',
        targeted ? styles.plateTargeted : '',
        unit.alive ? '' : styles.plateDead,
      ].join(' ')}
      style={{ left: anchor.x, top: anchor.y }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${translate(unit.name)}, ${t('common.levelShort', { level: unit.level })}`}
      data-testid={`plate-${unit.id}`}
      data-targetable={targetable ? 'true' : 'false'}
      onClick={interactive ? () => onPick?.(unit.id) : undefined}
      onMouseEnter={() => onHover?.(unit.id)}
      onMouseLeave={() => onHover?.(null)}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onPick?.(unit.id);
        }
      }}
    >
      <div className={styles.plateHead}>
        <span className={`num ${styles.plateLevel}`}>{unit.level}</span>
        <span className={`display ${styles.plateName}`}>{translate(unit.name)}</span>
        {unit.isBoss ? <span className={styles.bossTag}>{t('battle.boss')}</span> : null}
      </div>
      <div className={styles.plateHp}>
        <Bar value={unit.hp} max={unit.maxHp} kind="health" height={16} />
        {shieldPct > 0 ? (
          <div
            className={styles.shieldBar}
            style={{ width: `${shieldPct}%` }}
            aria-label={t('battle.shield', { value: unit.shield })}
          />
        ) : null}
      </div>
      <div className={styles.plateTm}>
        <div className={styles.tmFill} style={{ width: `${Math.min(100, unit.tm * 100)}%` }} />
      </div>
      {unit.statuses.length ? (
        <div className={styles.statusRow} data-testid={`statuses-${unit.id}`}>
          {unit.statuses.slice(0, 10).map((s) => {
            const meta = STATUS_BY_ID[s.id];
            return (
              <StatusIcon
                key={s.id}
                glyph={meta.glyph}
                kind={meta.kind}
                turns={s.turns}
                label={`${translate(meta.name)}${s.stacks > 1 ? ` ×${s.stacks}` : ''}`}
                size={26}
              />
            );
          })}
        </div>
      ) : null}
      {targeted ? <span className={styles.reticle} aria-hidden="true" /> : null}
    </div>
  );
});

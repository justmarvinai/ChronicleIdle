import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { t, translate } from '@i18n/index';
import type { TowerFloorView } from '@state/tower';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { currencyTile, xpTile, type RewardTile } from '@ui/components/RewardTiles/reward-tile';
import { RewardTiles } from '@ui/components/RewardTiles/RewardTiles';
import { EnemyCard } from '@ui/screens/battle-setup/EnemyCard';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import type { FloorDossier as Dossier } from './tower-view';
import styles from './FloorDossier.module.css';

/**
 * The enemy cards' measures, in stage pixels: four of them fill the dossier's width, and a card
 * this short draws its sprite at 1.5× so the enemy stands clear of its name.
 */
const ENEMY_W = 196;
const ENEMY_H = 250;
const ENEMY_SPRITE = 1.5;
const SHARD_ICON = 44;
/** The word on the header's ribbon, per state of the floor. */
const STATE_RIBBON = {
  next: 'tower.floor.next',
  repeatable: 'tower.floor.repeatable',
  cleared: 'tower.floor.cleared',
  locked: 'tower.floor.locked',
} as const;

export interface FloorDossierProps {
  dossier: Dossier;
  state: TowerFloorView['state'];
  keys: number;
  /** The one floor a key opens, which a sealed floor points the player to. */
  next: number | null;
  onFight: (floor: number) => void;
}

/**
 * One floor, read before a key is spent (docs/tech/UI_DESIGN.md §5.13a): the place that holds it
 * as the header's art, the floor's number large, who holds it and on what terms, the enemies it
 * fields as the setup screen draws them, and what a clear pays — the shard odds on a keeper's floor
 * as tiles of their own. The press at its foot is the one the floor's state allows.
 */
export function FloorDossier({ dossier, state, keys, next, onFight }: FloorDossierProps) {
  const { floor, boss, settlement, faction, encounter, enemies, payout, odds } = dossier;
  const shardTile = (currency: CurrencyId, percent: number): RewardTile => {
    const def = CURRENCY_BY_ID[currency];
    return {
      id: `odds-${currency}`,
      icon: <TintedIcon asset={def.icon} tint={def.tint} size={SHARD_ICON} label="" />,
      amount: t('tower.dossier.percent', { percent }),
      label: t('tower.dossier.chance', { name: translate(def.name) }),
      tone: 'rare',
    };
  };
  const tiles: RewardTile[] = [
    ...payout.currencies.map((entry) => currencyTile(entry.currency, entry.amount)),
    ...(payout.energy > 0 ? [currencyTile('energy', payout.energy)] : []),
    xpTile('champion', payout.championXp),
    xpTile('player', payout.playerXp),
    ...(odds.ancient > 0 ? [shardTile('shard_ancient', odds.ancient)] : []),
    ...(odds.sacred > 0 ? [shardTile('shard_sacred', odds.sacred)] : []),
  ];
  const noKey = keys < 1;
  return (
    <section
      className={[styles.dossier, boss ? styles.boss : ''].join(' ')}
      data-testid="tower-dossier"
      data-floor={floor}
      data-state={state}
    >
      <Panel kind="ember-tall" padding={0} className={styles.panel} contentClassName={styles.body}>
        <header
          className={styles.hero}
          style={{ '--art': `url("${imageUrl(settlement.backdrop)}")` } as CSSProperties}
        >
          <span className={styles.heroArt} aria-hidden="true" />
          <div className={styles.heroText}>
            <span className={`display ${styles.kicker}`}>
              {boss ? t('tower.dossier.keeperFloor') : t('tower.dossier.floor')}
            </span>
            <div className={styles.titleRow}>
              <h2 className={`display ${styles.floorNo}`}>{floor}</h2>
              <div className={styles.where}>
                <span className={`display ${styles.place}`}>
                  {boss ? translate(faction.boss.name) : translate(settlement.name)}
                </span>
                <span className={styles.held}>
                  <span
                    className={styles.sigil}
                    style={{ '--element': ELEMENT_COLOR[faction.element] } as CSSProperties}
                  >
                    <Glyph glyph={ELEMENT_GLYPH[faction.element]} size={14} color="var(--text-1)" />
                  </span>
                  {boss
                    ? `${translate(faction.name)} · ${translate(settlement.name)}`
                    : `${t('tower.dossier.heldBy')} ${translate(faction.name)}`}
                </span>
              </div>
            </div>
          </div>
          <span
            className={`display ${styles.stateRibbon} ${styles[state]}`}
            data-testid="tower-dossier-state"
          >
            {t(STATE_RIBBON[state])}
          </span>
        </header>

        <ul className={styles.facts}>
          <li>
            <Glyph glyph="glyph.flaming_skull" size={16} color="var(--ember-3)" />
            {t('tower.dossier.enemyLevel', { level: encounter.enemyLevel })}
          </li>
          <li>
            <Glyph glyph="glyph.hourglass" size={16} color="var(--gold-2)" />
            {t('tower.dossier.turnLimit', { turns: encounter.turnLimit })}
          </li>
          <li>
            <Glyph glyph="glyph.shield_block" size={16} color="var(--gold-2)" />
            {t('tower.dossier.party', { count: encounter.partySize })}
          </li>
        </ul>

        <section className={styles.section}>
          <h3 className={`display ${styles.heading}`}>{t('tower.dossier.enemies')}</h3>
          <ul className={styles.enemies} data-testid="tower-dossier-enemies">
            {enemies.map((enemy, index) => (
              <EnemyCard
                key={`${enemy.def.id}-${index}`}
                def={enemy.def}
                encounter={encounter}
                statMult={enemy.statMult}
                width={ENEMY_W}
                height={ENEMY_H}
                spriteMax={ENEMY_SPRITE}
              />
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={`display ${styles.heading}`}>{t('tower.dossier.pays')}</h3>
          <RewardTiles tiles={tiles} columns={boss ? 4 : 5} testId="tower-dossier-pays" />
        </section>

        <footer className={styles.action}>
          {state === 'next' ? (
            <>
              <span className={styles.cost}>
                <span
                  className={styles.keyIcon}
                  style={{ backgroundImage: `url("${imageUrl('ui.stone_vine.icon_key')}")` }}
                  aria-hidden="true"
                />
                {noKey ? t('tower.noKeys') : t('tower.keyCost')}
              </span>
              <Button
                variant="primary"
                size="lg"
                disabled={noKey}
                onClick={() => onFight(floor)}
                data-testid="tower-climb-next"
              >
                {t('tower.enter', { floor })}
              </Button>
            </>
          ) : state === 'repeatable' ? (
            <>
              <span className={styles.cost}>
                <span
                  className={styles.keyIcon}
                  style={{ backgroundImage: `url("${imageUrl('ui.stone_vine.icon_key')}")` }}
                  aria-hidden="true"
                />
                {noKey ? t('tower.noKeys') : t('tower.keyCost')}
              </span>
              <Button
                variant="primary"
                size="lg"
                disabled={noKey}
                onClick={() => onFight(floor)}
                data-testid="tower-dossier-fight"
              >
                {t('tower.again', { floor })}
              </Button>
            </>
          ) : (
            <p className={styles.note} data-testid="tower-dossier-note">
              {state === 'cleared'
                ? t('tower.dossier.cleared')
                : t('tower.dossier.sealed', { floor: next ?? floor })}
            </p>
          )}
        </footer>
      </Panel>
    </section>
  );
}

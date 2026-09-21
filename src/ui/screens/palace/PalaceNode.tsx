import { STAT_IDS } from '@content/champions/types';
import { playSfx } from '@audio/index';
import { t, type I18nKey } from '@i18n/index';
import type { PalaceNodeState } from '@engine/palace/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { formatStat, statLabel } from '@ui/gear/gear-view';
import { ELEMENT_COLOR } from '@ui/styles/display-maps';
import { nodeGlyph } from './palace-icons';
import type { PalaceNodeView, PalacePoint } from './palace-view';
import styles from './PalaceScreen.module.css';

/** What each state is called, on the tooltip and to a screen reader. */
const STATE_TEXT: Record<PalaceNodeState, I18nKey> = {
  owned: 'palace.owned',
  ready: 'palace.reachable',
  tooShort: 'palace.tooShort',
  unreachable: 'palace.unreachable',
};

const costText = (cost: number): string => t(cost === 1 ? 'palace.cost' : 'palace.costPlural', { cost });

export interface PalaceNodeProps {
  view: PalaceNodeView;
  /** Where the node sits on the canvas, its centre. */
  at: PalacePoint;
  /** True for a moment after this node was bought, for the flare. */
  fresh: boolean;
  onBuy: (view: PalaceNodeView) => void;
}

/** A node on the tree: a framed disc with its glyph, its price, and its whole story on hover. */
export function PalaceNode({ view, at, fresh, onBuy }: PalaceNodeProps) {
  const { node, state, element, size } = view;
  const name = t(node.name as I18nKey);
  return (
    <Tooltip content={<NodeTip view={view} />} delayMs={80} maxWidth={320}>
      <button
        type="button"
        className={[styles.node, node.hpPct > 0 ? styles.core : '', fresh ? styles.fresh : ''].join(' ')}
        style={{
          left: at.x,
          top: at.y,
          width: size,
          height: size,
          ['--el' as string]: element ? ELEMENT_COLOR[element] : 'var(--gold-3)',
        }}
        data-state={state}
        data-cost={node.cost}
        data-testid={`palace-node-${node.id}`}
        /* A node with nothing leading to it is not a tab stop: the tree has 133 of them. */
        tabIndex={state === 'unreachable' ? -1 : 0}
        aria-label={`${name} — ${costText(node.cost)} — ${t(STATE_TEXT[state])}`}
        onMouseEnter={() => playSfx('ui.hover')}
        /* Tabbing through the tree pulls the field along rather than leaving the focus off screen. */
        onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
        onClick={() => onBuy(view)}
      >
        <span className={styles.nodeFace} aria-hidden="true" />
        <Glyph glyph={nodeGlyph(node.name)} size={Math.round(size * 0.44)} />
        {node.cost > 1 ? <span className={`num ${styles.nodeCost}`}>{node.cost}</span> : null}
      </button>
    </Tooltip>
  );
}

/** The hover panel: what it is called, what it costs, what it adds and to whom. */
function NodeTip({ view }: { view: PalaceNodeView }) {
  const { node, element, state } = view;
  const granted = STAT_IDS.filter((stat) => node.grants[stat] !== undefined);
  return (
    <div
      className={styles.tip}
      style={{ ['--el' as string]: element ? ELEMENT_COLOR[element] : 'var(--gold-3)' }}
    >
      <div className={styles.tipHead}>
        <span className={`display ${styles.tipName}`}>{t(node.name as I18nKey)}</span>
        <span className={`num ${styles.tipCost}`}>{costText(node.cost)}</span>
      </div>
      {node.hpPct > 0 ? (
        <p className={styles.tipCore}>{t('palace.node.heart.detail', { pct: node.hpPct })}</p>
      ) : null}
      {granted.length > 0 ? (
        <dl className={styles.tipGrants}>
          {granted.map((stat) => (
            <div key={stat} className={styles.tipGrant}>
              <dt>{statLabel(stat)}</dt>
              <dd className="num">+{formatStat(stat, node.grants[stat] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className={styles.tipWho}>
        {element
          ? t('palace.appliesTo', { element: t(`element.${element}` as I18nKey) })
          : t('palace.appliesToAll')}
      </p>
      <p className={styles.tipState} data-state={state}>
        {t(STATE_TEXT[state])}
      </p>
    </div>
  );
}

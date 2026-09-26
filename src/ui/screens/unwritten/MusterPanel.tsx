import { useMemo } from 'react';
import { translate } from '@i18n/index';
import type { Expedition } from '@engine/schema/unwritten-save';
import type { UnwrittenCtx } from '@engine/unwritten/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { PASSAGE_HINT, PASSAGE_NAME } from './marks';
import { LeafHead } from './LeafHead';
import { line, u } from './strings';
import { folioOf, fightView, type MemberView } from './unwritten-view';
import styles from './Panels.module.css';

export interface MusterPanelProps {
  run: Expedition;
  ctx: UnwrittenCtx;
  company: MemberView[];
  fielded: readonly string[];
  fellBack: boolean;
  onFight: () => void;
}

/**
 * A fight waiting (UNWRITTEN.md §4.2, §6): who stands in the passage — wounded where a lost fight
 * left them so — what marks the Unwritten put on them, and who of the company goes in. The company
 * is picked on the left; the leaf says how many are going and sends them.
 */
export function MusterPanel({ run, ctx, company, fielded, fellBack, onFight }: MusterPanelProps) {
  const view = useMemo(() => fightView(run, ctx, company), [run, ctx, company]);
  if (!view) return null;
  const { pending, foes } = view;
  const kind = pending.fight;
  const folio = folioOf(run, ctx);
  const warden = kind === 'warden';
  const title = pending.duel
    ? translate('unwritten.encounter.duel.name')
    : warden && foes[0]
      ? translate(foes[0].def.name)
      : u(PASSAGE_NAME[kind]);
  const kicker =
    warden && folio
      ? u('unwritten.ui.fight.warden', { folio: translate(folio.name) })
      : u(PASSAGE_NAME[kind]);
  return (
    <>
      <LeafHead kind={kind} kicker={kicker} title={title} sub={u(PASSAGE_HINT[kind])} />
      {view.contested ? (
        <p className={styles.notice} data-testid="unwritten-contested">
          {fellBack ? u('unwritten.ui.fight.fellBack') : u('unwritten.ui.fight.contested')}
        </p>
      ) : null}
      <div className={styles.foes} data-testid="unwritten-foes">
        {foes.map((foe, slot) => (
          <div
            key={`${foe.def.id}-${slot}`}
            className={[styles.foe, foe.marked ? styles.marked : ''].join(' ')}
          >
            <span className={styles.foeArt}>
              <SpriteView
                model={foe.def.art.model}
                scale={warden && slot === 0 ? 1.7 : 1.15}
                facing={foe.def.art.facing === 'right' ? 'left' : 'right'}
                tint={foe.def.art.tint}
                desaturate={foe.def.art.desaturate ?? false}
              />
            </span>
            <span className={styles.foeName}>{translate(foe.def.name)}</span>
            {foe.hp < 1 ? (
              <Bar value={Math.round(foe.hp * 100)} max={100} kind="health" height={10} width={120} />
            ) : null}
          </div>
        ))}
        {view.later > 0 ? (
          <span className={styles.later}>{u('unwritten.ui.fight.later', { count: view.later })}</span>
        ) : null}
      </div>
      {view.affixes.length ? (
        view.affixesKnown ? (
          <div className={styles.affixes} data-testid="unwritten-affixes">
            {view.affixes.map((affix) => (
              <span key={affix.id} className={styles.affix}>
                <AbilityIcon icon={affix.icon} label={line(affix.name, {})} size={40} passive decorative />
                <span className={styles.affixText}>
                  <span className={styles.affixName}>{line(affix.name, {})}</span>
                  {line(affix.text, affix.show)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className={styles.sub}>{u('unwritten.ui.fight.hiddenMarks', { count: view.affixes.length })}</p>
        )
      ) : null}
      <div className={styles.muster}>
        <span>
          {u('unwritten.ui.fight.sendIn')}{' '}
          <span className={styles.musterCount} data-testid="unwritten-fielded-count">
            {fielded.length}/{Math.min(view.party, view.standing.length)}
          </span>
        </span>
        <span className={styles.sub}>{u('unwritten.ui.fight.pickHint')}</span>
        <Button
          variant="primary"
          size="lg"
          disabled={fielded.length === 0}
          onClick={onFight}
          data-testid="unwritten-fight"
        >
          {u('unwritten.ui.fight.go')}
        </Button>
      </div>
    </>
  );
}

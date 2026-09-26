import type { ReactNode } from 'react';
import { t, translate } from '@i18n/index';
import type { Expedition, Pending } from '@engine/schema/unwritten-save';
import type { UnwrittenCtx } from '@engine/unwritten/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { unwrittenCommands } from '@state/unwritten/commands';
import { InscriptionCard } from './InscriptionCard';
import { LeafHead } from './LeafHead';
import { PASSAGE_NAME } from './marks';
import { MusterPanel } from './MusterPanel';
import { MysteryPanel } from './MysteryPanel';
import { PeddlerPanel } from './PeddlerPanel';
import { ShrinePanel } from './ShrinePanel';
import { line, u, type UnwrittenKey } from './strings';
import { cardView, echoView, OFFER_SKIP_GILT, relicChoice, type MemberView } from './unwritten-view';
import type { Act } from './act';
import styles from './Panels.module.css';

export interface PassagePanelProps {
  run: Expedition;
  ctx: UnwrittenCtx;
  company: MemberView[];
  fielded: readonly string[];
  /** How the last fight here ended, if it was lost: the muster says what stayed. */
  fellBack: boolean;
  act: Act;
  onFight: () => void;
}

/** Where an offer came from, as its leaf's kicker says it. */
const OFFER_KICKER: Readonly<Record<Extract<Pending, { kind: 'offer' }>['from'], UnwrittenKey>> = {
  skirmish: 'unwritten.ui.offer.fromSkirmish',
  elite: 'unwritten.ui.offer.fromElite',
  warden: 'unwritten.ui.offer.fromWarden',
  duel: 'unwritten.ui.offer.fromDuel',
  // Veteran's Start writes its inscription outright; an offer never comes from it.
  start: 'unwritten.ui.offer.fromSkirmish',
};

/** What the victory just fought paid, above the offer it earned (UNWRITTEN.md §12, §14). */
function Spoils({ run }: { run: Expedition }) {
  const spoils = run.spoils;
  if (!spoils) return null;
  return (
    <div className={styles.spoils} data-testid="unwritten-spoils">
      <span className={styles.spoil}>
        <Glyph glyph="glyph.coin_purse" size={20} color="var(--gold-3)" />
        <span className={styles.spoilValue}>+{spoils.gilt}</span> {u('unwritten.ui.codex.gilt')}
      </span>
      <span className={styles.spoil}>
        <Glyph glyph="glyph.burning_scroll" size={20} color="#cbb8ff" />
        <span className={styles.spoilValue}>+{spoils.pages}</span> {u('unwritten.ui.codex.pages')}
      </span>
      {spoils.healed > 0 ? (
        <span className={styles.spoil}>
          {u('unwritten.ui.spoils.healed', { share: Math.round(spoils.healed * 100) })}
        </span>
      ) : null}
      {spoils.relic ? (
        <span className={styles.spoil}>
          {u('unwritten.ui.spoils.relic', {
            name: translate(`unwritten.${spoils.relic}.name`),
          })}
        </span>
      ) : null}
      {spoils.tithe.length ? (
        <span className={styles.spoil}>
          {u('unwritten.ui.spoils.tithe')} <RewardList amounts={spoils.tithe} size={22} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * The passage in hand (UNWRITTEN.md §5.2): whatever it is waiting on, laid over the map as a leaf —
 * a fight to send the company into, an offer to write, a relic, a mystery, a shrine, the Peddler,
 * an Echo. Nothing else can be entered until it is done.
 */
export function PassagePanel({ run, ctx, company, fielded, fellBack, act, onFight }: PassagePanelProps) {
  const pending = run.pending;
  if (!pending) return null;
  const leaf = (children: ReactNode, testId: string, wide = false) => (
    <div className={styles.veil}>
      <div
        className={[styles.leaf, wide ? styles.wide : ''].join(' ')}
        role="dialog"
        aria-modal="false"
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );

  switch (pending.kind) {
    case 'fight':
      return leaf(
        <MusterPanel
          run={run}
          ctx={ctx}
          company={company}
          fielded={fielded}
          fellBack={fellBack}
          onFight={onFight}
        />,
        'unwritten-panel-fight',
      );
    case 'offer': {
      const cards = pending.cards.flatMap((card, index) => {
        const view = cardView(card, ctx);
        return view ? [{ view, index }] : [];
      });
      const kicker = OFFER_KICKER[pending.from];
      return leaf(
        <>
          <LeafHead
            kind="mystery"
            kicker={u(kicker)}
            title={u('unwritten.ui.offer.title')}
            sub={u('unwritten.ui.offer.sub')}
          />
          <Spoils run={run} />
          <div className={styles.cards}>
            {cards.map(({ view, index }) => (
              <InscriptionCard
                key={view.def.id}
                def={view.def}
                level={view.level}
                deepens={view.held > 0}
                onClick={() => act(() => unwrittenCommands.chooseOffer(index), 'unwritten.quill')}
                testId={`unwritten-offer-${index}`}
              />
            ))}
          </div>
          <div className={styles.actions}>
            {run.rerolls > 0 ? (
              <Button
                variant="secondary"
                onClick={() => act(() => unwrittenCommands.reroll(), 'unwritten.page')}
                data-testid="unwritten-reroll"
              >
                {u('unwritten.ui.offer.reroll', { count: run.rerolls })}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => act(() => unwrittenCommands.chooseOffer(null), 'ui.cancel')}
              data-testid="unwritten-skip"
            >
              {u('unwritten.ui.offer.skip', { gilt: OFFER_SKIP_GILT })}
            </Button>
          </div>
        </>,
        'unwritten-panel-offer',
        true,
      );
    }
    case 'relic_choice':
    case 'reliquary': {
      const relics = relicChoice(run, ctx);
      const hoard = pending.kind === 'relic_choice';
      return leaf(
        <>
          <LeafHead
            kind={hoard ? 'warden' : 'reliquary'}
            kicker={u(hoard ? 'unwritten.ui.relic.hoard' : 'unwritten.ui.passage.reliquary')}
            title={u(relics.length > 1 ? 'unwritten.ui.relic.choose' : 'unwritten.ui.relic.take')}
            sub={u('unwritten.ui.relic.sub')}
          />
          <div className={styles.relics}>
            {relics.map((relic, index) => (
              <button
                key={relic.id}
                type="button"
                className={styles.relic}
                onClick={() => act(() => unwrittenCommands.chooseRelic(index), 'reward.medium')}
                data-testid={`unwritten-relic-${index}`}
              >
                <AbilityIcon icon={relic.icon} label={line(relic.name, {})} size={96} passive decorative />
                <span className={`display ${styles.relicName}`}>{line(relic.name, {})}</span>
                <span className={styles.relicLine}>{line(relic.text, relic.show)}</span>
              </button>
            ))}
          </div>
        </>,
        'unwritten-panel-relic',
      );
    }
    case 'mystery':
      return leaf(<MysteryPanel run={run} ctx={ctx} act={act} />, 'unwritten-panel-mystery');
    case 'shrine':
      return leaf(<ShrinePanel run={run} ctx={ctx} company={company} act={act} />, 'unwritten-panel-shrine');
    case 'peddler':
      return leaf(
        <PeddlerPanel run={run} ctx={ctx} company={company} act={act} />,
        'unwritten-panel-peddler',
        true,
      );
    case 'echo': {
      const view = echoView(run, ctx);
      if (!view) return null;
      return leaf(
        <>
          <LeafHead
            kind="echo"
            kicker={u(PASSAGE_NAME.echo)}
            title={u('unwritten.ui.echo.title')}
            sub={view.full ? u('unwritten.ui.echo.full') : u('unwritten.ui.echo.sub')}
          />
          <div className={styles.echoes}>
            {view.echoes.map(({ echo, def }, index) => (
              <div key={def.id} className={styles.echo}>
                <ChampionCard
                  name={translate(def.name)}
                  rarity={def.rarity}
                  element={def.element}
                  role={def.role}
                  stars={echo.stars}
                  level={echo.level}
                  avatar={def.art.avatar}
                  tint={def.art.tint}
                  placeholder={def.art.placeholder}
                  placeholderLabel={t('champions.placeholder')}
                  size={192}
                  badge={u('unwritten.ui.company.echo')}
                />
                <span className={`display ${styles.echoName}`}>{translate(def.name)}</span>
                <span className={styles.echoMeta}>
                  {u('unwritten.ui.echo.resolve', { resolve: view.resolve })}
                </span>
                <Button
                  variant="primary"
                  disabled={view.full}
                  onClick={() => act(() => unwrittenCommands.chooseEcho(index), 'summon.reveal.rare')}
                  data-testid={`unwritten-echo-${index}`}
                >
                  {u('unwritten.ui.echo.take')}
                </Button>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => act(() => unwrittenCommands.chooseEcho(null), 'ui.cancel')}
              data-testid="unwritten-echo-decline"
            >
              {u('unwritten.ui.echo.decline', { gilt: view.gilt })}
            </Button>
          </div>
        </>,
        'unwritten-panel-echo',
      );
    }
  }
}

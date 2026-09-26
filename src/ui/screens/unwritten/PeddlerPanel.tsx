import { SALVE_HEAL } from '@content/balance/unwritten';
import { translate } from '@i18n/index';
import type { Expedition } from '@engine/schema/unwritten-save';
import type { UnwrittenCtx } from '@engine/unwritten/index';
import { unwrittenCommands } from '@state/unwritten/commands';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import type { Act } from './act';
import { InscriptionCard } from './InscriptionCard';
import { LeafHead } from './LeafHead';
import { PASSAGE_NAME, numeral } from './marks';
import { line, u } from './strings';
import { peddlerView, type MemberView } from './unwritten-view';
import styles from './Panels.module.css';

function Price({ price, gilt }: { price: number; gilt: number }) {
  return (
    <span className={[styles.price, price > gilt ? styles.priceShort : ''].join(' ')}>
      <Glyph glyph="glyph.coin_purse" size={18} color="currentColor" />
      {price}
    </span>
  );
}

/**
 * The Peddler (UNWRITTEN.md §11.2): three inscriptions and two relics on the cloth, and the five
 * services below them — each priced under the rules the expedition carries, each greyed the
 * moment the purse cannot meet it. The stock was drawn when the company walked in and stays as it
 * was, so leaving the screen and coming back is the same shop.
 */
export function PeddlerPanel({
  run,
  ctx,
  company,
  act,
}: {
  run: Expedition;
  ctx: UnwrittenCtx;
  company: MemberView[];
  act: Act;
}) {
  const view = peddlerView(run, ctx, company);
  if (!view) return null;
  const { prices, shrine } = view;
  const gilt = run.gilt;
  return (
    <>
      <LeafHead
        kind="peddler"
        kicker={u(PASSAGE_NAME.peddler)}
        title={u('unwritten.ui.peddler.title')}
        sub={u('unwritten.ui.peddler.purse', { gilt })}
      />
      <div className={styles.cloth}>
        <div className={styles.wares} data-testid="unwritten-wares">
          {view.wares.map(({ ware, index, card, relic }) =>
            card ? (
              <span key={`${ware.id}-${index}`} className={ware.sold ? styles.sold : ''}>
                <InscriptionCard
                  def={card.def}
                  level={card.level}
                  deepens={card.held > 0}
                  compact
                  disabled={ware.sold || ware.price > gilt}
                  price={
                    ware.sold ? u('unwritten.ui.peddler.sold') : <Price price={ware.price} gilt={gilt} />
                  }
                  onClick={() =>
                    act(() => unwrittenCommands.peddler({ kind: 'buy', ware: index }), 'unwritten.quill')
                  }
                  testId={`unwritten-ware-${index}`}
                />
              </span>
            ) : relic ? (
              <button
                key={`${ware.id}-${index}`}
                type="button"
                className={[styles.relic, ware.sold ? styles.sold : ''].join(' ')}
                disabled={ware.sold || ware.price > gilt}
                onClick={() =>
                  act(() => unwrittenCommands.peddler({ kind: 'buy', ware: index }), 'reward.medium')
                }
                data-testid={`unwritten-ware-${index}`}
              >
                <AbilityIcon icon={relic.icon} label={line(relic.name, {})} size={80} passive decorative />
                <span className={`display ${styles.relicName}`}>{line(relic.name, {})}</span>
                <span className={styles.relicLine}>{line(relic.text, relic.show)}</span>
                {ware.sold ? u('unwritten.ui.peddler.sold') : <Price price={ware.price} gilt={gilt} />}
              </button>
            ) : null,
          )}
        </div>

        <div className={styles.services}>
          <section className={styles.service}>
            <span className={`display ${styles.serviceName}`}>{u('unwritten.ui.peddler.salve')}</span>
            <p className={styles.serviceLine}>
              {u('unwritten.ui.peddler.salveLine', { share: Math.round(SALVE_HEAL * 100) })}
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={prices.salve > gilt}
              onClick={() => act(() => unwrittenCommands.peddler({ kind: 'salve' }), 'battle.heal')}
              data-testid="unwritten-peddler-salve"
            >
              <Price price={prices.salve} gilt={gilt} />
            </Button>
          </section>

          <section className={styles.service}>
            <span className={`display ${styles.serviceName}`}>{u('unwritten.ui.peddler.ash')}</span>
            <p className={styles.serviceLine}>
              {view.ash
                ? u('unwritten.ui.peddler.onceDone')
                : u('unwritten.ui.peddler.ashLine', { share: Math.round(view.ashShare * 100) })}
            </p>
            <div className={styles.targets}>
              {shrine.fallen.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={styles.target}
                  disabled={view.ash || prices.ash > gilt}
                  onClick={() =>
                    act(() => unwrittenCommands.peddler({ kind: 'ash', member: member.id }), 'battle.revive')
                  }
                  data-testid={`unwritten-peddler-ash-${member.id}`}
                >
                  {translate(member.def.name)} <Price price={prices.ash} gilt={gilt} />
                </button>
              ))}
              {shrine.fallen.length ? null : (
                <p className={styles.none}>{u('unwritten.ui.shrine.noneFallen')}</p>
              )}
            </div>
          </section>

          <section className={styles.service}>
            <span className={`display ${styles.serviceName}`}>{u('unwritten.ui.peddler.deepen')}</span>
            <p className={styles.serviceLine}>
              {view.deepen ? u('unwritten.ui.peddler.onceDone') : u('unwritten.ui.peddler.deepenLine')}
            </p>
            <div className={styles.targets}>
              {shrine.deepenable.map((held) => (
                <button
                  key={held.def.id}
                  type="button"
                  className={styles.target}
                  disabled={view.deepen || prices.deepen > gilt}
                  onClick={() =>
                    act(
                      () => unwrittenCommands.peddler({ kind: 'deepen', inscription: held.def.id }),
                      'unwritten.quill',
                    )
                  }
                  data-testid={`unwritten-peddler-deepen-${held.def.id}`}
                >
                  <span>
                    {line(held.def.name, {})} {numeral(held.level + 1)}
                  </span>
                  <Price price={prices.deepen} gilt={gilt} />
                </button>
              ))}
              {shrine.deepenable.length ? null : (
                <p className={styles.none}>{u('unwritten.ui.shrine.noneToDeepen')}</p>
              )}
            </div>
          </section>

          <section className={styles.service}>
            <span className={`display ${styles.serviceName}`}>{u('unwritten.ui.peddler.scrape')}</span>
            <p className={styles.serviceLine}>{u('unwritten.ui.peddler.scrapeLine')}</p>
            <div className={styles.targets}>
              {shrine.blots.map((blot) => (
                <button
                  key={blot.id}
                  type="button"
                  className={styles.target}
                  disabled={prices.scrape > gilt}
                  onClick={() =>
                    act(() => unwrittenCommands.peddler({ kind: 'scrape', blot: blot.id }), 'ui.confirm')
                  }
                  data-testid={`unwritten-peddler-scrape-${blot.id}`}
                >
                  {line(blot.name, {})} <Price price={prices.scrape} gilt={gilt} />
                </button>
              ))}
              {shrine.blots.length ? null : (
                <p className={styles.none}>{u('unwritten.ui.shrine.noneBlots')}</p>
              )}
            </div>
          </section>

          <section className={styles.service}>
            <span className={`display ${styles.serviceName}`}>{u('unwritten.ui.peddler.restock')}</span>
            <p className={styles.serviceLine}>
              {view.restock ? u('unwritten.ui.peddler.onceDone') : u('unwritten.ui.peddler.restockLine')}
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={view.restock || prices.restock > gilt}
              onClick={() => act(() => unwrittenCommands.peddler({ kind: 'restock' }), 'unwritten.page')}
              data-testid="unwritten-peddler-restock"
            >
              <Price price={prices.restock} gilt={gilt} />
            </Button>
          </section>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={() => act(() => unwrittenCommands.peddler({ kind: 'leave' }), 'ui.close')}
          data-testid="unwritten-peddler-leave"
        >
          {u('unwritten.ui.peddler.leave')}
        </Button>
      </div>
    </>
  );
}

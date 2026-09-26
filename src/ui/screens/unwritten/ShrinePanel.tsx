import { translate } from '@i18n/index';
import type { Expedition } from '@engine/schema/unwritten-save';
import type { UnwrittenCtx } from '@engine/unwritten/index';
import { unwrittenCommands } from '@state/unwritten/commands';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import type { Act } from './act';
import { LeafHead } from './LeafHead';
import { PASSAGE_NAME, numeral } from './marks';
import { line, u } from './strings';
import { shrineView, type MemberView } from './unwritten-view';
import styles from './Panels.module.css';

/**
 * A shrine (UNWRITTEN.md §11.1): four offers, and only one may be taken — rest the company, raise
 * one who fell, deepen one inscription, or scrape one blot away. What each would do is on its card
 * before it is chosen, at the share the rules and the Omen leave it.
 */
export function ShrinePanel({
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
  const view = shrineView(run, ctx, company);
  return (
    <>
      <LeafHead
        kind="shrine"
        kicker={u(PASSAGE_NAME.shrine)}
        title={u('unwritten.ui.shrine.title')}
        sub={u('unwritten.ui.shrine.sub')}
      />
      <div className={styles.options}>
        <section className={styles.option}>
          <header className={styles.optionHead}>
            <Glyph glyph="glyph.peace_dove" size={30} color="#9fe3c2" />
            <span className={`display ${styles.optionName}`}>{u('unwritten.ui.shrine.rest')}</span>
          </header>
          <p className={styles.optionLine}>
            {u('unwritten.ui.shrine.restLine', { share: Math.round(view.rest * 100) })}
          </p>
          <Button
            variant="primary"
            onClick={() => act(() => unwrittenCommands.shrine({ kind: 'rest' }), 'battle.heal')}
            data-testid="unwritten-shrine-rest"
          >
            {u('unwritten.ui.shrine.rest')}
          </Button>
        </section>

        <section className={styles.option}>
          <header className={styles.optionHead}>
            <Glyph glyph="glyph.phoenix" size={30} color="var(--warn)" />
            <span className={`display ${styles.optionName}`}>{u('unwritten.ui.shrine.rekindle')}</span>
          </header>
          <p className={styles.optionLine}>
            {u('unwritten.ui.shrine.rekindleLine', { share: Math.round(view.rekindle * 100) })}
          </p>
          <div className={styles.targets}>
            {view.fallen.length ? (
              view.fallen.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={styles.target}
                  onClick={() =>
                    act(
                      () => unwrittenCommands.shrine({ kind: 'rekindle', member: member.id }),
                      'battle.revive',
                    )
                  }
                  data-testid={`unwritten-shrine-rekindle-${member.id}`}
                >
                  {translate(member.def.name)}
                </button>
              ))
            ) : (
              <p className={styles.none}>{u('unwritten.ui.shrine.noneFallen')}</p>
            )}
          </div>
        </section>

        <section className={styles.option}>
          <header className={styles.optionHead}>
            <Glyph glyph="glyph.quill" size={30} color="#cbb8ff" />
            <span className={`display ${styles.optionName}`}>{u('unwritten.ui.shrine.reink')}</span>
          </header>
          <p className={styles.optionLine}>{u('unwritten.ui.shrine.reinkLine')}</p>
          <div className={styles.targets}>
            {view.deepenable.length ? (
              view.deepenable.map((held) => (
                <button
                  key={held.def.id}
                  type="button"
                  className={styles.target}
                  onClick={() =>
                    act(
                      () => unwrittenCommands.shrine({ kind: 'reink', inscription: held.def.id }),
                      'unwritten.quill',
                    )
                  }
                  data-testid={`unwritten-shrine-reink-${held.def.id}`}
                >
                  <span>{line(held.def.name, {})}</span>
                  <span>
                    {numeral(held.level)} → {numeral(held.level + 1)}
                  </span>
                </button>
              ))
            ) : (
              <p className={styles.none}>{u('unwritten.ui.shrine.noneToDeepen')}</p>
            )}
          </div>
        </section>

        <section className={styles.option}>
          <header className={styles.optionHead}>
            <Glyph glyph="glyph.broken_shackle" size={30} color="#d58cff" />
            <span className={`display ${styles.optionName}`}>{u('unwritten.ui.shrine.scrape')}</span>
          </header>
          <p className={styles.optionLine}>{u('unwritten.ui.shrine.scrapeLine')}</p>
          <div className={styles.targets}>
            {view.blots.length ? (
              view.blots.map((blot) => (
                <button
                  key={blot.id}
                  type="button"
                  className={styles.target}
                  onClick={() =>
                    act(() => unwrittenCommands.shrine({ kind: 'scrape', blot: blot.id }), 'ui.confirm')
                  }
                  data-testid={`unwritten-shrine-scrape-${blot.id}`}
                >
                  {line(blot.name, {})}
                </button>
              ))
            ) : (
              <p className={styles.none}>{u('unwritten.ui.shrine.noneBlots')}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

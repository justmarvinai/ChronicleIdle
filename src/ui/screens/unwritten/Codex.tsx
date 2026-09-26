import type { CSSProperties } from 'react';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { InscriptionRow } from './InscriptionCard';
import { INK_COLOUR, INK_NAME, numeral } from './marks';
import { line, u } from './strings';
import type { CodexView } from './unwritten-view';
import styles from './Codex.module.css';

export interface CodexProps {
  codex: CodexView;
  gilt: number;
  pages: number;
  omen: number;
  rerolls: number;
  onAbandon: () => void;
}

/** A relic or a blot as an icon, its name and line on hover. */
function Keepsake({
  icon,
  name,
  text,
  show,
  blot,
}: {
  icon: Parameters<typeof AbilityIcon>[0]['icon'];
  name: string;
  text: string;
  show: Readonly<Record<string, number>>;
  blot?: boolean;
}) {
  return (
    <Tooltip
      maxWidth={320}
      content={
        <span className={styles.tip}>
          <strong className={`display ${blot ? styles.tipBlot : styles.tipName}`}>{line(name, {})}</strong>
          <span>{line(text, show)}</span>
        </span>
      }
    >
      <span
        className={[styles.keepsake, blot ? styles.blot : ''].join(' ')}
        tabIndex={0}
        aria-label={line(name, {})}
      >
        <AbilityIcon icon={icon} label={line(name, {})} size={50} passive decorative />
      </span>
    </Tooltip>
  );
}

/**
 * The codex (UNWRITTEN.md §7–§9): what the company has written, ink by ink with how near each is
 * to lighting up; the blends; the relics it carries and the blots it suffers; the purse. The whole
 * expedition's build, read at a glance — and the one place to walk away from it.
 */
export function Codex({ codex, gilt, pages, omen, rerolls, onAbandon }: CodexProps) {
  return (
    <section className={styles.codex} data-testid="unwritten-codex">
      <header className={styles.purse}>
        <span className={styles.stat} data-testid="unwritten-gilt">
          <Glyph glyph="glyph.coin_purse" size={24} color="var(--gold-3)" />
          <span className={styles.value}>{gilt}</span>
          <span className={styles.label}>{u('unwritten.ui.codex.gilt')}</span>
        </span>
        <span className={styles.stat} data-testid="unwritten-run-pages">
          <Glyph glyph="glyph.burning_scroll" size={24} color="#cbb8ff" />
          <span className={styles.value}>{pages}</span>
          <span className={styles.label}>
            {codex.pagesMult > 1
              ? u('unwritten.ui.codex.pagesMult', { mult: codex.pagesMult.toFixed(2) })
              : u('unwritten.ui.codex.pages')}
          </span>
        </span>
        <span className={styles.omen}>{u('unwritten.ui.codex.omen', { omen: numeral(omen) })}</span>
      </header>

      <ScrollArea height="100%" fade className={styles.scroll ?? ''}>
        <div className={styles.inks}>
          {codex.inks.map((ink) => (
            <section
              key={ink.ink}
              className={[styles.ink, ink.tier > 0 ? styles.lit : ''].join(' ')}
              style={{ '--ink': INK_COLOUR[ink.ink] } as CSSProperties}
              data-testid={`unwritten-ink-${ink.ink}`}
            >
              <header className={styles.inkHead}>
                <span className={`display ${styles.inkName}`}>{u(INK_NAME[ink.ink])}</span>
                <span className={styles.inkCount}>
                  {ink.next === null
                    ? u('unwritten.ui.codex.full')
                    : u('unwritten.ui.codex.toward', { count: ink.count, next: ink.next })}
                </span>
              </header>
              <span className={styles.pips} aria-hidden="true">
                {[1, 2].map((tier) => (
                  <span
                    key={tier}
                    className={[styles.pip, ink.tier >= tier ? styles.pipLit : ''].join(' ')}
                  />
                ))}
              </span>
              {ink.held.length ? (
                <ul className={styles.held}>
                  {ink.held.map((held) => (
                    <li key={held.def.id}>
                      <InscriptionRow
                        def={held.def}
                        level={held.level}
                        testId={`unwritten-held-${held.def.id}`}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {codex.blends.length ? (
            <section className={styles.ink}>
              <header className={styles.inkHead}>
                <span className={`display ${styles.inkName}`}>{u('unwritten.ui.codex.blends')}</span>
              </header>
              <ul className={styles.held}>
                {codex.blends.map((held) => (
                  <li key={held.def.id}>
                    <InscriptionRow
                      def={held.def}
                      level={held.level}
                      testId={`unwritten-held-${held.def.id}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <section className={styles.shelf}>
          <h3 className={`display ${styles.shelfTitle}`}>
            {u('unwritten.ui.codex.relics', { count: codex.relics.length })}
          </h3>
          {codex.relics.length ? (
            <div className={styles.keepsakes} data-testid="unwritten-relics">
              {codex.relics.map((relic) => (
                <Keepsake
                  key={relic.id}
                  icon={relic.icon}
                  name={relic.name}
                  text={relic.text}
                  show={relic.show}
                />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>{u('unwritten.ui.codex.noRelics')}</p>
          )}
        </section>

        {codex.blots.length ? (
          <section className={styles.shelf}>
            <h3 className={`display ${styles.shelfTitle} ${styles.blotTitle}`}>
              {u('unwritten.ui.codex.blots', { count: codex.blots.length })}
            </h3>
            <div className={styles.keepsakes} data-testid="unwritten-blots">
              {codex.blots.map((blot) => (
                <Keepsake
                  key={blot.id}
                  icon={blot.icon}
                  name={blot.name}
                  text={blot.text}
                  show={blot.show}
                  blot
                />
              ))}
            </div>
          </section>
        ) : null}
      </ScrollArea>

      <footer className={styles.foot}>
        {rerolls > 0 ? (
          <span className={styles.rerolls}>{u('unwritten.ui.codex.rerolls', { count: rerolls })}</span>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={onAbandon} data-testid="unwritten-abandon">
          {u('unwritten.ui.codex.abandon')}
        </Button>
      </footer>
    </section>
  );
}

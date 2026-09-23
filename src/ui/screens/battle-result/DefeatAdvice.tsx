import type { GlyphKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { t, type I18nKey } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import type { Advice, AdviceGo } from './result-view';
import styles from './DefeatAdvice.module.css';

/** Where a team grows between one attempt and the next, one press each. */
export type GrowPlace = 'tavern' | 'champions' | 'portal';
const GROW: readonly { place: GrowPlace; glyph: GlyphKey; name: I18nKey; line: I18nKey }[] = [
  { place: 'tavern', glyph: 'glyph.fist_punch', name: 'hub.tavern', line: 'battleResult.grow.tavern' },
  {
    place: 'champions',
    glyph: 'glyph.shield_block',
    name: 'hub.champions',
    line: 'battleResult.grow.champions',
  },
  { place: 'portal', glyph: 'glyph.spirit_vortex', name: 'hub.portal', line: 'battleResult.grow.portal' },
];

export interface DefeatAdviceProps {
  advice: readonly Advice[];
  /** The line under the advice: what the fight cost, or that a race still counts. */
  note: string | null;
  /** Offer the places a team grows stronger: after a lost stand, not after a boss race. */
  grow: boolean;
  onGo: (go: Exclude<AdviceGo, null> | GrowPlace) => void;
}

/**
 * What to try next (docs/tech/UI_DESIGN.md §5.10): each reason the fight went badly as a card —
 * a glyph, the advice, and where it can be acted on, one press away — over the plain line of what
 * the fight cost.
 */
export function DefeatAdvice({ advice, note, grow, onGo }: DefeatAdviceProps) {
  return (
    <section className={styles.advice} data-testid="result-advice">
      {advice.length ? (
        <>
          <h2 className={`display ${styles.heading}`}>{t('battleResult.adviceTitle')}</h2>
          <ul className={styles.list}>
            {advice.map((item) => {
              const go = item.go;
              return (
                <li key={item.key} className={styles.card} data-testid={`result-advice-${item.key}`}>
                  <span className={styles.glyph} aria-hidden="true">
                    <Glyph glyph={item.glyph} size={26} color="#ffb4a6" />
                  </span>
                  <span className={styles.text}>{t(item.key)}</span>
                  {go ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onGo(go)}
                      data-testid={`result-go-${go}`}
                    >
                      {t(go === 'tavern' ? 'battleResult.go.tavern' : 'battleResult.go.champions')}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {note ? <p className={styles.note}>{note}</p> : null}
      {grow ? (
        <div className={styles.grow}>
          <h3 className={`display ${styles.growTitle}`}>{t('battleResult.grow')}</h3>
          <div className={styles.growRow}>
            {GROW.map((item) => (
              <button
                key={item.place}
                type="button"
                className={styles.growCard}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => {
                  playSfx('ui.confirm');
                  onGo(item.place);
                }}
                data-testid={`result-grow-${item.place}`}
              >
                <Glyph glyph={item.glyph} size={30} color="var(--gold-3)" />
                <span className={`display ${styles.growName}`}>{t(item.name)}</span>
                <span className={styles.growLine}>{t(item.line)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

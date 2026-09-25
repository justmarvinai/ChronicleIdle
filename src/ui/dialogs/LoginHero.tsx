import type { CSSProperties } from 'react';
import { formatDuration } from '@engine/time/clock';
import { t, translate } from '@i18n/index';
import type { LoginView } from '@state/login';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { grantLabel } from '@ui/components/RewardSlots/slots';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import styles from './LoginHero.module.css';

export interface LoginHeroProps {
  view: LoginView;
  /** The day taken since the board opened, which the panel shows sealed. */
  took: number | null;
  onClaim: () => void;
}

/** What the panel is about: today's day to take, the one just taken, or tomorrow's to wait for. */
type HeroMode = 'today' | 'taken' | 'tomorrow';

/**
 * The day in question, large (docs/tech/UI_DESIGN.md §5.27): today's tile with what it pays in full
 * and the one press on the board; once taken, its seal and tomorrow's day under it; and on a later
 * visit the same day, tomorrow's, with the time until it opens. The board beside it shows the round.
 */
export function LoginHero({ view, took, onClaim }: LoginHeroProps) {
  const mode: HeroMode = view.claimable ? 'today' : took !== null ? 'taken' : 'tomorrow';
  const focus = view.tiles.find((tile) => tile.day === (mode === 'taken' ? took : view.pending));
  const next = mode === 'taken' ? view.tiles.find((tile) => tile.day === view.pending) : undefined;
  if (!focus) return null;
  const tier = { '--tier': RARITY_COLOR[focus.def.tier] } as CSSProperties;
  return (
    <Panel
      kind="ember-wide"
      padding={26}
      className={styles.hero}
      contentClassName={styles.body}
      style={tier}
      data-mode={mode}
      data-testid="login-hero"
    >
      <span className={`display ${styles.caption}`}>
        {mode === 'tomorrow' ? t('login.tomorrow') : t('login.today')}
      </span>
      <span className={`display ${styles.dayNo}`}>{t('login.day', { day: focus.day })}</span>
      <span className={`display ${styles.tier}`}>{t(`rarity.${focus.def.tier}`)}</span>
      <span className={styles.rule} aria-hidden="true" />

      <RewardSlots grants={focus.def.rewards} size="lg" muted={mode === 'tomorrow'} />
      <ul className={styles.names}>
        {focus.def.rewards.map((grant) => (
          <li key={grant.kind === 'currency' ? grant.currency : grant.item}>{grantLabel(grant)}</li>
        ))}
      </ul>

      <div className={styles.press}>
        {mode === 'today' ? (
          <Button variant="primary" size="lg" onClick={onClaim} data-testid="login-claim">
            {t('login.claim')}
          </Button>
        ) : mode === 'taken' ? (
          <span className={`display ${styles.seal}`}>{t('login.claimed')}</span>
        ) : (
          <span className={`num ${styles.opens}`}>
            {translate('login.opensIn', { time: formatDuration(view.nextIn) })}
          </span>
        )}
      </div>

      {next ? (
        <div className={styles.next}>
          <span className={styles.nextLead}>
            {translate('login.tomorrowIs', { day: next.day, time: formatDuration(view.nextIn) })}
          </span>
          <RewardSlots grants={next.def.rewards} size="sm" />
        </div>
      ) : (
        <p className={styles.explain}>{t('login.explain')}</p>
      )}
    </Panel>
  );
}

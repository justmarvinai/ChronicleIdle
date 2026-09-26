import { t, translate } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { u } from './strings';
import type { MemberView } from './unwritten-view';
import styles from './CompanyColumn.module.css';

export interface CompanyColumnProps {
  members: readonly MemberView[];
  /** Rekindle tokens left, and the share of HP one raises a fallen champion to. */
  tokens: number;
  tokenShare: number;
  onRekindle: (id: string) => void;
  /** Champions picked for the fight in hand, lit as they are chosen. */
  fielded?: readonly string[];
  onToggle?: (id: string) => void;
}

/**
 * The company (UNWRITTEN.md §4): every champion with the share of their health they carry from
 * passage to passage. The fallen are veiled until something rekindles them; an Echo wears the
 * Unwritten's violet. When a fight is waiting, a champion is sent in or held back from here.
 */
export function CompanyColumn({
  members,
  tokens,
  tokenShare,
  onRekindle,
  fielded,
  onToggle,
}: CompanyColumnProps) {
  const standing = members.filter((m) => !m.fallen).length;
  return (
    <section className={styles.column} data-testid="unwritten-company">
      <header className={styles.head}>
        <h2 className={`display ${styles.title}`}>{u('unwritten.ui.company.title')}</h2>
        <span className={styles.count}>
          {u('unwritten.ui.company.standing', { standing, total: members.length })}
        </span>
      </header>
      <ol className={styles.grid}>
        {members.map((member) => {
          const seat = fielded ? fielded.indexOf(member.id) : -1;
          const pickable = !!onToggle && !member.fallen;
          return (
            <li
              key={member.id}
              className={[
                styles.member,
                member.fallen ? styles.fallen : '',
                member.echo ? styles.echo : '',
              ].join(' ')}
              data-testid={`unwritten-member-${member.id}`}
            >
              <span className={styles.card}>
                <ChampionCard
                  name={translate(member.def.name)}
                  rarity={member.def.rarity}
                  element={member.def.element}
                  role={member.def.role}
                  stars={member.stars}
                  level={member.level}
                  avatar={member.def.art.avatar}
                  tint={member.def.art.tint}
                  placeholder={member.def.art.placeholder}
                  placeholderLabel={t('champions.placeholder')}
                  size={96}
                  selected={seat >= 0}
                  badge={member.echo ? u('unwritten.ui.company.echo') : null}
                  {...(pickable ? { onClick: () => onToggle(member.id) } : {})}
                  testId={`unwritten-member-card-${member.id}`}
                />
                {seat >= 0 ? (
                  <span className={`num ${styles.seat} ${seat === 0 ? styles.lead : ''}`} aria-hidden="true">
                    {seat + 1}
                  </span>
                ) : null}
                {member.fallen ? (
                  <span className={styles.veil} aria-hidden="true">
                    <Glyph glyph="glyph.skull_wreath" size={34} color="#c9b6ff" />
                  </span>
                ) : null}
              </span>
              <span className={styles.name}>{translate(member.def.name)}</span>
              {member.fallen ? (
                <span className={styles.fallenRow}>
                  <span className={styles.fallenText}>{u('unwritten.ui.company.fallen')}</span>
                  {tokens > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRekindle(member.id)}
                      data-testid={`unwritten-rekindle-${member.id}`}
                    >
                      {u('unwritten.ui.company.rekindle')}
                    </Button>
                  ) : null}
                </span>
              ) : (
                <Bar
                  value={Math.round(member.hp * 100)}
                  max={100}
                  kind="health"
                  height={14}
                  label={`${Math.round(member.hp * 100)}%`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {tokens > 0 ? (
        <p className={styles.tokens} data-testid="unwritten-tokens">
          <Glyph glyph="glyph.phoenix" size={20} color="var(--warn)" />
          {u('unwritten.ui.company.tokens', { tokens, share: Math.round(tokenShare * 100) })}
        </p>
      ) : null}
    </section>
  );
}

import { t } from '@i18n/index';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import type { FoodEntry } from './tavern-view';
import styles from './RankSpares.module.css';

export interface RankSparesProps {
  /** Every free champion of the star tier the rank-up asks for, cheapest first. */
  spares: readonly FoodEntry[];
  seated: readonly string[];
  seats: number;
  foodStars: number;
  onToggle: (instanceId: string) => void;
}

/** A card's row in the strip (a 96 px card is 123 px tall, plus the gap), and the most rows shown before it scrolls. */
const ROW = 131;
const ROWS_SHOWN = 2;
const PER_ROW = 6;

/**
 * The rank-up's larder under the champion (docs/tech/UI_DESIGN.md §5.5): every free champion of
 * the star tier asked for, one click to seat it and another to take it back — the picker's list,
 * laid out where the seats can see it.
 */
export function RankSpares({ spares, seated, seats, foodStars, onToggle }: RankSparesProps) {
  const full = seated.length >= seats;
  return (
    <section
      className={styles.spares}
      data-testid="tavern-spares"
      aria-label={t('tavern.rank.free', { stars: foodStars })}
    >
      <header className={styles.head}>
        <span className={`display ${styles.title}`}>{t('tavern.rank.free', { stars: foodStars })}</span>
        <span className={`num ${styles.count}`}>{t('tavern.rank.freeCount', { count: spares.length })}</span>
      </header>
      {spares.length === 0 ? (
        <p className={styles.none}>{t('tavern.rank.freeNone', { stars: foodStars })}</p>
      ) : (
        <ScrollArea
          height={Math.min(ROWS_SHOWN, Math.ceil(spares.length / PER_ROW)) * ROW + 8}
          className={styles.scroll}
        >
          <div className={styles.grid}>
            {spares.map((entry) => {
              const id = entry.instance.instanceId;
              const isSeated = seated.includes(id);
              return (
                <ChampionCard
                  key={id}
                  name={entry.name}
                  rarity={entry.def.rarity}
                  element={entry.def.element}
                  role={entry.def.role}
                  stars={entry.instance.stars}
                  level={entry.instance.level}
                  avatar={entry.def.art.avatar}
                  tint={entry.def.art.tint}
                  placeholder={entry.def.art.placeholder}
                  placeholderLabel={t('champions.placeholder')}
                  size={96}
                  selected={isSeated}
                  dimmed={!isSeated && full}
                  onClick={() => onToggle(id)}
                  testId={`tavern-spare-${id}`}
                />
              );
            })}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

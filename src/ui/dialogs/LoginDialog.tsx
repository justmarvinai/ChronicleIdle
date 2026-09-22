import { useState } from 'react';
import { playSfx } from '@audio/index';
import { LOGIN_FINALE_FROM } from '@content/balance/login';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { loginView } from '@state/login';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { useNow } from '@ui/hooks/useNow';
import { contentsLines, grantAmounts } from '@ui/screens/market/market-view';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import styles from './LoginDialog.module.css';

/** The board's tiers borrow gear's rarity colours, which a player already reads fluently. */
const TIER_COLOR = {
  common: RARITY_COLOR.common,
  uncommon: RARITY_COLOR.uncommon,
  rare: RARITY_COLOR.rare,
  epic: RARITY_COLOR.epic,
  legendary: RARITY_COLOR.legendary,
} as const;

/**
 * The Standing Welcome (docs/tech/UI_DESIGN.md §5.27): thirty tiles, today's one pressable.
 *
 * The line under the title is the whole design in a sentence — **a day is a day you came**, so
 * missing one costs nothing. Saying it on the board matters: a player who has met a login calendar
 * before will assume there is a streak to protect, and will feel punished by a day they missed
 * that in fact cost them nothing.
 */
export function LoginDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const now = useNow(1000);
  const [took, setTook] = useState<number | null>(null);
  if (!save) return null;
  const view = loginView(save, now);

  return (
    <Dialog title={t('login.title')} onClose={onClose} width={960} testId="dialog-login">
      <div className={styles.head}>
        <p className={styles.subtitle}>{t('login.explain')}</p>
        <span className={`num ${styles.cycle}`} data-testid="login-cycle">
          {t('login.cycle', { cycle: view.cycle })}
        </span>
      </div>

      <ScrollArea height={470}>
        <div className={styles.board} data-testid="login-board">
          {view.tiles.map((tile) => {
            const finale = tile.day >= LOGIN_FINALE_FROM;
            return (
              <div
                key={tile.day}
                className={styles.tile}
                data-testid={`login-day-${tile.day}`}
                data-today={tile.today}
                data-taken={tile.taken}
                data-finale={finale}
                style={{ '--tier': TIER_COLOR[tile.def.tier] } as React.CSSProperties}
              >
                <span className={`num ${styles.day}`}>{t('login.day', { day: tile.day })}</span>
                <div className={styles.reward}>
                  {grantAmounts(tile.def.rewards).length > 0 ? (
                    <RewardList amounts={grantAmounts(tile.def.rewards)} size={26} />
                  ) : null}
                  {/* A tile that pays an item names it: an icon alone would be a guess. */}
                  {tile.def.rewards.some((grant) => grant.kind === 'consumable') ? (
                    <span className={styles.item}>
                      {contentsLines(tile.def.rewards.filter((g) => g.kind === 'consumable')).join(', ')}
                    </span>
                  ) : null}
                </div>
                {tile.taken ? (
                  <span className={styles.taken}>{t('login.claimed')}</span>
                ) : tile.today ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const result = actions.claimLoginDay();
                      if (!result.ok) {
                        playSfx('ui.error');
                        return;
                      }
                      playSfx('reward.large');
                      setTook(result.value.day);
                    }}
                    data-testid="login-claim"
                  >
                    {t('login.claim')}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <p className={`num ${styles.foot}`} data-testid="login-foot">
        {took !== null
          ? t('login.tookIt', { day: took })
          : view.claimable
            ? t('login.finale')
            : t('login.nextIn', { time: formatDuration(view.nextIn) })}
      </p>
    </Dialog>
  );
}

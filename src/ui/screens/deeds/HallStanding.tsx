import { motion } from 'motion/react';
import type { ChampionId } from '@content/champions/types';
import type { HallView, RankView } from '@engine/deeds/hall';
import { t, translate } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { FramedPortrait } from '@ui/components/Portrait/FramedPortrait';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { useAnimatedNumber } from '@ui/hooks/useAnimatedNumber';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { rankExtras, rankShare } from './deed-view';
import styles from './HallStanding.module.css';

export interface HallStandingProps {
  view: HallView;
  name: string;
  title: string | null;
  avatarChampionId: ChampionId | null;
  frameId: string | null;
  onClaimRank: () => void;
}

/** The portrait at the head of the column, in stage pixels. */
const PORTRAIT_WIDTH = 136;
const PORTRAIT_HEIGHT = 150;
const PORTRAIT_THICKNESS = 10;
/** The renown ticks up over this long when a claim lands. */
const RENOWN_TICK_MS = 700;
/** The ladder's height inside the column. */
const LADDER_HEIGHT = 470;

/**
 * The chronicle's standing in the Hall (docs/tech/UI_DESIGN.md §5.31): the chronicler in the frame
 * they wear, the renown claimed and the rank it stands on, how far the next rank is, the press that
 * claims a rank once it is reached — and the ten ranks as a ladder, each with what it pays and the
 * frame or the title it hangs up.
 */
export function HallStanding({
  view,
  name,
  title,
  avatarChampionId,
  frameId,
  onClaimRank,
}: HallStandingProps) {
  const renown = useAnimatedNumber(view.renown, RENOWN_TICK_MS);
  const current = view.ranks.find((rank) => rank.def.rank === view.rank) ?? null;
  const waiting = view.next && view.renown >= view.next.renown ? view.next : null;
  const standing = !view.next
    ? t('deeds.rank.all')
    : waiting
      ? t('deeds.rank.waiting', { name: translate(waiting.name) })
      : t('deeds.rank.toNext', {
          renown: (view.next.renown - view.renown).toLocaleString('en-US'),
          name: translate(view.next.name),
        });
  return (
    <Panel kind="ember-wide" padding={20} className={styles.panel} contentClassName={styles.body}>
      <div className={styles.crest}>
        <FramedPortrait
          avatarChampionId={avatarChampionId}
          frameId={frameId}
          width={PORTRAIT_WIDTH}
          height={PORTRAIT_HEIGHT}
          thickness={PORTRAIT_THICKNESS}
          testId="deeds-portrait"
        />
        <div className={styles.who}>
          <span className={`display ${styles.name}`}>{name}</span>
          {title ? <span className={`display ${styles.title}`}>{title}</span> : null}
          <motion.span
            key={view.rank}
            className={`display ${styles.rank}`}
            data-testid="deeds-rank"
            initial={prefersReducedMotion() || view.rank === 0 ? false : { scale: 1.3, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {current ? translate(current.def.name) : t('deeds.unranked')}
          </motion.span>
          <span className={styles.rankOf}>
            {t('deeds.rankOf', { rank: view.rank, ranks: view.ranks.length })}
          </span>
        </div>
      </div>

      <div className={styles.renownRow}>
        <span className={styles.renownLabel}>
          <Glyph glyph="glyph.trophy_cup" size={20} color="var(--gold-2)" />
          {t('deeds.renown')}
        </span>
        <span className={`num ${styles.renown}`} data-testid="deeds-renown">
          {Math.round(renown).toLocaleString('en-US')}
        </span>
      </div>
      <Bar value={rankShare(view)} max={1} kind="xp" height={12} label={standing} />
      <span className={styles.standing} data-waiting={waiting !== null}>
        {standing}
      </span>
      {waiting ? (
        <Button
          variant="primary"
          size="md"
          className={styles.claimRank ?? ''}
          icon={<Glyph glyph="glyph.trophy_cup" size={22} color="var(--gold-3)" />}
          onClick={onClaimRank}
          data-testid="deeds-claim-rank"
        >
          {t('deeds.rank.claim')}
        </Button>
      ) : null}

      <h3 className={`display ${styles.ladderTitle}`}>{t('deeds.ranks')}</h3>
      <ScrollArea height={LADDER_HEIGHT} fade className={styles.ladder ?? ''} data-testid="deeds-ranks">
        <ol className={styles.rungs}>
          {view.ranks.map((rank) => (
            <Rung key={rank.def.id} rank={rank} />
          ))}
        </ol>
      </ScrollArea>
    </Panel>
  );
}

/** One rank on the ladder: its number on a seal, its name, its purse and where it stands. */
function Rung({ rank }: { rank: RankView }) {
  const extras = rankExtras(rank.def.rank);
  return (
    <li className={styles.rung} data-state={rank.status} data-testid={`deeds-rank-${rank.def.rank}`}>
      <span className={`num ${styles.seal}`}>{rank.def.rank}</span>
      <span className={styles.rungBody}>
        <span className={styles.rungHead}>
          <span className={`display ${styles.rungName}`}>{translate(rank.def.name)}</span>
          <span className={`num ${styles.rungRenown}`}>
            {t('deeds.rank.renown', { renown: rank.def.renown.toLocaleString('en-US') })}
          </span>
        </span>
        <span className={styles.rungPays}>
          <RewardSlots amounts={rank.def.rewards} size="sm" muted={rank.status === 'claimed'} />
          {extras.frames.map((frame) => (
            <span key={frame.id} className={styles.extra} style={{ color: frame.tint }}>
              {t('deeds.rank.frame', { frame: translate(frame.name) })}
            </span>
          ))}
          {extras.titles.map((title) => (
            <span key={title.id} className={styles.extra}>
              {t('deeds.rank.title', { title: translate(title.name) })}
            </span>
          ))}
        </span>
      </span>
      {rank.status === 'claimed' ? (
        <Glyph glyph="glyph.shield_block" size={22} color="#9ec79b" className={styles.mark ?? ''} />
      ) : null}
    </li>
  );
}

import type { ReactNode } from 'react';
import { imageUrl } from '@assets/manifest';
import type { GlyphKey } from '@assets/manifest.generated';
import { t, translate, type I18nKey } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { FramedPortrait } from '@ui/components/Portrait/FramedPortrait';
import { awayLabel, type ChronicleCardView } from './title-view';
import styles from './ChronicleCard.module.css';

/**
 * The chronicle saved on this device, as the title screen shows it (docs/tech/UI_DESIGN.md §5.1): a
 * save slot you pick up rather than a line under a button. The chronicler in their worn frame with
 * the level on a gem, their name and title, how far the chronicle has come, when it was last played
 * — and Continue, which belongs to it.
 */
export function ChronicleCard({ view, onContinue }: { view: ChronicleCardView; onContinue: () => void }) {
  const away = view.awayMs === null ? null : awayLabel(view.awayMs);
  const campaign = view.campaign
    ? t('title.card.campaignStage', {
        stage: `${view.campaign.settlement}-${view.campaign.stage}`,
        difficulty: t(`campaign.difficulty.${view.campaign.difficulty}` as I18nKey),
      })
    : t('title.card.campaignDone');
  return (
    <Panel kind="ember-wide" padding={22} className={styles.card} data-testid="title-chronicle">
      <div className={styles.body}>
        <div className={styles.portraitWrap}>
          <FramedPortrait
            avatarChampionId={view.avatarChampionId}
            frameId={view.frameId}
            width={148}
            height={148}
            thickness={12}
          />
          <span className={`num ${styles.levelGem}`} data-testid="title-chronicle-level">
            {view.level}
          </span>
        </div>
        <div className={styles.who}>
          <span className={`display ${styles.kicker}`}>{t('title.card.kicker')}</span>
          <span className={`display ${styles.name}`} data-testid="title-chronicle-name">
            {view.name}
          </span>
          {view.titleName ? (
            <span className={`display ${styles.title}`} data-testid="title-chronicle-title">
              {translate(view.titleName)}
            </span>
          ) : null}
          <span className={styles.xp} aria-hidden="true">
            <span className={styles.xpFill} style={{ width: `${Math.round(view.xp * 100)}%` }} />
          </span>
          <span className={`num ${styles.xpLine}`}>
            {view.xpLine
              ? t('title.card.xp', {
                  xp: view.xpLine.now.toLocaleString('en-US'),
                  next: view.xpLine.next.toLocaleString('en-US'),
                  level: view.level + 1,
                })
              : t('title.card.xpMax')}
          </span>
        </div>
      </div>
      <div className={styles.stats}>
        <Stat
          glyph="glyph.crossed_swords"
          label={t('title.card.power')}
          testId="title-chronicle-power"
          value={view.power.toLocaleString('en-US')}
        />
        <Stat
          glyph="glyph.cloaked_figure"
          label={t('title.card.champions')}
          testId="title-chronicle-champions"
          value={String(view.champions)}
        />
        <Stat
          glyph="glyph.sword_clash"
          label={t('title.card.campaign')}
          testId="title-chronicle-campaign"
          value={campaign}
        />
      </div>
      <div className={styles.foot}>
        {away ? (
          <span className={styles.away} data-testid="title-chronicle-away">
            <Glyph glyph="glyph.hourglass" size={15} className={styles.awayGlyph ?? ''} />
            {away.key === 'now'
              ? t('title.card.away.now')
              : t(`title.card.away.${away.key}` as I18nKey, { count: away.count })}
          </span>
        ) : (
          <span />
        )}
        <Button
          variant="primary"
          size="lg"
          className={styles.continue}
          onClick={onContinue}
          data-testid="btn-continue"
        >
          {t('title.continue')}
        </Button>
      </div>
    </Panel>
  );
}

function Stat({
  glyph,
  label,
  value,
  testId,
}: {
  glyph: GlyphKey;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className={styles.stat} data-testid={testId}>
      <Glyph glyph={glyph} size={20} className={styles.statGlyph ?? ''} />
      <span className={styles.statText}>
        <span className={`display ${styles.statLabel}`}>{label}</span>
        <span className={`num ${styles.statValue}`}>{value}</span>
      </span>
    </div>
  );
}

/**
 * The same slot on a device with no chronicle yet: what the game is in one line, and the way in.
 * Importing is offered beside it, so a player moving from another device finds it where they look.
 */
export function FirstChronicleCard({ children }: { children: ReactNode }) {
  return (
    <Panel kind="ember-wide" padding={24} className={styles.card} data-testid="title-first">
      <div className={styles.first}>
        <span className={styles.firstMark} aria-hidden="true">
          <span className={styles.firstDisc} />
          <img
            className={styles.firstRing}
            src={imageUrl('ui.dark_ember.frame_round_lg')}
            alt=""
            draggable={false}
          />
          <Glyph glyph="glyph.quill" size={42} className={styles.firstGlyph ?? ''} />
        </span>
        <div className={styles.firstText}>
          <span className={`display ${styles.kicker}`}>{t('title.first.kicker')}</span>
          <span className={`display ${styles.firstTitle}`}>{t('title.first.title')}</span>
          <p className={styles.firstBody}>{t('title.first.body')}</p>
        </div>
      </div>
      <div className={styles.firstAction}>{children}</div>
    </Panel>
  );
}

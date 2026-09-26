import { useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { bossEncounterId } from '@engine/bosses/encounter';
import { formatDuration } from '@engine/time/clock';
import { t, translate } from '@i18n/index';
import { bossView, type BossView } from '@state/bosses';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { RecordsPanel } from './RecordsPanel';
import { openingTier } from './boss-view';
import { TierCard } from './TierCard';
import styles from './BossScreen.module.css';

type BossRoute = Extract<Route, { name: 'bosses' }>;

/** Lantern light on the dungeon gate. */
const GATE_GLOWS = [
  { x: 420, y: 520, size: 200, color: 0xff9a3c, flicker: 0.5 },
  { x: 1500, y: 470, size: 180, color: 0x8fd0ff, flicker: 0.3 },
];

/**
 * The boss gate (docs/design/BOSSES.md §4, `UI_DESIGN.md` §5.13): records on the left, a card per
 * tier on the right with the period's damage against its pool and the chests that damage has
 * earned, and one press at the bottom that spends a key.
 */
export default function BossScreen({ route }: ScreenProps) {
  const params = route as BossRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // The reset ticks in the header; a minute's resolution is plenty for a day-long period.
  const now = useNow(30_000);
  useSceneAudio('boss', 'interior');

  const bosses = content.bosses;
  const [bossId, setBossId] = useState(() => params.boss ?? bosses[0]?.id ?? '');
  const view: BossView | null = save ? bossView(save, bossId, now) : null;
  // No effect fills this in: an unset tier reads as the one the chronicle is working on (BOSSES.md §4).
  const [tierId, setTierId] = useState(() => params.tier ?? '');

  if (!save || !view) return null;
  const selected = view.tiers.find((entry) => entry.tier.id === tierId) ?? openingTier(view);
  const boss = view.boss;

  const claim = (tier: string, pct: number): void => {
    const result = actions.claimBossChest(boss.id, tier, pct);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.medium');
    const paid = result.value;
    actions.toast('reward', 'bosses.chestTaken', { pct: paid.pct });
    if (paid.gearLost) actions.toast('error', 'bosses.chestGearLost');
  };

  const fight = (): void => {
    if (!selected) return;
    playSfx('ui.confirm');
    actions.push({ name: 'battle-setup', encounterId: bossEncounterId(boss.id, selected.tier.id) });
  };

  return (
    <div className={styles.root} data-testid="screen-bosses">
      <Backdrop asset={boss.backdrop} grade="rgba(18, 12, 10, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" glows={GATE_GLOWS} />
      <TopBar title={t('bosses.title')} onBack={() => actions.pop()} />

      <div className={styles.left}>
        <Tabs
          // A tab carries the boss's own name: nothing in the game calls them "Daily" and
          // "Weekly" any more, and the Bosses menu that leads here says which is which.
          items={bosses.map((one) => ({
            key: one.id,
            label: translate(one.name),
            testId: `bosses-tab-${one.period}`,
          }))}
          value={boss.id}
          onChange={(id: string) => {
            setBossId(id);
            setTierId('');
          }}
        />
        <RecordsPanel view={view} />
      </div>

      <div className={styles.stage}>
        <div className={styles.nameplate}>
          <h2 className={`display ${styles.name}`}>{t(boss.name as 'boss.gargoyle.name')}</h2>
          <p className={styles.subtitle}>{t(boss.title as 'boss.gargoyle.title')}</p>
        </div>
        <div className={styles.art}>
          <SpriteView
            model={boss.art.model}
            scale={6}
            /*
             * The sheet's own facing, not a fixed "right". Both bosses were drawn facing left in
             * `0.9.2`, and mirroring a finished sheet to satisfy a hardcoded direction is how the
             * Gargoyle ended up looking over its own shoulder — the Bestiary already reads it this
             * way, and the placeholder that used to stand here faced left too, so nothing before
             * now could notice the difference.
             */
            facing={boss.art.facing}
            tint={boss.art.tint}
            desaturate={boss.art.desaturate ?? false}
          />
        </div>
        <div className={styles.headRight}>
          <span className={`num ${styles.timer}`} data-testid="bosses-reset">
            {translate('bosses.resetsIn', { time: formatDuration(view.msUntilReset) })}
          </span>
          <span className={`num ${styles.keys}`} data-testid="bosses-keys">
            {translate('bosses.keys', { keys: view.keysLeft, of: boss.keysPerPeriod })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => actions.openDialog({ name: 'boss-sheet', bossId: boss.id })}
            data-testid="bosses-sheet"
          >
            {t('bosses.sheet')}
          </Button>
        </div>
      </div>

      <div className={styles.right}>
        <ScrollArea height={720} className={styles.tiers}>
          {view.tiers.map((entry) => (
            <TierCard
              key={entry.tier.id}
              boss={boss}
              view={entry}
              selected={entry.tier.id === selected?.tier.id}
              onSelect={() => {
                setTierId(entry.tier.id);
                playSfx('ui.tab');
              }}
              onClaim={(pct) => claim(entry.tier.id, pct)}
            />
          ))}
        </ScrollArea>
      </div>

      <Panel kind="ember-wide" padding={14} className={styles.bottom} contentClassName={styles.bottomRow}>
        <span className={styles.status} data-testid="bosses-status">
          {!view.unlocked
            ? translate('bosses.locked', { level: boss.unlockLevel })
            : view.keysLeft > 0
              ? translate('bosses.ready', {
                  tier: t((selected?.tier.name ?? '') as 'boss.gargoyle.tier.easy'),
                })
              : t('bosses.noKeys')}
        </span>
        <Button
          variant="primary"
          size="lg"
          disabled={!view.unlocked || view.keysLeft <= 0 || !selected}
          icon={<Glyph glyph="glyph.sword_clash" size={28} color="var(--gold-3)" />}
          onClick={fight}
          data-testid="bosses-fight"
        >
          {t('bosses.fight')}
        </Button>
      </Panel>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { duckMusic, playSfx } from '@audio/index';
import { MULTI_PULL, type ShardId } from '@content/balance/summon';
import type { Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { imageUrl } from '@assets/manifest';
import { t, translate } from '@i18n/index';
import { rotationAt } from '@engine/summon/rotation';
import { mercyOf, openChampionChoices, type SummonSummary } from '@state/summon';
import { selectActions, selectPortalUi, selectSave, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { RitualLayer, type RitualControl } from '@render/summon/RitualLayer';
import type { RitualCue } from '@render/summon/ritualScene';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { championName, shardViews } from '@ui/summon/portal-view';
import { BannerPanel } from './BannerPanel';
import { RevealOverlay } from './RevealOverlay';
import styles from './PortalScreen.module.css';
import { ShardRail } from './ShardRail';

type PortalRoute = Extract<Route, { name: 'portal' }>;

/** Which reveal sound a rarity gets (SUMMONING.md §5.2). */
const REVEAL_SOUND = {
  common: 'summon.reveal.common',
  uncommon: 'summon.reveal.common',
  rare: 'summon.reveal.rare',
  epic: 'summon.reveal.epic',
  legendary: 'summon.reveal.legendary',
  mythic: 'summon.reveal.mythic',
} as const satisfies Record<Rarity, string>;

/**
 * The Summoning Portal (docs/tech/UI_DESIGN.md §5.12, SUMMONING.md): shards on the left, the gate
 * in the middle, the banner and its mercy on the right, and the two presses along the bottom.
 */
export default function PortalScreen({ route }: ScreenProps) {
  const params = route as PortalRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const wallet = useGameStore(selectWallet);
  const ui = useGameStore(selectPortalUi);
  const ritual = useRef<RitualControl>(null);
  const [press, setPress] = useState<SummonSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reduced = prefersReducedMotion();
  // The rotation's countdown ticks in the panel; a minute's resolution is plenty for a 14-day wheel.
  const now = useNow(30_000);
  useSceneAudio('summon', 'interior');

  // A deep link (`{ name: 'portal', banner }`) sets the tab once; after that the rail remembers.
  useEffect(() => {
    if (params.banner) actions.setPortalSelection({ bannerId: params.banner });
  }, [params.banner, actions]);

  const banner = content.bannerById(ui.bannerId) ?? content.banners[0];
  const shard = ui.shard;
  const shards = shardViews(wallet);
  const view = shards.find((one) => one.shard === shard) ?? shards[0];
  const rotation = banner ? rotationAt(banner, now) : null;
  const mercy = save && banner ? mercyOf(save, banner, shard, now) : [];
  const choices = save ? openChampionChoices(save) : [];
  const held = (currency: string): number => wallet?.[currency as 'gold'] ?? 0;
  const shardsHeld = view?.held ?? 0;
  const shardUrl = view ? imageUrl(view.icon, 256) : '';

  const cue = useCallback((moment: RitualCue, rarity: Rarity): void => {
    if (moment === 'charge') playSfx('summon.charge');
    else if (moment === 'crack') playSfx('summon.crack');
    else {
      // The rarest pulls get the room to themselves for a moment.
      if (rarity === 'legendary' || rarity === 'mythic') duckMusic(0.35, 2200);
      playSfx(REVEAL_SOUND[rarity]);
    }
  }, []);

  // The ritual callback must not change between presses (it drives the overlay's effect), so the
  // shard's icon is read through a ref rather than captured.
  const shardUrlRef = useRef(shardUrl);
  useEffect(() => {
    shardUrlRef.current = shardUrl;
  }, [shardUrl]);
  const runRitual = useCallback(async (rarity: Rarity): Promise<void> => {
    await ritual.current?.reveal(rarity, shardUrlRef.current);
  }, []);

  // The chosen shard hangs in the ring while the gate waits (SUMMONING.md §5).
  useEffect(() => {
    if (shardUrl !== '') ritual.current?.hover(shardUrl);
  }, [shardUrl, press]);

  const summon = (count: number): void => {
    if (!banner) return;
    const result = actions.summonChampions(banner.id, shard, count);
    if (!result.ok) {
      playSfx('ui.error');
      setError(
        shardsHeld < count
          ? translate('portal.needTen', { count: shardsHeld })
          : translate('portal.needShards', { shard: view?.name ?? shard }),
      );
      return;
    }
    setError(null);
    setPress(result.value);
  };

  const exchange = (count: number): void => {
    const result = actions.exchangeShards(shard, count);
    if (!result.ok) {
      playSfx('ui.error');
      setError(t('portal.exchange.tooPoor'));
      return;
    }
    setError(null);
    playSfx('reward.small');
    actions.toast('reward', 'portal.exchange.bought', { shard: view?.name ?? shard });
  };

  return (
    <div className={styles.root} data-testid="screen-portal">
      <Backdrop asset="bg.bg9" grade="rgba(30, 14, 52, 0.45)" parallax={8} />
      <AmbientLayer preset="interior" glows={PORTAL_GLOWS} />
      <TopBar title={t('portal.title')} onBack={() => actions.pop()} />

      <ShardRail
        shards={shards}
        selected={shard}
        onSelect={(next: ShardId) => actions.setPortalSelection({ shard: next })}
      />

      <div className={styles.gate}>
        <RitualLayer ref={ritual} hooks={{ cue }} particles={reduced ? 0 : 46} reducedMotion={reduced} />
      </div>

      <div className={styles.right}>
        <Tabs
          items={content.banners.map((one) => ({
            key: one.id,
            label: t(`portal.tab.${one.kind}` as 'portal.tab.standard'),
            testId: `portal-tab-${one.kind}`,
          }))}
          value={banner?.id ?? ''}
          onChange={(id: string) => actions.setPortalSelection({ bannerId: id })}
        />
        {banner && view ? (
          <BannerPanel
            banner={banner}
            rotation={rotation}
            shard={view}
            mercy={mercy}
            held={held}
            onRates={() => actions.openDialog({ name: 'summon-rates', bannerId: banner.id })}
            onHistory={() => actions.openDialog({ name: 'summon-history' })}
            onExchange={exchange}
          />
        ) : null}
      </div>

      <Panel kind="ember-wide" padding={14} className={styles.bottom} contentClassName={styles.bottomRow}>
        {choices[0] ? (
          <Button
            variant="secondary"
            className={styles.choice}
            onClick={() => actions.openDialog({ name: 'champion-picker', choiceId: choices[0]?.id ?? '' })}
            data-testid="portal-choice"
          >
            {t('portal.choice.take')}
          </Button>
        ) : null}
        <span className={styles.status} data-testid="portal-status">
          {error ?? translate('portal.status', { shard: view?.short ?? shard, count: shardsHeld })}
        </span>
        <Button size="lg" disabled={shardsHeld < 1} onClick={() => summon(1)} data-testid="portal-summon-1">
          {t('portal.summonOne')}
        </Button>
        <Button
          size="lg"
          disabled={shardsHeld < MULTI_PULL}
          onClick={() => summon(MULTI_PULL)}
          data-testid="portal-summon-10"
        >
          {t('portal.summonTen')}
        </Button>
      </Panel>

      {press ? (
        <RevealOverlay
          key={press.best.instance.instanceId}
          summary={press}
          ritual={runRitual}
          skipRitual={() => ritual.current?.skip()}
          shardsLeft={shardsHeld}
          onAgain={() => {
            const count = press.pulls.length;
            setPress(null);
            summon(count);
          }}
          onView={(instanceId) => {
            actions.markSeen([instanceId]);
            setPress(null);
            actions.push({ name: 'champions', instanceId });
          }}
          onClose={() => {
            playSfx('ui.close');
            actions.toast(
              'reward',
              press.pulls.length > 1 ? 'summon.toast.many' : 'summon.toast.one',
              press.pulls.length > 1
                ? { best: championName(press.best.record.championId) }
                : { name: championName(press.best.record.championId) },
            );
            setPress(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** The gate's own light: the violet ring and the braziers either side of it. */
const PORTAL_GLOWS = [
  { x: 960, y: 470, size: 260, color: 0x9b5de5, flicker: 0.3 },
  { x: 560, y: 720, size: 120, color: 0xff9a3c, flicker: 0.5 },
  { x: 1360, y: 720, size: 120, color: 0xff9a3c, flicker: 0.5 },
];

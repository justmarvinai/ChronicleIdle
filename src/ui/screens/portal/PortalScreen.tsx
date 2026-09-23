import { useCallback, useEffect, useRef, useState } from 'react';
import { duckMusic, playSfx } from '@audio/index';
import type { ShardId } from '@content/balance/summon';
import { RARITIES, type Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import { rotationAt } from '@engine/summon/rotation';
import { mercyOf, openChampionChoices, type SummonSummary } from '@state/summon';
import { selectActions, selectPortalUi, selectSave, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { RitualLayer, type RitualControl } from '@render/summon/RitualLayer';
import { tellRate } from '@render/summon/choreography';
import { RING, type RitualCue, type RitualCueInfo } from '@render/summon/ritualScene';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { SHARD_HEX } from '@ui/styles/display-maps';
import { championName, shardViews } from '@ui/summon/portal-view';
import { BannerPanel } from './BannerPanel';
import { GatePlate } from './GatePlate';
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
 * Where the ritual's sounds sit in the mix: a tell's crack under its chime, the music all but gone
 * for the held breath, and pulled back under a Legendary or Mythic burst so it has the room.
 */
const RITUAL_MIX = {
  crack: 0.5,
  stall: { factor: 0.2, ms: 1400 },
  rarest: { factor: 0.35, ms: 2200 },
} as const;

/**
 * The Summoning Portal (docs/tech/UI_DESIGN.md §5.12, SUMMONING.md): shards on the left, the gate
 * in the middle with the chosen shard's crystal in its ring and the two presses under it, and the
 * banner — its chances, its mercy, the Exchange — on the right.
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

  const cue = useCallback((moment: RitualCue, { rarity }: RitualCueInfo): void => {
    switch (moment) {
      case 'charge':
        playSfx('summon.charge');
        break;
      case 'tell':
        // One whole tone per rarity up the ladder: gold always rings the same bright note.
        playSfx('summon.tell', { rate: tellRate(RARITIES.indexOf(rarity)) });
        playSfx('summon.crack', { volume: RITUAL_MIX.crack });
        break;
      case 'stall':
        // The held breath: the music drops away and the heartbeat is all there is.
        duckMusic(RITUAL_MIX.stall.factor, RITUAL_MIX.stall.ms);
        playSfx('summon.stall');
        break;
      case 'windup':
        playSfx('summon.windup');
        break;
      case 'burst':
        // The rarest pulls get the room to themselves for a moment.
        if (rarity === 'legendary' || rarity === 'mythic')
          duckMusic(RITUAL_MIX.rarest.factor, RITUAL_MIX.rarest.ms);
        playSfx('summon.shatter');
        playSfx(REVEAL_SOUND[rarity]);
        break;
    }
  }, []);

  // The ritual callback must not change between presses (it drives the overlay's effect), so the
  // pressed shard is read through a ref rather than captured.
  const shardRef = useRef(shard);
  useEffect(() => {
    shardRef.current = shard;
  }, [shard]);
  const runRitual = useCallback(async (rarity: Rarity): Promise<void> => {
    await ritual.current?.reveal(rarity, shardRef.current);
  }, []);

  // The cards are put away: the gate lets its afterglow go and forms the next crystal.
  useEffect(() => {
    if (press === null) ritual.current?.rest();
  }, [press]);

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

  const owed = choices[0];

  return (
    <div
      className={styles.root}
      data-testid="screen-portal"
      style={{ ['--ring-x' as string]: `${RING.x}px`, ['--ring-y' as string]: `${RING.y}px` }}
    >
      <Backdrop asset="bg.bg9" grade="rgba(30, 14, 52, 0.45)" parallax={8} />
      <AmbientLayer preset="interior" glows={PORTAL_GLOWS} />
      <TopBar title={t('portal.title')} onBack={() => actions.pop()} />

      <ShardRail
        shards={shards}
        selected={shard}
        onSelect={(next: ShardId) => actions.setPortalSelection({ shard: next })}
        owed={
          owed ? { reason: translate('portal.choice.owed', { reason: t(owed.reason as I18nKey) }) } : null
        }
        onClaim={() => actions.openDialog({ name: 'champion-picker', choiceId: owed?.id ?? '' })}
      />

      <div className={styles.gate}>
        <RitualLayer
          ref={ritual}
          hooks={{ cue }}
          shard={shard}
          active={press !== null}
          particles={reduced ? 0 : 46}
          reducedMotion={reduced}
        />
      </div>

      {view ? (
        <GatePlate
          view={view}
          status={error ?? translate('portal.status', { shard: view.short, count: shardsHeld })}
          refused={error !== null}
          hidden={press !== null}
          onSummon={summon}
        />
      ) : null}

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

      {press ? (
        <RevealOverlay
          key={press.best.instance.instanceId}
          summary={press}
          ritual={runRitual}
          skipRitual={() => ritual.current?.skip()}
          shardsLeft={shardsHeld}
          shard={{
            icon: view?.icon ?? 'spell.earth_dark_crystal',
            tint: view?.tint ?? null,
            glow: SHARD_HEX[shard],
          }}
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
  { x: RING.x, y: RING.y, size: 260, color: 0x9b5de5, flicker: 0.3 },
  { x: 560, y: 720, size: 120, color: 0xff9a3c, flicker: 0.5 },
  { x: 1360, y: 720, size: 120, color: 0xff9a3c, flicker: 0.5 },
];

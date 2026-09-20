import { useEffect, useRef } from 'react';
import { playSfx, type SoundKey } from '@audio/index';
import type { BattleView } from '@engine/battle/index';
import type { BackdropKey } from '@assets/manifest.generated';
import { createBattleStage, type BattleSound, type BattleStageHandle } from '@render/battle/index';
import { battleController, instantPresenter } from '@state/battle/index';
import styles from './BattleScreen.module.css';

const SOUND: Record<BattleSound, SoundKey> = {
  'attack.melee': 'battle.attack.melee',
  'attack.ranged': 'battle.attack.ranged',
  'cast.justice': 'battle.cast.justice',
  'cast.valor': 'battle.cast.valor',
  'cast.faith': 'battle.cast.faith',
  'cast.eclipse': 'battle.cast.eclipse',
  'hit.light': 'battle.hit.light',
  'hit.heavy': 'battle.hit.heavy',
  'hit.crit': 'battle.hit.crit',
  block: 'battle.block',
  heal: 'battle.heal',
  buff: 'battle.buff',
  debuff: 'battle.debuff',
  death: 'battle.death',
  revive: 'battle.revive',
  wave: 'battle.wave',
  victory: 'battle.victory',
  defeat: 'battle.defeat',
  ultimate: 'battle.ultimate',
  'boss.phase': 'battle.boss.phase',
};

/**
 * How long the fight waits for the stage before playing without it. Long enough for a software
 * renderer on a loaded machine to finish building its context, short enough that a stage which
 * never arrives costs a few seconds rather than the fight.
 */
const STAGE_TIMEOUT_MS = 20_000;

export interface BattleStageMountProps {
  backdrop: BackdropKey;
  initialView: BattleView;
  onCutIn: (unitId: string, abilityId: string, ms: number) => void;
  onStage?: (handle: BattleStageHandle | null) => void;
}

/** Mounts the Pixi stage and hands its presenter to the controller (ui → render → state). */
export function BattleStageMount({ backdrop, initialView, onCutIn, onStage }: BattleStageMountProps) {
  const host = useRef<HTMLDivElement>(null);
  const cutInRef = useRef(onCutIn);
  useEffect(() => {
    cutInRef.current = onCutIn;
  }, [onCutIn]);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let live = true;
    let handle: BattleStageHandle | null = null;
    const reduced = document.documentElement.dataset['reducedMotion'] === 'true';
    /*
     * The controller holds the first turn until a presenter attaches, so nothing is resolved
     * off-screen. That is right while the stage is coming up and wrong if it never does: a WebGL
     * context that hangs rather than fails leaves the fight frozen on a battle screen that never
     * does anything. After this long the fight plays through the HUD instead, which is the same
     * fallback a failed stage already takes.
     */
    const fallback = window.setTimeout(() => {
      if (!live || handle) return;
      console.warn('[battle] stage is still coming up; playing without animation');
      battleController.attachPresenter(instantPresenter);
    }, STAGE_TIMEOUT_MS);
    void createBattleStage(node, {
      backdrop,
      view: initialView,
      embers: reduced ? 0 : 40,
      hooks: {
        sound: (key) => playSfx(SOUND[key]),
        cutIn: (unitId, abilityId, ms) => cutInRef.current(unitId, abilityId, ms),
      },
    })
      .then((created) => {
        window.clearTimeout(fallback);
        if (!live) {
          created.destroy();
          return;
        }
        handle = created;
        battleController.attachPresenter(created.presenter);
        onStage?.(created);
      })
      .catch((error: unknown) => {
        // No stage (WebGL unavailable, asset failure): the fight still plays through the HUD.
        window.clearTimeout(fallback);
        console.error('[battle] stage failed to start; playing without animation', error);
        if (live) battleController.attachPresenter(instantPresenter);
      });
    const onVisibility = (): void =>
      handle?.setPaused(document.hidden || battleController.store.getState().paused);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
      window.clearTimeout(fallback);
      document.removeEventListener('visibilitychange', onVisibility);
      battleController.attachPresenter(null);
      onStage?.(null);
      handle?.destroy();
      node.replaceChildren();
    };
    // The stage lives for the whole battle; the view prop is only its starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdrop]);
  return <div ref={host} className={styles.stage} data-testid="battle-stage" />;
}

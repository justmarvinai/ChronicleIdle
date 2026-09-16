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
        console.error('[battle] stage failed to start; playing without animation', error);
        if (live) battleController.attachPresenter(instantPresenter);
      });
    const onVisibility = (): void =>
      handle?.setPaused(document.hidden || battleController.store.getState().paused);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
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

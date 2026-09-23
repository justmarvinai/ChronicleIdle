import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { towerEncounterId } from '@engine/tower/encounter';
import { t } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { towerView } from '@state/tower';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ClimbPanel } from './ClimbPanel';
import { FloorDossier } from './FloorDossier';
import { TowerLadder } from './TowerLadder';
import { floorDossier } from './tower-view';
import styles from './TowerScreen.module.css';

type TowerRoute = Extract<Route, { name: 'tower' }>;

/**
 * The Eternal Tower (docs/tech/UI_DESIGN.md §5.13a). There are three columns:
 *
 * - on the left, the tower itself: a hundred floors as stone slabs, climbing upward;
 * - in the middle, the dossier of the floor selected on it: who holds it, what it fields, what a
 *   clear pays, and the press its state allows;
 * - on the right, the season's climb, the keys, and the tower's ten keepers.
 *
 * It opens on the floor that matters: the next one to climb, or the one the route named.
 */
export default function TowerScreen({ route }: ScreenProps) {
  const params = route as TowerRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // The key and the season both count down, so the screen ticks once a second like the top bar.
  const now = useNow(1000);
  useSceneAudio('hub', 'interior');
  const view = useMemo(() => (save ? towerView(save, now) : null), [save, now]);
  const [picked, setPicked] = useState<number | null>(params.floor ?? null);
  const selected = picked ?? view?.next ?? Math.max(1, view?.highestFloor ?? 1);
  const dossier = useMemo(() => floorDossier(selected), [selected]);

  if (!save || !view) return null;
  const floorView = view.floors[selected - 1];

  const climb = (floor: number): void => {
    playSfx('ui.open');
    actions.push({ name: 'battle-setup', encounterId: towerEncounterId(floor) });
  };
  const select = (floor: number): void => {
    playSfx('ui.tab');
    setPicked(floor);
  };

  return (
    <div className={styles.root} data-testid="screen-tower">
      <Backdrop asset="bg.bg1" grade="rgba(16, 14, 28, 0.62)" parallax={10} />
      <AmbientLayer preset="interior" />
      <div className={styles.vignette} aria-hidden="true" />
      <TopBar title={t('tower.title')} onBack={() => actions.pop()} />

      <div className={styles.body}>
        <TowerLadder
          floors={view.floors}
          selected={selected}
          keys={view.keys}
          onSelect={select}
          onClimb={climb}
        />
        {dossier && floorView ? (
          <FloorDossier
            dossier={dossier}
            state={floorView.state}
            keys={view.keys}
            next={view.next}
            onFight={climb}
          />
        ) : (
          <div />
        )}
        <ClimbPanel view={view} selected={selected} onLook={select} />
      </div>
    </div>
  );
}

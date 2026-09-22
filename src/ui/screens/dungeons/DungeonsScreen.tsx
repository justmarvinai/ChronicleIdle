import { useMemo } from 'react';
import { t, translate } from '@i18n/index';
import { dungeonsView } from '@state/dungeon';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { ModeCard } from '@ui/components/ModeCard/ModeCard';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { deepestText, setsText } from './dungeons-view';
import styles from './DungeonsScreen.module.css';

/**
 * The Dungeons overview (docs/tech/UI_DESIGN.md §5.24): one tall card per keep, easiest first.
 *
 * Every card answers the only question the screen exists for — *what is in there* — before it
 * answers how deep you have been. The sealed keep is a card like the rest, with its story and the
 * reason its doors are shut, because a mode the player can see coming is a mode they can want.
 */
export default function DungeonsScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'hub');
  const views = useMemo(() => (save ? dungeonsView(save) : []), [save]);
  return (
    <div className={styles.root} data-testid="screen-dungeons">
      <Backdrop asset="bg.bg9" grade="rgba(14, 12, 20, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('dungeons.title')} onBack={() => actions.pop()} />
      <div className={styles.cards}>
        {views.map((view, index) => {
          const sealed = view.def.lock !== undefined;
          return (
            <ModeCard
              key={view.def.id}
              title={translate(view.def.name)}
              body={translate(view.def.description)}
              art={view.def.backdrop}
              glyph={view.def.glyph}
              unlocked={!sealed}
              lockedLabel={t('dungeons.locked.accessoriesShort')}
              {...(sealed ? {} : { note: deepestText(view) })}
              index={index}
              testId={`mode-dungeon-${view.def.slug}`}
              onOpen={(open) => {
                if (open) actions.push({ name: 'dungeon', dungeon: view.def.slug });
              }}
            >
              {sealed ? (
                <p className={styles.sealed} data-testid={`dungeon-sealed-${view.def.slug}`}>
                  {t('dungeons.locked.accessories')}
                </p>
              ) : (
                <p className={styles.sets} data-testid={`dungeon-sets-${view.def.slug}`}>
                  {setsText(view)}
                </p>
              )}
            </ModeCard>
          );
        })}
      </div>
      <p className={styles.footnote}>{t('dungeons.subtitle')}</p>
    </div>
  );
}

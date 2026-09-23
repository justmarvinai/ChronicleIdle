import { useState } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { ForgeTab, Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { CraftBench } from './CraftBench';
import { DismantleBench } from './DismantleBench';
import { RefineBench } from './RefineBench';
import styles from './ForgeScreen.module.css';

type ForgeRoute = Extract<Route, { name: 'forge' }>;

const TABS: readonly ForgeTab[] = ['craft', 'dismantle', 'refine'];

/** Each bench's mark on its tab. */
const TAB_GLYPH: Readonly<Record<ForgeTab, GlyphKey>> = {
  craft: 'glyph.hammer_hit',
  dismantle: 'glyph.exploding_bomb',
  refine: 'glyph.shooting_stars',
};

/**
 * The Forge (docs/tech/UI_DESIGN.md §5.11): three benches around one anvil — strike a piece,
 * break what you will never wear, or feed a twin to light one more star — each beside the
 * storeroom of what the Forge works with. The racks themselves stay next door in the Armoury
 * (owner's answer Q36).
 */
export default function ForgeScreen({ route }: ScreenProps) {
  const params = route as ForgeRoute;
  const actions = useGameStore(selectActions);
  const [tab, setTab] = useState<ForgeTab>(params.tab ?? 'craft');
  useSceneAudio('hub', 'interior');

  return (
    <div className={styles.root} data-testid="screen-forge">
      <Backdrop asset="bg.bg5" grade="rgba(40, 18, 10, 0.5)" parallax={6} />
      <AmbientLayer preset="interior" glows={FORGE_GLOWS} />
      <TopBar title={t('forge.title')} onBack={() => actions.pop()} />

      <div className={styles.head}>
        <Tabs<ForgeTab>
          items={TABS.map((key) => ({
            key,
            label: t(`forge.tab.${key}`),
            glyph: TAB_GLYPH[key],
            testId: `forge-tab-${key}`,
          }))}
          value={tab}
          onChange={setTab}
        />
        <p className={styles.hint}>{t(`forge.tab.${tab}.hint`)}</p>
        <Button
          variant="secondary"
          size="sm"
          className={styles.armoury}
          onClick={() => actions.push({ name: 'armoury' })}
          data-testid="forge-armoury"
        >
          {t('forge.armoury')}
        </Button>
      </div>

      {tab === 'craft' ? <CraftBench /> : null}
      {tab === 'dismantle' ? <DismantleBench /> : null}
      {tab === 'refine' ? <RefineBench /> : null}
    </div>
  );
}

/** The forge's own light: the hearth under the anvil, and embers along the benches. */
const FORGE_GLOWS = [
  { x: 1640, y: 560, size: 220, color: 0xff7a2f, flicker: 0.6 },
  { x: 900, y: 980, size: 160, color: 0xffb35c, flicker: 0.4 },
  { x: 190, y: 1000, size: 130, color: 0xff9a3c, flicker: 0.35 },
];

import { useMemo, useState } from 'react';
import { t } from '@i18n/index';
import { selectActions, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { IndexTab, Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { BestiaryTab } from './BestiaryTab';
import { ChampionsTab } from './ChampionsTab';
import { SetsTab } from './SetsTab';
import { StatusesTab } from './StatusesTab';
import { foundCount, indexChampions } from './index-view';
import styles from './IndexScreen.module.css';

type IndexRoute = Extract<Route, { name: 'index' }>;

const TABS: readonly IndexTab[] = ['champions', 'bestiary', 'sets', 'statuses'];

/**
 * The Chronicle Index (docs/tech/UI_DESIGN.md §5.20): everything the game holds, whether or not
 * the chronicle has met it yet. Four catalogues — the champions, what stands against them, the
 * gear sets and the statuses a fight can carry — all of them reads of the content registry, so
 * the Index grows by itself every time content does.
 */
export default function IndexScreen({ route }: ScreenProps) {
  const params = route as IndexRoute;
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const [tab, setTab] = useState<IndexTab>(params.tab ?? 'champions');
  useSceneAudio('hub', 'interior');

  const champions = useMemo(() => indexChampions(roster), [roster]);
  const found = foundCount(champions);

  return (
    <div className={styles.root} data-testid="screen-index">
      <Backdrop asset="bg.bg5" grade="rgba(16, 13, 20, 0.62)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('index.title')} onBack={() => actions.pop()} />

      <div className={styles.head}>
        <Tabs<IndexTab>
          items={TABS.map((key) => ({
            key,
            label: t(`index.tab.${key}`),
            testId: `index-tab-${key}`,
          }))}
          value={tab}
          onChange={setTab}
        />
        <p className={styles.blurb}>{t('index.blurb')}</p>
        {tab === 'champions' ? (
          <span className={`num ${styles.tally}`} data-testid="index-found">
            {t('index.found', found)}
          </span>
        ) : null}
      </div>

      <div className={styles.body}>
        {tab === 'champions' ? <ChampionsTab entries={champions} /> : null}
        {tab === 'bestiary' ? <BestiaryTab /> : null}
        {tab === 'sets' ? <SetsTab /> : null}
        {tab === 'statuses' ? <StatusesTab /> : null}
      </div>
    </div>
  );
}

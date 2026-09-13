import { backdrop } from '@assets/manifest';
import { content } from '@content/registry';
import type { EncounterDef } from '@content/encounters/types';
import { t, translate } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import styles from './TrainingScreen.module.css';

/** Training Grounds: the three practice encounters (ROADMAP.md Phase 2; replaced by the Campaign). */
export default function TrainingScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'hub');
  return (
    <div className={styles.root} data-testid="screen-training">
      <Backdrop asset="bg.bg7" grade="rgba(28, 22, 18, 0.5)" parallax={8} />
      <AmbientLayer preset="hub" />
      <TopBar title={t('training.title')} onBack={() => actions.pop()} />
      <p className={styles.intro}>{t('training.body')}</p>
      <div className={styles.cards}>
        {content.encounters.map((encounter, index) => (
          <EncounterCard
            key={encounter.id}
            encounter={encounter}
            index={index}
            cleared={save?.stats[`battles.won.${encounter.id}`] ?? 0}
            onOpen={() => actions.push({ name: 'battle-setup', encounterId: encounter.id })}
          />
        ))}
      </div>
    </div>
  );
}

function EncounterCard({
  encounter,
  index,
  cleared,
  onOpen,
}: {
  encounter: EncounterDef;
  index: number;
  cleared: number;
  onOpen: () => void;
}) {
  const art = backdrop(encounter.backdrop);
  const enemies = encounter.waves.flatMap((w) => w.enemies.map((e) => content.enemyById(e.enemyId)));
  const elements = [
    ...new Set(enemies.map((e) => e?.element).filter((e): e is NonNullable<typeof e> => !!e)),
  ];
  const boss = encounter.kind === 'boss';
  return (
    <DecoFrame
      frame={boss ? 13 : 3}
      tint={boss ? '#f2a93b' : '#c9a24a'}
      thickness={16}
      className={styles.card}
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={`encounter-${encounter.id.replace('encounter.', '').replace(/\./g, '-')}`}
    >
      <div className={styles.art} style={{ backgroundImage: `url("${art.url}")` }} />
      <div className={styles.shade} />
      <div className={styles.head}>
        <span className={`num ${styles.index}`}>{index + 1}</span>
        <h2 className={`display ${styles.title}`}>{translate(encounter.name)}</h2>
        <div className={styles.meta}>
          <span className="num">{t('training.waves', { count: encounter.waves.length })}</span>
          <span className="num">{t('training.party', { count: encounter.partySize })}</span>
          <span className="num">{t('battleSetup.enemyLevel', { level: encounter.enemyLevel })}</span>
        </div>
        <div className={styles.elements}>
          {elements.map((element) => (
            <span
              key={element}
              className={styles.sigil}
              style={{
                background: `radial-gradient(circle, ${ELEMENT_COLOR[element]} 0%, rgba(11,10,13,0.9) 75%)`,
              }}
            >
              <Glyph glyph={ELEMENT_GLYPH[element]} size={20} color="var(--text-1)" label={element} />
            </span>
          ))}
        </div>
      </div>
      <div className={styles.foot}>
        <p className={styles.body}>{translate(encounter.description)}</p>
        {cleared > 0 ? (
          <span className={`num ${styles.cleared}`}>{t('training.cleared', { count: cleared })}</span>
        ) : null}
        <Button variant="primary" size="md" onClick={onOpen} data-testid={`prepare-${index + 1}`}>
          {t('training.fight')}
        </Button>
      </div>
    </DecoFrame>
  );
}

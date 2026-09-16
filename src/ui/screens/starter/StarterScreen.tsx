import { useState } from 'react';
import { motion } from 'motion/react';
import { STARTER_IDS, type ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { duckMusic, playSfx } from '@audio/index';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import { baseStars, baseStats } from '@engine/champions/stats';
import { t, translate } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { championAvatar } from '@ui/champions/art';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Divider } from '@ui/components/Divider/Divider';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ELEMENT_COLOR, ELEMENT_GLYPH, RARITY_HEX, ROLE_GLYPH } from '@ui/styles/display-maps';
import { kitBorder } from '@ui/styles/kit';
import { elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import styles from './StarterScreen.module.css';

/** Card flip and binding glow before the hub appears (TUTORIAL.md 1.2). */
const BIND_MS = 900;

/** The three Rare starters; binding one seeds the roster and opens Emberhold. */
export default function StarterScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const [binding, setBinding] = useState<ChampionId | null>(null);
  useSceneAudio('title', 'interior');

  const bind = (defId: ChampionId): void => {
    if (binding) return;
    setBinding(defId);
    playSfx('stinger.new_chronicle');
    duckMusic(0.4, BIND_MS + 2000);
    window.setTimeout(() => {
      const result = actions.chooseStarter(defId);
      if (result.ok) {
        const def = content.championById(defId);
        actions.toast('info', 'starter.bound', { name: def ? translate(def.name) : defId });
      } else setBinding(null);
    }, BIND_MS);
  };

  return (
    <div className={styles.root} data-testid="screen-starter">
      <Backdrop asset="bg.bg4" grade="rgba(30, 22, 40, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" />
      <header className={styles.header}>
        <h1 className={`display ${styles.title}`}>{t('starter.title')}</h1>
        <p className={styles.body}>{t('starter.body')}</p>
      </header>
      <div className={styles.cards} data-testid="starter-cards">
        {STARTER_IDS.map((id, index) => {
          const def = content.championById(id);
          if (!def) return null;
          const dimmed = binding !== null && binding !== id;
          const chosen = binding === id;
          const art = championAvatar(def, 512);
          const color = RARITY_HEX[def.rarity];
          const stats = baseStats(def.stats, baseStars(def.rarity), 1);
          return (
            <motion.article
              key={id}
              className={styles.card}
              initial={{ opacity: 0, y: 30, rotateY: -12 }}
              animate={{
                opacity: dimmed ? 0.25 : 1,
                y: chosen ? -16 : 0,
                rotateY: 0,
                scale: chosen ? 1.05 : dimmed ? 0.96 : 1,
                filter: chosen ? 'brightness(1.25)' : 'brightness(1)',
              }}
              transition={{
                duration: chosen ? 0.5 : 0.45,
                delay: binding ? 0 : index * 0.12,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              data-testid={`starter-${id.replace('champ.', '')}`}
            >
              <DecoFrame
                frame={7}
                tint={color}
                thickness={16}
                className={[styles.frame, chosen ? styles.chosen : ''].join(' ')}
              >
                <div className={styles.art} style={{ backgroundImage: `url("${art.url}")` }}>
                  {art.tint ? (
                    <div
                      className={styles.tint}
                      style={{
                        backgroundColor: art.tint,
                        WebkitMaskImage: `url("${art.url}")`,
                        maskImage: `url("${art.url}")`,
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className={styles.shade} />
                  <div className={styles.sigils}>
                    <span
                      className={styles.sigil}
                      style={{
                        background: `radial-gradient(circle, ${ELEMENT_COLOR[def.element]} 0%, rgba(11,10,13,0.9) 75%)`,
                      }}
                    >
                      <Glyph
                        glyph={ELEMENT_GLYPH[def.element]}
                        size={22}
                        color="var(--text-1)"
                        label={elementLabel(def.element)}
                      />
                    </span>
                    <span className={styles.sigil}>
                      <Glyph
                        glyph={ROLE_GLYPH[def.role]}
                        size={22}
                        color="var(--text-2)"
                        label={roleLabel(def.role)}
                      />
                    </span>
                  </div>
                  <div className={styles.artFoot}>
                    <StarRow stars={baseStars(def.rarity)} max={6} size={16} tone="rarity" tint={color} />
                  </div>
                </div>
                <div className={styles.text}>
                  <h2 className={`display ${styles.name}`}>{translate(def.name)}</h2>
                  <div className={styles.sub}>
                    {elementLabel(def.element)} · {roleLabel(def.role)}
                  </div>
                  <Divider kind="deco" index={2} width={220} />
                  <dl className={styles.stats}>
                    <div>
                      <dt>{t('champions.stat.hp')}</dt>
                      <dd className="num">{stats.hp.toLocaleString('en-US')}</dd>
                    </div>
                    <div>
                      <dt>{t('champions.stat.atk')}</dt>
                      <dd className="num">{stats.atk.toLocaleString('en-US')}</dd>
                    </div>
                    <div>
                      <dt>{t('champions.stat.def')}</dt>
                      <dd className="num">{stats.def.toLocaleString('en-US')}</dd>
                    </div>
                    <div>
                      <dt>{t('champions.stat.spd')}</dt>
                      <dd className="num">{stats.spd}</dd>
                    </div>
                  </dl>
                  <ul className={styles.kit} aria-label={t('starter.kit')}>
                    {def.abilities.map((ability) => (
                      <li key={ability.id}>
                        <span className={`display ${styles.kitName}`}>{translate(ability.name)}</span>
                        <span className={styles.kitBody}>
                          {translate(ability.description, { ...abilityNumbers(ability) })}
                        </span>
                      </li>
                    ))}
                    {def.passive ? (
                      <li>
                        <span className={`display ${styles.kitName}`}>
                          {translate(def.passive.name)}{' '}
                          <span className={styles.kitTag}>{t('starter.passive')}</span>
                        </span>
                        <span className={styles.kitBody}>
                          {translate(def.passive.description, { ...passiveNumbers(def.passive.effects) })}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className={styles.foot} style={kitBorder('ui.dark_ember.bg_tile_sm', 0.5)}>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={binding !== null}
                    onClick={() => bind(id)}
                    data-testid={`bind-${id.replace('champ.', '')}`}
                  >
                    {t('starter.bind', { name: translate(def.name) })}
                  </Button>
                </div>
                {chosen ? <div className={styles.burst} aria-hidden="true" /> : null}
              </DecoFrame>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

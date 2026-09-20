import { useMemo, useState } from 'react';
import { STAT_IDS } from '@content/champions/types';
import type { EnemyDef } from '@content/enemies/types';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import { t, translate, type I18nKey } from '@i18n/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Divider } from '@ui/components/Divider/Divider';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { Tabs } from '@ui/components/Tab/Tabs';
import { elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR } from '@ui/styles/display-maps';
import { bestiary } from './index-view';
import styles from './IndexScreen.module.css';

/**
 * What stands against the chronicle, settlement by settlement: each faction's six and the boss
 * that holds its last stand. The period bosses keep their own sheet at the gate (`BOSSES.md` §4).
 */
export function BestiaryTab() {
  const chapters = useMemo(() => bestiary(), []);
  const [index, setIndex] = useState(chapters[0]?.settlement ?? 1);
  const chapter = chapters.find((c) => c.settlement === index) ?? chapters[0];
  const roster = chapter ? [...chapter.units, chapter.boss] : [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = roster.find((e) => e.id === selectedId) ?? roster[0] ?? null;

  if (!chapter) return null;
  return (
    <div className={styles.split}>
      <section className={styles.listSide}>
        <Tabs<string>
          items={chapters.map((c) => ({
            key: String(c.settlement),
            label: `${c.settlement}`,
            testId: `index-faction-${c.settlement}`,
          }))}
          value={String(index)}
          onChange={(key) => {
            setIndex(Number(key));
            setSelectedId(null);
          }}
          className={styles.factionTabs ?? ''}
        />
        <h3 className={`display ${styles.section}`} data-testid="index-faction-name">
          {translate(chapter.name)}
        </h3>
        <div className={styles.beastGrid} data-testid="index-beasts">
          {roster.map((enemy) => (
            <button
              key={enemy.id}
              type="button"
              className={[styles.beast, selected?.id === enemy.id ? styles.beastOn : ''].join(' ')}
              onClick={() => setSelectedId(enemy.id)}
              data-testid={`index-beast-${enemy.id}`}
            >
              <span className={styles.beastArt}>
                <SpriteView
                  model={enemy.art.model}
                  scale={1.4}
                  facing={enemy.art.facing}
                  tint={enemy.art.tint}
                  desaturate={enemy.art.desaturate ?? false}
                />
              </span>
              <span className={styles.beastName}>{translate(enemy.name)}</span>
              {enemy.id === chapter.boss.id ? (
                <span className={styles.bossTag}>{t('index.beast.boss')}</span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {selected ? <BeastPage enemy={selected} /> : null}
    </div>
  );
}

/** The right-hand page for one enemy: what it is, what it hits with, what it never stops doing. */
function BeastPage({ enemy }: { enemy: EnemyDef }) {
  return (
    <Panel
      kind="stone"
      padding={20}
      className={styles.page}
      contentClassName={styles.pageBody}
      data-testid="index-beast-page"
    >
      <ScrollArea height="100%">
        <header className={styles.pageHead}>
          <div className={styles.beastPortrait}>
            <SpriteView
              model={enemy.art.model}
              scale={3}
              facing={enemy.art.facing}
              tint={enemy.art.tint}
              desaturate={enemy.art.desaturate ?? false}
            />
          </div>
          <div className={styles.pageTitle}>
            <h2 className="display">{translate(enemy.name)}</h2>
            <p className={styles.pageMeta}>
              {t(`index.archetype.${enemy.archetype}` as I18nKey)} ·{' '}
              <span style={{ color: ELEMENT_COLOR[enemy.element] }}>{elementLabel(enemy.element)}</span> ·{' '}
              {roleLabel(enemy.role)}
            </p>
          </div>
        </header>

        <Divider kind="deco" index={2} width="100%" />

        <h3 className={`display ${styles.section}`}>{t('index.page.stats')}</h3>
        <p className={styles.hint}>{t('index.beast.statsHint')}</p>
        <dl className={styles.stats}>
          {STAT_IDS.map((stat) => (
            <div key={stat} className={styles.stat}>
              <dt>{t(`champions.stat.${stat}` as I18nKey)}</dt>
              <dd className="num">{enemy.stats[stat].toLocaleString('en-US')}</dd>
            </div>
          ))}
        </dl>

        <h3 className={`display ${styles.section}`}>{t('champions.tab.abilities')}</h3>
        {enemy.abilities.map((ability) => {
          const numbers = abilityNumbers(ability, 0);
          return (
            <div key={ability.id} className={styles.ability}>
              <AbilityIcon
                icon={ability.icon}
                label={translate(ability.name)}
                size={56}
                hotkey={ability.slot.toUpperCase()}
              />
              <div>
                <div className={styles.abilityHead}>
                  <span className={`display ${styles.abilityName}`}>{translate(ability.name)}</span>
                  <span className={`num ${styles.tag}`}>
                    {numbers.cooldown > 0
                      ? t('champions.abilities.cooldown', { turns: numbers.cooldown })
                      : t('champions.abilities.noCooldown')}
                  </span>
                </div>
                <p className={styles.abilityText}>{translate(ability.description, { ...numbers })}</p>
              </div>
            </div>
          );
        })}
        {enemy.passives.map((passive) => (
          <div key={passive.id} className={styles.ability}>
            <AbilityIcon icon={passive.icon} label={translate(passive.name)} size={56} passive />
            <div>
              <div className={styles.abilityHead}>
                <span className={`display ${styles.abilityName}`}>{translate(passive.name)}</span>
                <span className={styles.tag}>{t('champions.abilities.passive')}</span>
              </div>
              <p className={styles.abilityText}>
                {translate(passive.description, { ...passiveNumbers(passive.effects) })}
              </p>
            </div>
          </div>
        ))}
      </ScrollArea>
    </Panel>
  );
}

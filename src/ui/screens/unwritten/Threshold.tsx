import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import type { SaveGame } from '@engine/schema/save';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { numeral } from './marks';
import { line, u } from './strings';
import { twistsAt, type ThresholdView } from './unwritten-view';
import styles from './Threshold.module.css';

/**
 * Nine across the muster, two rows and the top of a third in view: the third row showing is what
 * says the roster scrolls. The stage is a fixed 1920 × 1080, so the room it fills is known.
 */
const CARD = 128;
const CARD_H = Math.round(CARD * 1.28);
const COLUMNS = 9;
const GAP = 12;
const GRID_HEIGHT = CARD_H * 2 + GAP * 2 + Math.round(CARD_H * 0.55);

export interface ThresholdProps {
  save: SaveGame;
  view: ThresholdView;
  omens: ThresholdView['omens'];
  onBegin: (omen: number, company: string[]) => void;
}

/**
 * The threshold (UNWRITTEN.md §3–§4.1, §13): before an expedition, the Omen it is read under — each
 * rung's twist, the seal a first victory pays, how many Pages it brings home — and the company that
 * goes in, chosen from the roster in the order they will stand. The strongest are offered first.
 */
export function Threshold({ save, view, omens, onBegin }: ThresholdProps) {
  const open = omens.filter((o) => o.open);
  const [omen, setOmen] = useState(open[open.length - 1]?.def.omen ?? 0);
  const [company, setCompany] = useState<string[]>([]);
  const entries = useMemo(
    () => [...entriesOf(save.roster, save.inventory)].sort((a, b) => b.power - a.power),
    [save.roster, save.inventory],
  );
  const picked = omens.find((o) => o.def.omen === omen) ?? omens[0];
  const twists = twistsAt(
    omens.map((o) => o.def),
    omen,
  );

  const toggle = (id: string): void => {
    setCompany((now) => {
      if (now.includes(id)) {
        playSfx('ui.cancel');
        return now.filter((x) => x !== id);
      }
      if (now.length >= view.cap) {
        playSfx('ui.error');
        return now;
      }
      playSfx('ui.confirm');
      return [...now, id];
    });
  };

  return (
    <div className={styles.threshold} data-testid="unwritten-threshold">
      <section className={styles.omens}>
        <header className={styles.head}>
          <h2 className={`display ${styles.title}`}>{u('unwritten.ui.omen.title')}</h2>
          <span className={styles.hint}>{u('unwritten.ui.omen.hint')}</span>
        </header>
        <ScrollArea height="100%" fade className={styles.ladder ?? ''}>
          <ol className={styles.rungs}>
            {omens.map((o) => (
              <li key={o.def.id}>
                <button
                  type="button"
                  className={[
                    styles.rung,
                    o.def.omen === omen ? styles.rungOn : '',
                    o.open ? '' : styles.rungLocked,
                  ].join(' ')}
                  disabled={!o.open}
                  aria-pressed={o.def.omen === omen}
                  onClick={() => {
                    playSfx('ui.tab');
                    setOmen(o.def.omen);
                  }}
                  data-testid={`unwritten-omen-${o.def.omen}`}
                >
                  <span className={`num ${styles.numeral}`}>{numeral(o.def.omen) || '0'}</span>
                  <span className={styles.rungText}>
                    <span className={`display ${styles.rungName}`}>{line(o.def.name, {})}</span>
                    {o.def.text ? (
                      <span className={styles.rungTwist}>{line(o.def.text, o.def.show)}</span>
                    ) : null}
                  </span>
                  <span className={styles.seal} aria-hidden="true">
                    {o.sealed ? (
                      <Glyph glyph="glyph.trophy_cup" size={22} color="var(--gold-3)" />
                    ) : o.open ? (
                      <Glyph glyph="glyph.burning_scroll" size={20} color="#cbb8ff" />
                    ) : (
                      <Glyph glyph="glyph.broken_shackle" size={20} color="var(--text-3)" />
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </section>

      <section className={styles.muster}>
        <div className={styles.reading} data-testid="unwritten-omen-reading">
          <div className={styles.readingHead}>
            <span className={styles.readingKicker}>{u('unwritten.ui.omen.reading')}</span>
            <h2 className={`display ${styles.readingTitle}`}>
              {u('unwritten.ui.omen.named', {
                omen: numeral(omen) || '0',
                name: line(picked?.def.name ?? '', {}),
              })}
            </h2>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>{u('unwritten.ui.omen.foes')}</dt>
              <dd className="num">×{((picked?.def.scale ?? 1) / (omens[0]?.def.scale ?? 1)).toFixed(1)}</dd>
            </div>
            <div>
              <dt>{u('unwritten.ui.omen.pages')}</dt>
              <dd className="num">×{(picked?.pagesMult ?? 1).toFixed(2)}</dd>
            </div>
            <div>
              <dt>{u('unwritten.ui.omen.tithe')}</dt>
              <dd className="num">
                {view.titheLeft}/{view.tithePerWeek}
              </dd>
            </div>
          </dl>
          <div className={styles.twists}>
            {twists.length ? (
              twists.map((twist) => (
                <span key={twist.id} className={styles.twist}>
                  <span className={`num ${styles.twistOmen}`}>{numeral(twist.omen)}</span>
                  {twist.text ? line(twist.text, twist.show) : null}
                </span>
              ))
            ) : (
              <span className={styles.calm}>{u('unwritten.ui.omen.calm')}</span>
            )}
          </div>
          {picked && !picked.sealed && picked.seal.length ? (
            <div className={styles.sealRow}>
              <span>{u('unwritten.ui.omen.seal')}</span>
              <RewardList amounts={picked.seal} size={24} />
            </div>
          ) : null}
        </div>

        <header className={styles.head}>
          <h2 className={`display ${styles.title}`}>{u('unwritten.ui.company.choose')}</h2>
          <span className={styles.hint} data-testid="unwritten-company-count">
            {u('unwritten.ui.company.chosen', { count: company.length, cap: view.cap })}
          </span>
        </header>
        <div className={styles.roster}>
          <VirtualGrid
            items={entries}
            columns={COLUMNS}
            cellWidth={CARD}
            cellHeight={CARD_H}
            gap={GAP}
            height={GRID_HEIGHT}
            keyOf={(entry) => entry.instance.instanceId}
            emptyLabel={t('champions.empty')}
            renderItem={(entry) => {
              const id = entry.instance.instanceId;
              const seat = company.indexOf(id);
              return (
                <span className={styles.cell}>
                  <ChampionCard
                    name={entry.name}
                    rarity={entry.def.rarity}
                    element={entry.def.element}
                    role={entry.def.role}
                    stars={entry.instance.stars}
                    level={entry.instance.level}
                    avatar={entry.def.art.avatar}
                    tint={entry.def.art.tint}
                    placeholder={entry.def.art.placeholder}
                    placeholderLabel={t('champions.placeholder')}
                    size={CARD}
                    selected={seat >= 0}
                    onClick={() => toggle(id)}
                    testId={`unwritten-pick-${id}`}
                  />
                  {seat >= 0 ? (
                    <span
                      className={`num ${styles.seat} ${seat === 0 ? styles.lead : ''}`}
                      aria-hidden="true"
                    >
                      {seat + 1}
                    </span>
                  ) : null}
                </span>
              );
            }}
          />
        </div>
        <footer className={styles.foot}>
          <p className={styles.rule}>{u('unwritten.ui.company.rule', { party: view.party })}</p>
          <Button
            variant="primary"
            size="lg"
            disabled={company.length === 0}
            onClick={() => onBegin(omen, company)}
            data-testid="unwritten-begin"
          >
            {u('unwritten.ui.begin')}
          </Button>
        </footer>
      </section>
    </div>
  );
}

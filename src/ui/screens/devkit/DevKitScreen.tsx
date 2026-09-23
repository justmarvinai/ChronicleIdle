import { useState } from 'react';
import { groupKeys } from '@assets/manifest';
import type { GlyphKey, ModelKey } from '@assets/manifest.generated';
import { CURRENCIES } from '@content/currencies/types-list';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { IconButton } from '@ui/components/Button/IconButton';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import type { Rarity } from '@ui/styles/display-maps';
import { CurrencyPill } from '@ui/components/CurrencyPill/CurrencyPill';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { Divider } from '@ui/components/Divider/Divider';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Panel, type PanelKind } from '@ui/components/Frame/Panel';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Slider } from '@ui/components/Slider/Slider';
import { Slot } from '@ui/components/Slot/Slot';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { StatusIcon } from '@ui/components/StatusIcon/StatusIcon';
import { Tabs } from '@ui/components/Tab/Tabs';
import { Timer } from '@ui/components/Timer/Timer';
import { Toggle } from '@ui/components/Toggle/Toggle';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { TopBar } from '@ui/components/TopBar/TopBar';
import type { ScreenProps } from '@ui/router/screens';
import styles from './DevKitScreen.module.css';

/** Gallery tints cycle through the six rarity colours. */
const DECO_SAMPLE_TINTS = ['#c9a24a', '#4fc267', '#3f8fe6', '#a35de3', '#f2a93b', '#ff4d6d'] as const;

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const PANELS: PanelKind[] = ['stone', 'arch', 'ember-wide', 'ember-tall', 'ornate-wide', 'thin', 'bevel'];

/** Development-only gallery of every component in every state (ROADMAP Phase 0 acceptance). */
export default function DevKitScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [toggle, setToggle] = useState(true);
  const [slider, setSlider] = useState(0.6);
  const [drop, setDrop] = useState<'x1' | 'x2'>('x1');
  const [bar, setBar] = useState(64);
  const models = groupKeys('models') as ModelKey[];
  const glyphs = groupKeys('ui').filter((k) => k.startsWith('glyph.')) as GlyphKey[];
  return (
    <div className={styles.root} data-testid="screen-devkit">
      <Backdrop asset="bg.bg5" grade="rgba(10, 10, 20, 0.6)" parallax={0} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('devkit.title')} onBack={() => actions.pop()} />
      <div className={styles.body}>
        <ScrollArea height="100%">
          <Section title="Buttons">
            <Row>
              <Button variant="primary">Primary</Button>
              <Button variant="primary" size="lg">
                Primary large
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" loading>
                Loading
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="square" active>
                ×2
              </Button>
              <Button variant="square">×3</Button>
              <IconButton kind="close" label="close" />
              <IconButton kind="back" label="back" />
              <IconButton kind="settings" label="settings" />
              <IconButton kind="settings" label="settings" disabled />
            </Row>
          </Section>
          <Section title="Panels">
            <Row>
              {PANELS.map((kind) => (
                <Panel key={kind} kind={kind} style={{ width: 240, height: 160 }}>
                  <span className="display">{kind}</span>
                </Panel>
              ))}
            </Row>
          </Section>
          <Section title="Deco frames (32) — line variant at 1:1, tinted at runtime">
            <Row>
              {Array.from({ length: 32 }, (_, i) => (
                <DecoFrame
                  key={i}
                  frame={i + 1}
                  variant="line"
                  thickness={32}
                  tint={DECO_SAMPLE_TINTS[i % DECO_SAMPLE_TINTS.length] ?? null}
                  style={{ width: 96, height: 96 }}
                  background="var(--bg-1)"
                >
                  <span className={`num ${styles.small}`}>{i + 1}</span>
                </DecoFrame>
              ))}
            </Row>
          </Section>
          <Section title="Deco frames — solid variant at 2:1 (card borders)">
            <Row>
              {[16, 2, 7, 3, 13, 26, 10].map((frame, i) => (
                <DecoFrame
                  key={frame}
                  frame={frame}
                  variant="solid"
                  thickness={16}
                  tint={DECO_SAMPLE_TINTS[i % DECO_SAMPLE_TINTS.length] ?? null}
                  style={{ width: 128, height: 164 }}
                  background="var(--bg-1)"
                >
                  <span className={`num ${styles.small}`}>{frame}</span>
                </DecoFrame>
              ))}
            </Row>
          </Section>
          <Section title="Glyphs (40)">
            <Row>
              {glyphs.map((g) => (
                <Tooltip key={g} content={g}>
                  <span className={styles.glyphCell}>
                    <Glyph glyph={g} size={40} color="var(--gold-3)" />
                  </span>
                </Tooltip>
              ))}
            </Row>
          </Section>
          <Section title="Currency pills (24)">
            <Row>
              {CURRENCIES.map((c, i) => (
                <CurrencyPill key={c} currency={c} amount={(i + 1) * 1234} size="sm" />
              ))}
              <CurrencyPill
                currency="energy"
                amount={1551}
                cap={60}
                highlight="over"
                onAdd={() => undefined}
              />
              <CurrencyPill currency="energy" amount={4} cap={60} highlight="low" />
            </Row>
            <Row>
              <RewardList
                amounts={[
                  { currency: 'gold', amount: 12_500 },
                  { currency: 'gems', amount: 30 },
                  { currency: 'shard_ancient', amount: 1 },
                ]}
              />
              <RewardList
                amounts={[
                  { currency: 'tome_epic', amount: 2 },
                  { currency: 'mat_glyph_sigil', amount: 1 },
                ]}
                layout="column"
                size={22}
              />
            </Row>
          </Section>
          <Section title="Bars, slots, stars, status, timers">
            <Row>
              <Bar value={bar} max={100} kind="health" width={300} showNumbers label="HP" />
              <Bar value={bar} max={100} kind="mana" width={300} />
              <Bar value={bar} max={100} kind="stamina" width={300} />
              <Bar value={bar} max={100} kind="ember" width={300} label="Boss" showNumbers />
              <Button size="sm" onClick={() => setBar((b) => (b + 23) % 101)}>
                Change
              </Button>
            </Row>
            <Row>
              <Slot size="sm" emptyGlyph="glyph.cloaked_figure" onClick={() => undefined} />
              <Slot size="md" emptyGlyph="glyph.spiked_cleaver" selected onClick={() => undefined} />
              <Slot size="lg" emptyGlyph="glyph.health_potion" locked />
              <StarRow stars={4} max={6} size={24} />
              <StarRow stars={6} max={6} size={24} tone="rarity" tint="#ff4d6d" />
              <StatusIcon glyph="glyph.sword_clash" kind="buff" turns={2} label="ATK Up" />
              <StatusIcon glyph="glyph.thorny_branch" kind="debuff" turns={3} label="Poison" />
              <StatusIcon glyph="glyph.stomp_impact" kind="debuff" label="Stun" />
              <Timer remainingMs={5 * 3_600_000 + 7 * 60_000} label="Reset" />
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 40,
                  height: 40,
                  background: 'var(--stone-2)',
                }}
              >
                <NotificationDot count={3} />
              </span>
            </Row>
          </Section>
          <Section title="Inputs">
            <Row>
              <Tabs
                items={[
                  { key: 'a', label: 'Daily', badge: 2 },
                  { key: 'b', label: 'Weekly' },
                  { key: 'c', label: 'Locked', disabled: true },
                ]}
                value={tab}
                onChange={setTab}
              />
              <Dropdown
                options={[
                  { value: 'x1', label: '×1' },
                  { value: 'x2', label: '×2' },
                ]}
                value={drop}
                onChange={setDrop}
                width={160}
              />
            </Row>
            <div style={{ width: 640 }}>
              <Toggle
                label="Offer fullscreen at launch"
                description="Never forced"
                checked={toggle}
                onChange={setToggle}
              />
              <Slider label="Music" value={slider} onChange={setSlider} />
            </div>
          </Section>
          <Section title="Champion cards (rarities) and gear">
            <Row>
              {RARITIES.map((r, i) => (
                <ChampionCard
                  key={r}
                  name={r}
                  rarity={r}
                  element={(['justice', 'valor', 'faith', 'eclipse'] as const)[i % 4] ?? 'justice'}
                  role={(['attack', 'defense', 'health', 'support'] as const)[i % 4] ?? 'attack'}
                  stars={i + 1}
                  level={i * 10 + 1}
                  avatar="avatar.anuria"
                  size={128}
                  onClick={() => undefined}
                  selected={i === 3}
                  locked={i === 1}
                  favourite={i === 4}
                />
              ))}
              <ChampionCard
                name="Khazgor"
                rarity="epic"
                element="valor"
                role="defense"
                stars={4}
                level={40}
                avatar="avatar.khazgor"
                size={192}
              />
              <GearCard
                rarity="legendary"
                stars={5}
                level={12}
                slot="weapon"
                art="gear.warcry.weapon"
                emblem="emblem.warcry"
                mainStat="ATK 210"
                setName="Warcry"
              />
              <GearCard
                rarity="mythic"
                stars={6}
                level={16}
                slot="boots"
                art="gear.swiftfoot.boots"
                emblem="emblem.swiftfoot"
                mainStat="SPD 45"
                size={96}
                locked
              />
            </Row>
          </Section>
          <Section title="Gear set emblems and piece thumbnails">
            <Row>
              <SetEmblem emblem="emblem.ember_guard" size={92} kind="plate" label="Ember Guard" />
              <SetEmblem emblem="emblem.executioner" size={48} kind="plate" label="Executioner" />
              <SetEmblem emblem="emblem.keen_eye" size={36} label="Keen Eye" />
              <SetEmblem emblem="emblem.bulwark" size={22} label="Bulwark" />
              <PieceThumb art="gear.lifedrinker.helmet" tint="var(--gold-2)" size={78} />
              <PieceThumb
                art="gear.stunlock.weapon"
                emblem="emblem.stunlock"
                tint="var(--r-legendary)"
                size={40}
              />
            </Row>
          </Section>
          <Section title="Ability icons">
            <Row>
              <AbilityIcon
                icon="spell.fire_flame_burst"
                label="Fireball"
                badge="1"
                onClick={() => undefined}
              />
              <AbilityIcon icon="spell.hunt_frost_bolt" label="Frost" cooldown={3} badge="2" />
              <AbilityIcon icon="spell.crest_warded_shield" label="Guard" passive badge="P" />
              <AbilityIcon
                icon="spell.rune_radiance"
                label="Selected"
                selected
                onClick={() => undefined}
                badge="3"
              />
            </Row>
          </Section>
          <Section title="Sprites (idle loops from atlases)">
            <Row>
              {models.map((m) => (
                <div key={m} className={styles.spriteCell}>
                  <SpriteView
                    model={m}
                    scale={2}
                    facing="right"
                    tint={m === 'model.teritorial_lizard' ? '#8b5a2b' : null}
                  />
                  <span className={styles.small}>{m}</span>
                </div>
              ))}
            </Row>
          </Section>
          <Section title="Dividers">
            <Divider kind="vine" width={600} />
            <Divider kind="deco" index={2} width={600} />
            <Divider kind="deco-fade" index={4} width={600} tint="#9b5de5" />
          </Section>
        </ScrollArea>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={`display ${styles.sectionTitle}`}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

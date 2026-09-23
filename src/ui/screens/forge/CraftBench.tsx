import { useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { craftPrice } from '@state/forge';
import { selectActions, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { GearInstance } from '@engine/gear/instance';
import { craftPool } from '@engine/forge/craft';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Slot } from '@ui/components/Slot/Slot';
import { CARD_TINT, RARITY_HEX, SLOT_GLYPH } from '@ui/styles/display-maps';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { mainStatLine, pieceArtwork, pieceName, setOf, slotLabel } from '@ui/gear/gear-view';
import { CRAFT_TIERS, affordable, costLine, poolLabel, tierBody, tierLabel } from './forge-view';
import type { CraftTier } from './forge-view';
import styles from './CraftBench.module.css';

/** A set's emblem beside its name in the Sigil's set chooser, in CSS pixels. */
const OPTION_EMBLEM = 22;

/** The anvil: slot, tier, an optional Sigil naming the set, and the hammer. */
export function CraftBench() {
  const actions = useGameStore(selectActions);
  const wallet = useGameStore(selectWallet);
  const [slot, setSlot] = useState<GearSlot>('weapon');
  const [tier, setTier] = useState<CraftTier>('scrap');
  const [setId, setSetId] = useState<string>('');
  const [struck, setStruck] = useState<GearInstance | null>(null);
  const [strike, setStrike] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const held = (id: string): number => wallet?.[id as 'gold'] ?? 0;
  const pool = craftPool(tier, content.gearSets);
  const named = setId !== '' && pool.includes(setId);
  const cost = craftPrice(tier, named);
  const canPay = affordable(cost, held);
  const sigils = held('mat_glyph_sigil');

  // A tier change can drop the chosen set out of the pool; the recipe never lies about its cost.
  const chooseTier = (next: CraftTier): void => {
    setTier(next);
    if (setId !== '' && !craftPool(next, content.gearSets).includes(setId)) setSetId('');
  };

  const craft = (): void => {
    const result = actions.craftGear(tier, slot, named ? setId : undefined);
    if (!result.ok) {
      playSfx('ui.error');
      setError(
        result.error.code === 'insufficient_currency' ? t('forge.craft.tooPoor') : t('forge.craft.full'),
      );
      return;
    }
    setError(null);
    setStruck(result.value.piece);
    setStrike((n) => n + 1);
    playSfx('reward.large');
    actions.toast('reward', 'forge.craft.result', { piece: pieceName(result.value.piece) });
  };

  const reduced = prefersReducedMotion();
  const set = struck ? setOf(struck) : undefined;

  return (
    <div className={styles.bench} data-testid="forge-craft">
      <section className={styles.choices}>
        <h3 className={`display ${styles.heading}`}>{t('forge.craft.slot')}</h3>
        <div className={styles.slots}>
          {GEAR_SLOTS.map((one) => (
            <div key={one} className={styles.slotCell}>
              <Slot
                size="sm"
                emptyGlyph={SLOT_GLYPH[one]}
                label={slotLabel(one)}
                selected={slot === one}
                onClick={() => {
                  playSfx('ui.tab');
                  setSlot(one);
                }}
                data-testid={`craft-slot-${one}`}
              />
              <span className={styles.slotName}>{slotLabel(one)}</span>
            </div>
          ))}
        </div>

        <h3 className={`display ${styles.heading}`}>{t('forge.craft.tier')}</h3>
        <div className={styles.tiers}>
          {CRAFT_TIERS.map((one) => {
            const on = tier === one;
            const price = craftPrice(one, false);
            return (
              <DecoFrame
                key={one}
                frame={on ? 13 : 16}
                tint={on ? CARD_TINT.unlocked : CARD_TINT.locked}
                thickness={12}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                className={[styles.tier, on ? styles.tierOn : ''].join(' ')}
                data-testid={`craft-tier-${one}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => {
                  playSfx('ui.tab');
                  chooseTier(one);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    chooseTier(one);
                  }
                }}
              >
                <div className={styles.tierHead}>
                  <span className={`display ${styles.tierName}`}>{tierLabel(one)}</span>
                  <span className={styles.tierPool}>{poolLabel(one)}</span>
                </div>
                <p className={styles.tierBody}>{tierBody(one)}</p>
                <ul className={styles.tierCost}>
                  {price.map((entry) => (
                    <li
                      key={entry.currency}
                      className={[
                        'num',
                        styles.costRow,
                        held(entry.currency) < entry.amount ? styles.costShort : '',
                      ].join(' ')}
                    >
                      {costLine(entry)}
                    </li>
                  ))}
                </ul>
              </DecoFrame>
            );
          })}
        </div>

        <div className={styles.setRow}>
          <Dropdown<string>
            label={t('forge.craft.set')}
            width={300}
            value={setId}
            options={[
              { value: '', label: t('forge.craft.set.any') },
              ...content.gearSets
                .filter((one) => pool.includes(one.id))
                .map((one) => ({
                  value: one.id,
                  label: translate(one.name),
                  icon: <SetEmblem emblem={one.emblem} size={OPTION_EMBLEM} />,
                })),
            ]}
            onChange={(next) => setSetId(next)}
          />
          <span className={styles.sigils} data-testid="craft-sigils">
            <Glyph glyph="glyph.arcane_symbol" size={20} color="var(--gold-3)" />
            <span className="num">{t('forge.craft.sigils', { count: sigils })}</span>
          </span>
          {named ? <span className={styles.sigilNote}>{t('forge.craft.set.sigil')}</span> : null}
        </div>
      </section>

      <section className={styles.anvilColumn}>
        <div className={styles.anvil}>
          <span className={styles.anvilBlock} aria-hidden="true" />
          <span className={styles.hearth} aria-hidden="true" />
          {/* The hammer falls on every strike; `key` restarts the animation. */}
          <motion.span
            key={strike}
            className={styles.hammer}
            initial={reduced || strike === 0 ? false : { rotate: -38, y: -30, opacity: 0.9 }}
            animate={reduced || strike === 0 ? {} : { rotate: [-38, 8, -38], y: [-30, 6, -30] }}
            transition={{ duration: 0.42, times: [0, 0.45, 1], ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <Glyph glyph="glyph.hammer_hit" size={96} color="var(--ember-3)" />
          </motion.span>
          {strike > 0 && !reduced ? <span key={`spark-${strike}`} className={styles.sparks} /> : null}
        </div>

        {struck ? (
          <motion.div
            key={struck.instanceId}
            className={styles.reveal}
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : 0.28, ease: 'easeOut' }}
            data-testid="craft-result"
          >
            <GearCard
              rarity={struck.rarity}
              stars={struck.stars}
              level={struck.level}
              slot={struck.slot}
              {...pieceArtwork(struck)}
              mainStat={mainStatLine(struck)}
              setName={set ? translate(set.name) : struck.setId}
              size={128}
            />
            <span className={`display ${styles.revealName}`} style={{ color: RARITY_HEX[struck.rarity] }}>
              {pieceName(struck)}
            </span>
            <span className={`num ${styles.revealStat}`}>{mainStatLine(struck)}</span>
          </motion.div>
        ) : (
          <p className={styles.hint}>{t('forge.tab.craft.hint')}</p>
        )}

        <Button
          variant="primary"
          size="lg"
          disabled={!canPay}
          onClick={craft}
          data-testid="craft-strike"
          icon={<Glyph glyph="glyph.hammer_hit" size={26} color="var(--gold-3)" />}
        >
          {struck ? t('forge.craft.again') : t('forge.craft.strike')}
        </Button>
        <ul className={styles.total} data-testid="craft-cost">
          {cost.map((entry) => (
            <li
              key={entry.currency}
              className={['num', held(entry.currency) < entry.amount ? styles.costShort : ''].join(' ')}
            >
              {costLine(entry)}
            </li>
          ))}
        </ul>
        {error ? (
          <p className={styles.error} role="alert" data-testid="craft-error">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

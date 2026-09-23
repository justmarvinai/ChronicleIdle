import { useState, type ReactNode } from 'react';
import { playSfx } from '@audio/index';
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { craftPrice } from '@state/forge';
import { selectActions, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { GearInstance } from '@engine/gear/instance';
import { craftPool } from '@engine/forge/craft';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Slot } from '@ui/components/Slot/Slot';
import { SLOT_GLYPH } from '@ui/styles/display-maps';
import { pieceName, slotLabel } from '@ui/gear/gear-view';
import { Anvil } from './Anvil';
import { Storeroom } from './Storeroom';
import { TierCard } from './TierCard';
import { CRAFT_TIERS, affordable, poolLabel, timesAffordable } from './forge-view';
import type { CraftTier } from './forge-view';
import styles from './CraftBench.module.css';

/** A set's emblem beside its name in the Sigil's set chooser, in CSS pixels. */
const OPTION_EMBLEM = 22;

/** The Craft bench: the recipe in three steps on the left, the anvil on the right. */
export function CraftBench() {
  const actions = useGameStore(selectActions);
  const wallet = useGameStore(selectWallet);
  const [slot, setSlot] = useState<GearSlot>('weapon');
  const [tier, setTier] = useState<CraftTier>('scrap');
  const [setId, setSetId] = useState<string>('');
  const [struck, setStruck] = useState<GearInstance | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const held = (id: string): number => wallet?.[id as 'gold'] ?? 0;
  const pool = craftPool(tier, content.gearSets);
  const named = setId !== '' && pool.includes(setId);
  const namedSet = named ? content.gearSetById(setId) : undefined;
  const cost = craftPrice(tier, named);
  const canPay = affordable(cost, held);
  const sigil = CURRENCY_BY_ID.mat_glyph_sigil;

  // A tier change can drop the chosen set out of the pool; the recipe never lies about its cost.
  const chooseTier = (next: CraftTier): void => {
    setTier(next);
    setStruck(null);
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
    setStrikes((n) => n + 1);
    playSfx('reward.large');
    actions.toast('reward', 'forge.craft.result', { piece: pieceName(result.value.piece) });
  };

  return (
    <>
      <Storeroom spends={cost} />
      <div className={styles.bench} data-testid="forge-craft">
        <section className={styles.recipe}>
          <Step index={1} title={t('forge.craft.step.slot')}>
            <div className={styles.slots}>
              {GEAR_SLOTS.map((one) => (
                <div key={one} className={styles.slotCell}>
                  <Slot
                    size="md"
                    label={slotLabel(one)}
                    selected={slot === one}
                    onClick={() => {
                      setSlot(one);
                      setStruck(null);
                    }}
                    data-testid={`craft-slot-${one}`}
                  >
                    {namedSet ? (
                      <AssetImage asset={namedSet.art[one]} size={256} className={styles.slotArt} />
                    ) : (
                      <Glyph
                        glyph={SLOT_GLYPH[one]}
                        size={58}
                        color={slot === one ? 'var(--gold-3)' : 'rgba(243, 236, 220, 0.45)'}
                      />
                    )}
                  </Slot>
                  <span className={[styles.slotName, slot === one ? styles.slotNameOn : ''].join(' ')}>
                    {slotLabel(one)}
                  </span>
                </div>
              ))}
            </div>
          </Step>

          <Step index={2} title={t('forge.craft.step.tier')}>
            <div className={styles.tiers}>
              {CRAFT_TIERS.map((one) => {
                const price = craftPrice(one, false);
                return (
                  <TierCard
                    key={one}
                    tier={one}
                    selected={tier === one}
                    price={price}
                    held={held}
                    strikes={timesAffordable(price, held)}
                    onSelect={() => chooseTier(one)}
                  />
                );
              })}
            </div>
          </Step>

          <Step index={3} title={t('forge.craft.step.set')}>
            <div className={styles.setRow}>
              <Dropdown<string>
                label={t('forge.craft.set')}
                width={320}
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
                onChange={(next) => {
                  setSetId(next);
                  setStruck(null);
                }}
              />
              <span className={styles.sigils} data-testid="craft-sigils">
                <TintedIcon asset={sigil.icon} tint={sigil.tint} size={30} />
                <span className="display">{translate(sigil.name)}</span>
                <span className="num">{t('forge.craft.sigils', { count: held('mat_glyph_sigil') })}</span>
              </span>
            </div>
            {namedSet ? (
              <div className={styles.setCard}>
                <SetEmblem emblem={namedSet.emblem} size={46} />
                <span className={styles.setText}>
                  <strong className="display">
                    {translate(namedSet.name)}{' '}
                    <span className={styles.setSize}>
                      {t('armoury.set.pieces', { pieces: namedSet.pieces })}
                    </span>
                  </strong>
                  <span>{translate(namedSet.description)}</span>
                </span>
                <span className={`num ${styles.sigilNote}`}>{t('forge.craft.set.sigil')}</span>
              </div>
            ) : (
              <p className={styles.setHint}>
                {t('forge.craft.set.hint', { pool: poolLabel(tier).toLowerCase() })}
              </p>
            )}
          </Step>
        </section>

        <Anvil
          slot={slot}
          tier={tier}
          named={namedSet}
          struck={struck}
          strikes={strikes}
          cost={cost}
          held={held}
          canPay={canPay}
          error={error}
          onStrike={craft}
        />
      </div>
    </>
  );
}

/** One numbered step of the recipe: a medallion, its title, and what it asks for. */
function Step({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <div className={styles.step}>
      <header className={styles.stepHead}>
        <span className={`num ${styles.stepIndex}`}>{index}</span>
        <h3 className={`display ${styles.stepTitle}`}>{title}</h3>
      </header>
      {children}
    </div>
  );
}

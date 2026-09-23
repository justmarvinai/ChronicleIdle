import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import type { ChampionDef } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import type { FeedPreview } from '@engine/progression/tavern-level';
import type { RankRequirement } from '@engine/progression/tavern-rank';
import { skillStatuses } from '@engine/progression/tavern-skills';
import { t, translate, type I18nKey } from '@i18n/index';
import type { TavernTab } from '@state/ui-types';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Tabs } from '@ui/components/Tab/Tabs';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { upgradeLabel } from './tavern-view';
import styles from './TavernPanel.module.css';

export interface TavernPanelProps {
  def: ChampionDef;
  instance: ChampionInstance;
  tab: TavernTab;
  onTab: (tab: TavernTab) => void;
  /** Level track. */
  preview: FeedPreview | null;
  cost: readonly CurrencyAmount[];
  canAfford: boolean;
  onUpgrade: () => void;
  onAutoFill: () => void;
  onClear: () => void;
  /** Rank track. */
  requirement: RankRequirement | null;
  seated: number;
  canRank: boolean;
  /** Skills track: tomes held, and the upgrade handler. */
  tomesHeld: number;
  onUpgradeSkill: (abilityId: string) => void;
}

const TABS: readonly { key: TavernTab; labelKey: I18nKey }[] = [
  { key: 'level', labelKey: 'tavern.tab.level' },
  { key: 'rank', labelKey: 'tavern.tab.rank' },
  { key: 'skills', labelKey: 'tavern.tab.skills' },
];

/** The Tavern's right column: the three tracks, what each asks for and the Upgrade press. */
export function TavernPanel(props: TavernPanelProps) {
  const { def, instance, tab, preview, requirement } = props;
  const cap = levelCap(instance.stars);
  const statuses = skillStatuses(def, instance);
  const tome = statuses[0]?.tome ?? null;

  return (
    <aside className={styles.panel} aria-label={t('tavern.title')}>
      <Tabs
        items={TABS.map((item) => ({
          key: item.key,
          label: t(item.labelKey),
          testId: `tavern-tab-${item.key}`,
        }))}
        value={tab}
        onChange={props.onTab}
        orientation="vertical"
        className={styles.tabs ?? ''}
      />

      <Panel kind="ember-tall" padding={18} className={styles.body}>
        {tab === 'level' ? (
          <div className={styles.track} data-testid="tavern-level">
            <p className={styles.hint}>{t('tavern.tab.level.hint')}</p>
            <div className={styles.levelRow}>
              <span className={`num ${styles.level}`} data-testid="tavern-level-now">
                {preview && preview.levelsGained > 0
                  ? t('tavern.levelPreview', { from: instance.level, to: preview.level })
                  : t('tavern.levelStays', { level: instance.level })}
              </span>
              <span className={`num ${styles.cap}`}>/ {cap}</span>
            </div>
            <Bar
              value={instance.xp}
              max={Math.max(1, instance.xp + 1)}
              kind="xp"
              width={300}
              height={18}
              showNumbers={false}
            />
            {preview ? (
              <p className={`num ${styles.xp}`} data-testid="tavern-xp">
                {t('tavern.xpGained', { xp: preview.xp.toLocaleString('en-US') })}
              </p>
            ) : (
              <p className={styles.hint}>{t('tavern.nothing')}</p>
            )}
            {preview?.atCap ? (
              <p className={styles.warn} data-testid="tavern-at-cap">
                {t('tavern.atCap', { stars: instance.stars })}
              </p>
            ) : null}
            {preview && preview.wasted > 0 && !preview.atCap ? (
              <p className={styles.warn}>
                {t('tavern.wasted', { xp: preview.wasted.toLocaleString('en-US') })}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button size="sm" variant="secondary" onClick={props.onAutoFill} data-testid="tavern-autofill">
                {t('tavern.autofill')}
              </Button>
              <Button size="sm" variant="ghost" sound="ui.cancel" onClick={props.onClear}>
                {t('tavern.clear')}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'rank' ? (
          <div className={styles.track} data-testid="tavern-rank">
            {requirement ? (
              <>
                <p className={styles.hint}>
                  {t('tavern.tab.rank.hint', { count: requirement.count, stars: requirement.foodStars })}
                </p>
                <p className={`num ${styles.level}`} data-testid="tavern-rank-need">
                  {t('tavern.rank.requirement', {
                    count: requirement.count,
                    stars: requirement.foodStars,
                  })}
                </p>
                <p className={`num ${styles.xp}`} data-testid="tavern-rank-seated">
                  {t('tavern.rank.have', { have: props.seated, need: requirement.count })}
                </p>
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={props.onAutoFill}
                    data-testid="tavern-autofill-rank"
                  >
                    {t('tavern.autofill')}
                  </Button>
                  <Button size="sm" variant="ghost" sound="ui.cancel" onClick={props.onClear}>
                    {t('tavern.clear')}
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.warn} data-testid="tavern-rank-maxed">
                {t('tavern.rank.maxed', { name: translate(def.name) })}
              </p>
            )}
          </div>
        ) : null}

        {tab === 'skills' ? (
          <div className={styles.track} data-testid="tavern-skills">
            <p className={styles.hint}>{t('tavern.tab.skills.hint')}</p>
            {statuses.map((status) => {
              const ability = def.abilities.find((a) => a.id === status.abilityId);
              if (!ability) return null;
              return (
                <div
                  key={status.abilityId}
                  className={styles.skill}
                  data-testid={`skill-${status.abilityId}`}
                >
                  <AbilityIcon icon={ability.icon} label={translate(ability.name)} size={44} />
                  <span className={styles.skillText}>
                    <strong className="display">{translate(ability.name)}</strong>
                    <em>
                      {status.next
                        ? `${t('tavern.skills.step', { step: status.steps + 1, max: status.max })} · ${upgradeLabel(status.next)}`
                        : t('tavern.skills.maxed')}
                    </em>
                  </span>
                  <span className={styles.dots} aria-hidden="true">
                    {Array.from({ length: status.max }, (_, i) => (
                      <span key={i} className={i < status.steps ? styles.dotOn : styles.dot} />
                    ))}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!status.next || !status.tome || props.tomesHeld < 1}
                    onClick={() => props.onUpgradeSkill(status.abilityId)}
                    data-testid={`skill-upgrade-${status.abilityId}`}
                  >
                    {t('tavern.upgrade')}
                  </Button>
                </div>
              );
            })}
            {tome ? (
              <p className={`num ${styles.hint}`} data-testid="tavern-tomes">
                {t('tavern.skills.tome', {
                  tome: translate(CURRENCY_BY_ID[tome].name),
                  count: props.tomesHeld,
                })}
              </p>
            ) : (
              <p className={styles.warn}>
                {t('tavern.skills.none', { rarity: t(`rarity.${def.rarity}` as I18nKey) })}
              </p>
            )}
          </div>
        ) : null}
      </Panel>

      {tab === 'skills' ? null : (
        <div className={styles.footer}>
          <div className={styles.cost} data-testid="tavern-cost">
            <span className={styles.costLabel}>{t('tavern.cost')}</span>
            {props.cost.length ? (
              props.cost.map((entry) => (
                <CurrencyLabel
                  key={entry.currency}
                  currency={entry.currency}
                  amount={entry.amount}
                  size={22}
                  className={styles.costEntry}
                />
              ))
            ) : (
              <span className={styles.costEntry}>—</span>
            )}
          </div>
          <Button
            variant="primary"
            disabled={tab === 'level' ? !preview || !props.canAfford : !props.canRank}
            onClick={props.onUpgrade}
            data-testid="tavern-upgrade"
          >
            {t('tavern.upgrade')}
          </Button>
        </div>
      )}
    </aside>
  );
}

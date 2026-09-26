import type { Requirement } from '@content/unwritten/types';
import type { Expedition } from '@engine/schema/unwritten-save';
import type { UnwrittenCtx } from '@engine/unwritten/index';
import { unwrittenCommands } from '@state/unwritten/commands';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import type { Act } from './act';
import { LeafHead } from './LeafHead';
import { PASSAGE_NAME } from './marks';
import { line, u } from './strings';
import { mysteryView } from './unwritten-view';
import styles from './Panels.module.css';

/** What a closed choice still needs, in the words the choice would use. */
function needs(requires: Requirement): string {
  const parts: string[] = [];
  if (requires.gilt) parts.push(u('unwritten.ui.mystery.needGilt', { gilt: requires.gilt }));
  if (requires.relics) parts.push(u('unwritten.ui.mystery.needRelic'));
  if (requires.fallen) parts.push(u('unwritten.ui.mystery.needFallen'));
  if (requires.inscriptions) parts.push(u('unwritten.ui.mystery.needInscription'));
  if (requires.blots) parts.push(u('unwritten.ui.mystery.needBlot'));
  return parts.join(' · ');
}

/**
 * A mystery (UNWRITTEN.md §10): a scene the Unwritten has kept, and what the company may do in it.
 * A choice the company cannot yet afford says what it needs; a gamble names its odds only to a
 * Keen Reader. The last choice is always open, so a mystery can always be walked away from.
 */
export function MysteryPanel({ run, ctx, act }: { run: Expedition; ctx: UnwrittenCtx; act: Act }) {
  const view = mysteryView(run, ctx);
  if (!view) return null;
  const { def } = view;
  return (
    <>
      <LeafHead kind="mystery" kicker={u(PASSAGE_NAME.mystery)} title={line(def.name, {})} />
      <div className={styles.mystery}>
        <div className={styles.art}>
          <AbilityIcon icon={def.art} label={line(def.name, {})} size={170} passive decorative />
        </div>
        <div>
          <p className={styles.scene} data-testid="unwritten-mystery-scene">
            {line(def.scene, {})}
          </p>
          <div className={styles.choices}>
            {view.choices.map(({ choice, index, open }) => (
              <button
                key={choice.label}
                type="button"
                className={styles.choice}
                disabled={!open}
                onClick={() => act(() => unwrittenCommands.chooseMystery(index), 'unwritten.page')}
                data-testid={`unwritten-choice-${index}`}
              >
                <span className={styles.choiceLabel}>
                  {line(choice.label, choice.show)}
                  {choice.gamble && view.keen ? (
                    <span className={styles.odds}>
                      {u('unwritten.mystery.odds', { chance: Math.round(choice.gamble.chance * 100) })}
                    </span>
                  ) : null}
                </span>
                <span className={styles.choiceHint}>{line(choice.hint, choice.show)}</span>
                {!open && choice.requires ? (
                  <span className={styles.need}>{needs(choice.requires)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

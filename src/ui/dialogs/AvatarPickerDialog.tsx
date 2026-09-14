import { useMemo } from 'react';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { t, translate } from '@i18n/index';
import { selectActions, selectAvatarChampionId, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import { profileAvatar } from '@ui/champions/art';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

/** Any owned champion can be the profile avatar; the Chronicler's likeness is always available. */
export function AvatarPickerDialog() {
  const actions = useGameStore(selectActions);
  // Opened from the profile: closing or choosing returns there instead of dropping to the game.
  const back = (): void => actions.openDialog({ name: 'profile' });
  const roster = useGameStore(selectRoster);
  const current = useGameStore(selectAvatarChampionId);
  const owned = useMemo(() => {
    const seen = new Set<ChampionId>();
    for (const instance of Object.values(roster)) seen.add(instance.defId);
    return content.champions.filter((c) => seen.has(c.id));
  }, [roster]);
  const none = profileAvatar(null, 128);

  const choose = (id: ChampionId | null): void => {
    const result = actions.setAvatar(id);
    if (result.ok) {
      playSfx('ui.confirm');
      back();
    }
  };

  return (
    <Dialog title={t('avatarPicker.title')} onClose={back} width={900} testId="dialog-avatar-picker">
      <p className={styles.hint}>{t('avatarPicker.body')}</p>
      <div className={styles.avatarGrid}>
        <button
          type="button"
          className={[styles.avatarNone, current === null ? styles.avatarSelected : ''].join(' ')}
          style={{ backgroundImage: `url("${none.url}")` }}
          aria-label={t('avatarPicker.none')}
          aria-pressed={current === null}
          data-testid="avatar-none"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => choose(null)}
        >
          <span className={`display ${styles.avatarNoneLabel}`}>{t('avatarPicker.none')}</span>
        </button>
        {owned.map((def) => (
          <ChampionCard
            key={def.id}
            name={translate(def.name)}
            rarity={def.rarity}
            element={def.element}
            role={def.role}
            stars={0}
            level={0}
            avatar={def.art.avatar}
            tint={def.art.tint}
            placeholder={def.art.placeholder}
            placeholderLabel={t('champions.placeholder')}
            size={96}
            compact
            selected={current === def.id}
            onClick={() => choose(def.id)}
          />
        ))}
      </div>
    </Dialog>
  );
}

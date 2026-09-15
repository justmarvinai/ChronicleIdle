import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { selectActions, selectDialog } from '@state/selectors';
import { useGameStore } from '@state/store';
import { useLevelUpCelebration } from '@ui/hooks/useLevelUpCelebration';
import { AvatarPickerDialog } from './AvatarPickerDialog';
import { ChampionPickerDialog } from './ChampionPickerDialog';
import { BattlePauseDialog } from './BattlePauseDialog';
import { CreditsDialog } from './CreditsDialog';
import { FoodPickerDialog } from './FoodPickerDialog';
import { GearPickerDialog } from './GearPickerDialog';
import { IdleChestDialog } from './IdleChestDialog';
import { ImportConfirmDialog } from './ImportConfirmDialog';
import { LevelUpDialog } from './LevelUpDialog';
import { NewGameConfirmDialog } from './NewGameConfirmDialog';
import { NewGameDialog } from './NewGameDialog';
import { ProfileDialog } from './ProfileDialog';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { SettingsDialog } from './SettingsDialog';
import { SummonHistoryDialog } from './SummonHistoryDialog';
import { SummonRatesDialog } from './SummonRatesDialog';
import { TavernConfirmDialog } from './TavernConfirmDialog';
import { TitlePickerDialog } from './TitlePickerDialog';
import { WalletDialog } from './WalletDialog';
import { WelcomeBackDialog } from './WelcomeBackDialog';

// Development-only tooling; the dynamic import sits in dead code in production builds.
const DebugDialog = import.meta.env.DEV ? lazy(() => import('./DebugDialog')) : null;

/** Renders the open dialog (one at a time) with enter/exit animation. */
export function DialogHost() {
  const dialog = useGameStore(selectDialog);
  const { closeDialog } = useGameStore(selectActions);
  useLevelUpCelebration();
  return (
    <AnimatePresence>
      {dialog?.name === 'settings' ? <SettingsDialog key="settings" onClose={closeDialog} /> : null}
      {dialog?.name === 'profile' ? <ProfileDialog key="profile" onClose={closeDialog} /> : null}
      {dialog?.name === 'wallet' ? <WalletDialog key="wallet" onClose={closeDialog} /> : null}
      {dialog?.name === 'new-game' ? <NewGameDialog key="new-game" onClose={closeDialog} /> : null}
      {dialog?.name === 'new-game-confirm' ? (
        <NewGameConfirmDialog key="new-game-confirm" onClose={closeDialog} />
      ) : null}
      {dialog?.name === 'import-confirm' ? (
        <ImportConfirmDialog
          key="import"
          decoded={dialog.decoded}
          fileName={dialog.fileName}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.name === 'credits' ? <CreditsDialog key="credits" onClose={closeDialog} /> : null}
      {dialog?.name === 'reset-confirm' ? <ResetConfirmDialog key="reset" onClose={closeDialog} /> : null}
      {dialog?.name === 'welcome-back' ? <WelcomeBackDialog key="welcome" onClose={closeDialog} /> : null}
      {/* The pickers return to the profile they were opened from, so they close themselves. */}
      {dialog?.name === 'avatar-picker' ? <AvatarPickerDialog key="avatar" /> : null}
      {dialog?.name === 'title-picker' ? <TitlePickerDialog key="title" /> : null}
      {dialog?.name === 'level-up' ? <LevelUpDialog key="level-up" onClose={closeDialog} /> : null}
      {dialog?.name === 'food-picker' ? (
        <FoodPickerDialog
          key="food-picker"
          instanceId={dialog.instanceId}
          mode={dialog.mode}
          seats={dialog.seats}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.name === 'tavern-confirm' ? (
        <TavernConfirmDialog
          key="tavern-confirm"
          kind={dialog.kind}
          instanceId={dialog.instanceId}
          food={dialog.food}
          brews={dialog.brews}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.name === 'gear-picker' ? (
        <GearPickerDialog
          key="gear-picker"
          instanceId={dialog.instanceId}
          slot={dialog.slot}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.name === 'idle-chest' ? <IdleChestDialog key="idle-chest" onClose={closeDialog} /> : null}
      {dialog?.name === 'summon-rates' ? (
        <SummonRatesDialog key="summon-rates" bannerId={dialog.bannerId} onClose={closeDialog} />
      ) : null}
      {dialog?.name === 'summon-history' ? (
        <SummonHistoryDialog key="summon-history" onClose={closeDialog} />
      ) : null}
      {dialog?.name === 'champion-picker' ? (
        <ChampionPickerDialog key="champion-picker" choiceId={dialog.choiceId} onClose={closeDialog} />
      ) : null}
      {dialog?.name === 'battle-pause' ? <BattlePauseDialog key="pause" onClose={closeDialog} /> : null}
      {DebugDialog && dialog?.name === 'debug' ? (
        <Suspense key="debug" fallback={null}>
          <DebugDialog onClose={closeDialog} />
        </Suspense>
      ) : null}
    </AnimatePresence>
  );
}

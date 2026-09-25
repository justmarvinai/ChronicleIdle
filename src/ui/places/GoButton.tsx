import { t, translate } from '@i18n/index';
import { selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button, type ButtonSize, type ButtonVariant } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { PLACES, placeOpen, type Destination } from './places';
import { useGo } from './use-go';

export interface GoButtonProps {
  destination: Destination;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Says only **Go**, for a card that already names the place beside it; the full "Go to the Tavern"
   * stays its accessible name.
   */
  compact?: boolean;
  /** Where the way leads to the screen it is pressed on — another of its tabs — this is the press. */
  onGo?: () => void;
  className?: string;
  testId?: string;
}

/**
 * "Go to the Tavern": the press that takes a player to where a thing is done, wearing the glyph of
 * the place's door on the hub. A place the chronicle cannot enter yet offers no way there at all —
 * a button onto a locked door would be a promise the game then refuses.
 */
export function GoButton({
  destination,
  variant = 'secondary',
  size = 'sm',
  compact = false,
  onGo,
  className,
  testId,
}: GoButtonProps) {
  const save = useGameStore(selectSave);
  const go = useGo();
  if (!save || !placeOpen(save, destination.place)) return null;
  const full = translate('place.go', { place: destination.to });
  return (
    <Button
      variant={variant}
      size={size}
      sound="ui.open"
      className={className ?? ''}
      icon={<Glyph glyph={PLACES[destination.place].glyph} size={18} color="var(--gold-3)" />}
      onClick={() => (onGo ? onGo() : go(destination.way))}
      aria-label={compact ? full : undefined}
      data-testid={testId}
    >
      {compact ? t('place.goShort') : full}
    </Button>
  );
}

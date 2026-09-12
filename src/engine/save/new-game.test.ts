import { describe, expect, it } from 'vitest';
import { saveSchema } from '@engine/schema/save';
import { createNewGame } from './new-game';

describe('createNewGame', () => {
  it('produces a valid v1 save with starting resources', () => {
    const save = createNewGame({ name: '  Marvin ', now: 1_700_000_000_000, seedRoot: 'seed' });
    expect(saveSchema.safeParse(save).success).toBe(true);
    expect(save.profile.name).toBe('Marvin');
    expect(save.wallet.gold).toBe(2500);
    expect(save.energy.value).toBe(60);
    expect(save.settings.launchFullscreen).toBe(true);
  });
});

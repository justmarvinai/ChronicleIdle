import { describe, expect, it, vi } from 'vitest';
import { hasKey, t, translate } from './index';

describe('i18n', () => {
  it('interpolates params', () => {
    expect(t('common.unlocksAtLevel', { level: 7 })).toBe('Unlocks at level 7');
    expect(t('title.continueAs', { name: 'Eldric', level: 3 })).toBe('Eldric · Level 3');
  });
  it('returns the key and warns once for unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('nope.key')).toBe('nope.key');
    expect(translate('nope.key')).toBe('nope.key');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    expect(hasKey('hub.tavern')).toBe(true);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { hasKey, t, templateParts, translate } from './index';

describe('i18n', () => {
  it('interpolates params', () => {
    expect(t('common.unlocksAtLevel', { level: 7 })).toBe('Unlocks at level 7');
    expect(t('title.card.xp', { xp: '40', next: '120', level: 4 })).toBe('40 / 120 XP to level 4');
  });
  it('returns the key and warns once for unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('nope.key')).toBe('nope.key');
    expect(translate('nope.key')).toBe('nope.key');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    expect(hasKey('hub.tavern')).toBe(true);
  });
  it('splits a string into its literal runs and its slots', () => {
    expect(templateParts('battle.log.hit')).toEqual([
      { kind: 'slot', name: 'source' },
      { kind: 'text', text: ' hits ' },
      { kind: 'slot', name: 'target' },
      { kind: 'text', text: ' for ' },
      { kind: 'slot', name: 'damage' },
      { kind: 'text', text: '.' },
    ]);
    // A string with no slots is one run, and an unknown key is its own name.
    expect(templateParts('battle.log')).toEqual([{ kind: 'text', text: 'Battle log' }]);
    expect(templateParts('nope.key')).toEqual([{ kind: 'text', text: 'nope.key' }]);
  });
});

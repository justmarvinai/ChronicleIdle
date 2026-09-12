import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from './manifest-types';
import { atlas, audioVariants, avatarUrl, backdrop, imageUrl, setManifestForTests } from './manifest';

describe('asset manifest runtime', () => {
  setManifestForTests(
    JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
  );

  it('resolves images, sets, atlases and audio', () => {
    expect(imageUrl('ui.dark_ember.frame_wide')).toMatch(
      /^\/assets\/generated\/ui\/dark-ember\/frame_wide\.[0-9a-f]{10}\.png$/,
    );
    expect(avatarUrl('avatar.anuria', 256)).toContain('anuria-256');
    expect(imageUrl('spell.rune_radiant_gem', 'thumb')).toContain('-64.');
    expect(backdrop('bg.bg8').placeholder).toMatch(/^data:image\/webp;base64,/);
    expect(atlas('model.anuria').animations['idle']?.frames).toHaveLength(9);
    expect(audioVariants('sfx.sword.sword_impact_hit').variants).toHaveLength(3);
  });
});

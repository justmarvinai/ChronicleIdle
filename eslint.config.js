// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Layer boundaries (CLAUDE.md §5.1). `i18n` and `assets` are leaves anyone may import;
 * `platform` is a leaf for state/ui/app/audio/render. Type-only imports may go engine → content.
 */
const layer = (type, folder) => ({ type, pattern: `src/${folder}/**/*`, mode: 'full' });

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'playwright-report/**', 'test-results/**', 'coverage/**', '**/*.generated.ts', 'game/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.es2022 } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: 'Use the seeded Rng from @engine/rng (CLAUDE.md §5.2).' },
      ],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, boundaries },
    settings: {
      'import/resolver': { typescript: { project: ['tsconfig.json'] } },
      'boundaries/elements': [
        layer('app', 'app'),
        layer('engine', 'engine'),
        // Tunables and id/type modules are the part of content the engine may read directly;
        // definitions (champions, stages, …) reach the engine only through the registry parameter.
        { type: 'balance', pattern: ['src/content/balance/**/*', 'src/content/**/types.ts'], mode: 'full' },
        layer('content', 'content'),
        layer('state', 'state'),
        layer('ui', 'ui'),
        layer('render', 'render'),
        layer('audio', 'audio'),
        layer('platform', 'platform'),
        layer('i18n', 'i18n'),
        layer('assets', 'assets'),
      ],
      'boundaries/ignore': ['**/*.test.{ts,tsx}', 'src/*.d.ts'],
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['balance'], allow: ['balance', 'assets', 'i18n'] },
            { from: ['balance'], allow: ['balance', 'content', 'engine', 'assets', 'i18n'], importKind: 'type' },
            { from: ['content'], allow: ['content', 'balance', 'assets', 'i18n', 'engine'] },
            { from: ['engine'], allow: ['engine', 'balance', 'i18n'] },
            { from: ['engine'], allow: ['engine', 'balance', 'content', 'assets', 'i18n'], importKind: 'type' },
            { from: ['state'], allow: ['state', 'engine', 'balance', 'content', 'platform', 'assets', 'i18n'] },
            { from: ['render'], allow: ['render', 'engine', 'state', 'balance', 'content', 'assets', 'platform'] },
            { from: ['audio'], allow: ['audio', 'assets', 'state', 'platform', 'balance', 'content'] },
            { from: ['ui'], allow: ['ui', 'state', 'engine', 'balance', 'content', 'render', 'audio', 'assets', 'i18n', 'platform'] },
            { from: ['platform'], allow: ['platform', 'engine'], importKind: 'type' },
            { from: ['platform'], allow: ['platform'] },
            { from: ['i18n'], allow: ['i18n'] },
            { from: ['assets'], allow: ['assets'] },
            { from: ['app'], allow: ['app', 'engine', 'balance', 'content', 'state', 'ui', 'render', 'audio', 'platform', 'i18n', 'assets'] },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../*'], message: 'Cross-boundary relative imports are forbidden; use the @alias of the layer (CLAUDE.md §4).' }] },
      ],
    },
  },
  {
    // Engine must stay framework- and platform-free.
    files: ['src/engine/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', 'pixi.js', 'howler', 'zustand', 'gsap', 'motion', 'idb'],
          patterns: [{ group: ['../*'], message: 'Cross-boundary relative imports are forbidden; use the @alias of the layer.' }],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB', 'navigator', 'performance'],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Engine code receives a Clock (CLAUDE.md §5.2).' },
      ],
    },
  },
  { files: ['tools/**/*.ts', 'tests/**/*.ts', '*.config.ts', 'vitest.setup*.ts'], rules: { 'no-console': 'off', 'no-restricted-syntax': 'off' } },
  prettier,
);

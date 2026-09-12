import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const alias = (name: string) => fileURLToPath(new URL(`./src/${name}`, import.meta.url));
const aliases = {
  '@app': alias('app'),
  '@engine': alias('engine'),
  '@content': alias('content'),
  '@state': alias('state'),
  '@ui': alias('ui'),
  '@render': alias('render'),
  '@audio': alias('audio'),
  '@platform': alias('platform'),
  '@i18n': alias('i18n'),
  '@assets': alias('assets'),
};

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { alias: aliases },
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/engine/**/*.test.ts',
            'src/content/**/*.test.ts',
            'src/state/**/*.test.ts',
            'src/platform/**/*.test.ts',
            'src/i18n/**/*.test.ts',
            'tools/**/*.test.ts',
          ],
          setupFiles: ['./vitest.setup.node.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: [
            'src/ui/**/*.test.{ts,tsx}',
            'src/app/**/*.test.{ts,tsx}',
            'src/audio/**/*.test.ts',
            'src/render/**/*.test.ts',
          ],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
    coverage: { provider: 'v8', include: ['src/engine/**', 'src/state/**', 'src/content/**'] },
  },
});

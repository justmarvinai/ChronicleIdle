import { fileURLToPath, URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const alias = (name: string) => fileURLToPath(new URL(`./src/${name}`, import.meta.url));

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

interface ManifestSlice {
  entries: Record<string, { kind: string; url?: string; sizes?: Record<string, { url: string }> }>;
}

/**
 * Preload hints for the images the title paints first (logo, backdrop), so the largest paint does
 * not wait for the JS → manifest → image round trips. Skipped when the asset build has not run.
 */
function preloadBootImages(): Plugin {
  return {
    name: 'chronicle-preload-boot-images',
    transformIndexHtml() {
      const path = fileURLToPath(new URL('./public/assets/generated/manifest.json', import.meta.url));
      if (!existsSync(path)) return [];
      const manifest = JSON.parse(readFileSync(path, 'utf8')) as ManifestSlice;
      const urls = [
        manifest.entries['logo.chronicle_idle_png']?.url,
        manifest.entries['bg.bg9']?.sizes?.['full']?.url,
      ].filter((url): url is string => typeof url === 'string');
      return urls.map((href) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'image', href },
        injectTo: 'head' as const,
      }));
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    preloadBootImages(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: '/',
        name: 'ChronicleIdle',
        short_name: 'ChronicleIdle',
        description: 'A turn-based idle gacha champion-collection RPG.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0b0a0d',
        theme_color: '#0b0a0d',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache: the app shell (hashed build output) and the UI asset group. Large groups
        // (models, backdrops, audio, VFX) are runtime-cached on first use (ARCHITECTURE.md §11).
        globPatterns: [
          '**/*.{js,css,html,woff2,ico,svg,webmanifest}',
          'assets/generated/manifest.json',
          'assets/generated/ui/**/*',
        ],
        globIgnores: [
          '**/node_modules/**',
          'assets/generated/audio/**',
          'assets/generated/backdrops/**',
          'assets/generated/models/**',
          'assets/generated/avatars/**',
          'assets/generated/vfx/**',
          'assets/generated/spells/**',
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/generated/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'chronicle-assets',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
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
    },
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly', generateScopedName: '[name]__[local]__[hash:base64:5]' },
  },
  server: { port: 5173, strictPort: true, host: true },
  preview: { port: 4173, strictPort: true, host: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 900,
  },
});

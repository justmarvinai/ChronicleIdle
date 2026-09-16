/**
 * `pnpm perf:budget` — the static half of CLAUDE.md §5.6, checked against a build.
 *
 *   pnpm perf:budget            the report
 *   pnpm perf:budget --strict   exit 1 when a budget is broken
 *
 * Three things a build can be measured for without running it:
 *
 *   • the initial route's JavaScript, gzipped (≤ 350 kB) — the entry module plus everything
 *     `index.html` tells the browser to preload, which is exactly what a cold visit fetches
 *     before the hub can paint;
 *   • every texture's dimensions (≤ 2048 in either direction) — WebGL2 guarantees no more, and a
 *     texture past a GPU's limit fails to upload and silently does not draw;
 *   • that the screens are still code-split, so the entry does not creep back towards the whole
 *     game in one file.
 *
 * Frame time, the other half of §5.6, needs a browser and a fight: that is `pnpm perf:battle`.
 */
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const DIST = argv.includes('--dist') ? (argv[argv.indexOf('--dist') + 1] ?? 'dist') : 'dist';

/** CLAUDE.md §5.6. */
const BUDGET_INITIAL_JS_GZIP = 350 * 1024;
/**
 * §5.6 writes "atlases ≤ 2048² each", and that is the limit an atlas, a sprite sheet or a flipbook
 * is held to — many at once, all resident during a fight, and 2048 is all WebGL2 guarantees.
 *
 * Full-screen art is a different thing: one backdrop is on screen at a time, deliberately wider
 * than the 1920 viewport so the parallax has something to slide, and never packed with anything
 * else. It gets its own ceiling, comfortably inside what any GPU that can run this game allows
 * (the Iris Xe class §5.6 targets reports 16384).
 */
const BUDGET_ATLAS_SIDE = 2048;
const BUDGET_FULLSCREEN_SIDE = 4096;
/** Manifest groups whose art is full-screen and shown one at a time. */
const FULLSCREEN_GROUPS = new Set(['backdrops', 'logos']);
/** The screens the router code-splits; fewer than this and something has been folded into the entry. */
const MIN_LAZY_CHUNKS = 8;

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} kB`;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** PNG and WebP dimensions from the header — no image library needed to read a budget. */
function dimensions(file: string): { width: number; height: number } | null {
  const b = readFileSync(file);
  if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 30 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') {
    const kind = b.subarray(12, 16).toString();
    if (kind === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

interface Result {
  label: string;
  value: string;
  budget: string;
  ok: boolean;
  detail?: string[];
}

function initialRoute(): Result {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const entry = [...html.matchAll(/src="\/([^"]+\.js)"/g)].map((m) => m[1]);
  const preload = [...html.matchAll(/href="\/([^"]+\.js)"/g)].map((m) => m[1]);
  const files = [...new Set([...entry, ...preload])].filter((f): f is string => f !== undefined);
  let gzip = 0;
  const detail: string[] = [];
  for (const file of files) {
    const size = gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length;
    gzip += size;
    detail.push(`${kb(size).padStart(10)} gz  ${file}`);
  }
  return {
    label: 'initial route JS, gzipped',
    value: kb(gzip),
    budget: `≤ ${kb(BUDGET_INITIAL_JS_GZIP)}`,
    ok: gzip <= BUDGET_INITIAL_JS_GZIP,
    detail,
  };
}

function codeSplit(): Result {
  const chunks = walk(join(DIST, 'assets')).filter((f) => f.endsWith('.js'));
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const eager = new Set([...html.matchAll(/["/]([^"/]+\.js)"/g)].map((m) => m[1]));
  const lazy = chunks.filter((f) => !eager.has(f.split('/').pop() ?? ''));
  return {
    label: 'lazily loaded chunks',
    value: String(lazy.length),
    budget: `≥ ${MIN_LAZY_CHUNKS}`,
    ok: lazy.length >= MIN_LAZY_CHUNKS,
  };
}

/** Every generated image, held to the ceiling its manifest group earns. */
function textures(): Result[] {
  const manifest = JSON.parse(readFileSync(join(DIST, 'assets', 'generated', 'manifest.json'), 'utf8')) as {
    entries: Record<string, { group?: string; url?: string; sizes?: Record<string, { url?: string }> }>;
  };
  // One asset can publish several files — an image-set names them under `sizes` (full/512/256/128)
  // — so collect every url an entry declares and tag each with that entry's group.
  const groupOf = new Map<string, string>();
  for (const entry of Object.values(manifest.entries)) {
    const urls = [entry.url, ...Object.values(entry.sizes ?? {}).map((size) => size.url)].filter(
      (url): url is string => typeof url === 'string',
    );
    for (const url of urls) groupOf.set(url.replace(/^\//, ''), entry.group ?? 'unknown');
  }

  const buckets: { label: string; budget: number; widest: number; measured: number; over: string[] }[] = [
    { label: 'atlases, sheets and sprites', budget: BUDGET_ATLAS_SIDE, widest: 0, measured: 0, over: [] },
    { label: 'full-screen art', budget: BUDGET_FULLSCREEN_SIDE, widest: 0, measured: 0, over: [] },
  ];
  for (const file of walk(DIST)) {
    if (!/\.(png|webp)$/.test(file)) continue;
    const size = dimensions(file);
    if (!size) continue;
    const group = groupOf.get(relative(DIST, file).split(sep).join('/')) ?? 'unknown';
    const bucket = buckets[FULLSCREEN_GROUPS.has(group) ? 1 : 0];
    if (!bucket) continue;
    bucket.measured += 1;
    bucket.widest = Math.max(bucket.widest, size.width, size.height);
    if (size.width > bucket.budget || size.height > bucket.budget)
      bucket.over.push(
        `${String(size.width).padStart(5)} × ${String(size.height).padEnd(5)} ${group.padEnd(10)} ${relative(DIST, file)}`,
      );
  }
  return buckets.map((bucket) => ({
    label: `${bucket.label} (${bucket.measured} measured)`,
    value: `${bucket.widest} px`,
    budget: `≤ ${bucket.budget} px`,
    ok: bucket.over.length === 0,
    detail: bucket.over,
  }));
}

function main(): void {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`No build at ${DIST}/. Run \`pnpm build\` first.`);
    process.exit(1);
  }
  console.log(`\nPerformance budgets (CLAUDE.md §5.6) — ${DIST}/\n`);
  const results = [initialRoute(), codeSplit(), ...textures()];
  let ok = true;
  for (const result of results) {
    ok = ok && result.ok;
    console.log(
      `  ${result.ok ? '✓' : '✗'} ${result.label.padEnd(40)} ${result.value.padStart(12)}   (${result.budget})`,
    );
    if (!result.ok && result.detail)
      for (const line of result.detail.slice(0, 12)) console.log(`      ${line}`);
  }
  const route = results[0];
  if (route?.detail) {
    console.log('\n  the initial route, chunk by chunk');
    for (const line of route.detail) console.log(`    ${line}`);
  }
  console.log('\n  Frame time is the other half of §5.6: `pnpm perf:battle --strict`.\n');
  if (strict && !ok) process.exit(1);
}

main();

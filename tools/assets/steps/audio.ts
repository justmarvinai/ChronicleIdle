import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AudioEntry, AudioVariant } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { encodeOgg } from '../lib/ogg.ts';
import { SOURCE_ROOT, listDirs, listFiles, pMap, sanitize } from '../lib/util.ts';
import { decodeWav, normalizePeak, rmsDb } from '../lib/wav.ts';

const AUDIO_ROOT = join(SOURCE_ROOT, 'music_and_sounds');
/** Vorbis VBR quality (−0.1 … 1). Ambience beds are long and forgiving; SFX are short and bright. */
const Q_AMBIENCE = 0.3;
const Q_SFX = 0.45;

/** Owner SFX folders → manifest category. New folders fall back to their sanitised folder name. */
const SFX_CATEGORY: Record<string, string> = {
  'Attacks/Sword Attacks Hits and Blocks': 'sword',
  'Attacks/Bow Attacks Hits and Blocks': 'bow',
  'Chopping and Mining': 'mining',
  'Doors Gates and Chests': 'doors',
  'Footsteps/Dirt': 'footsteps_dirt',
  'Footsteps/Stone': 'footsteps_stone',
  'Footsteps/Water': 'footsteps_water',
  'Footsteps/Wood': 'footsteps_wood',
  Spells: 'spells',
  Torch: 'torch',
  'Waterfalls Rivers and Streams': 'water',
};

async function wavToOgg(source: string, quality: number): Promise<{ data: Buffer; duration: number; rmsDb: number }> {
  const decoded = decodeWav(await readFile(source));
  normalizePeak(decoded.channels, -1);
  const level = rmsDb(decoded.channels);
  const data = await encodeOgg(decoded.channels, decoded.sampleRate, quality);
  return { data, duration: Math.round(decoded.duration * 1000) / 1000, rmsDb: Math.round(level * 10) / 10 };
}

async function buildMusic(ctx: BuildContext): Promise<void> {
  const dir = join(AUDIO_ROOT, 'background_music');
  for (const file of await listFiles(dir, (f) => /\.(mp3|ogg)$/i.test(f))) {
    const source = join(dir, file);
    const name = sanitize(file.replace(/\.(mp3|ogg)$/i, '')).replace(/^background_music_/, '');
    await ctx.cached(`music:${file}`, [source], async () => {
      const data = await readFile(source);
      const out = await ctx.emit('audio/music', name, file.slice(file.lastIndexOf('.')), data);
      const entry: AudioEntry = { kind: 'audio', group: 'music', loop: true, variants: [{ url: out.url, duration: 0, rmsDb: 0 }] };
      return { outputs: [out.rel], entries: { [`music.${name}`]: entry } };
    });
  }
}

function ambienceVariant(fileStem: string): string {
  const lower = fileStem.toLowerCase();
  if (lower.endsWith(' rain')) return 'rain';
  if (lower.endsWith(' storm')) return 'storm';
  return 'clear';
}

async function buildAmbience(ctx: BuildContext): Promise<void> {
  const dir = join(AUDIO_ROOT, 'ambience_sounds');
  // WAV sets: <Set>/<Set> [Rain|Storm].wav
  for (const set of await listDirs(dir)) {
    const setKey = sanitize(set);
    const files = await listFiles(join(dir, set), (f) => /\.wav$/i.test(f));
    await pMap(files, async (file) => {
      const source = join(dir, set, file);
      const variant = ambienceVariant(file.replace(/\.wav$/i, ''));
      await ctx.cached(`ambience:${set}/${file}`, [source], async () => {
        const { data, duration, rmsDb: level } = await wavToOgg(source, Q_AMBIENCE);
        const out = await ctx.emit('audio/ambience', `${setKey}-${variant}`, 'ogg', data);
        const entry: AudioEntry = { kind: 'audio', group: 'ambience', loop: true, variants: [{ url: out.url, duration, rmsDb: level }] };
        return { outputs: [out.rel], entries: { [`ambience.${setKey}.${variant}`]: entry } };
      });
    }, 2);
  }
  // Loose MP3 loops: "<Set>_ambience_…_#N-….mp3" → ambience.<set>.alt_N (names carry mis-encoded dashes; never renamed).
  const loose = await listFiles(dir, (f) => /\.mp3$/i.test(f));
  const counters = new Map<string, number>();
  for (const file of loose) {
    const source = join(dir, file);
    const setMatch = /^([A-Za-z]+)_ambience/i.exec(file);
    const set = sanitize(setMatch?.[1] ?? 'misc');
    const numbered = /#(\d+)/.exec(file);
    let n = numbered ? Number(numbered[1]) : (counters.get(set) ?? 0) + 1;
    while ([...ctx.entries.keys()].includes(`ambience.${set}.alt_${n}`)) n += 100;
    counters.set(set, n);
    await ctx.cached(`ambience:${file}`, [source], async () => {
      const data = await readFile(source);
      const out = await ctx.emit('audio/ambience', `${set}-alt-${n}`, 'mp3', data);
      const entry: AudioEntry = { kind: 'audio', group: 'ambience', loop: true, variants: [{ url: out.url, duration: 0, rmsDb: 0 }] };
      return { outputs: [out.rel], entries: { [`ambience.${set}.alt_${n}`]: entry } };
    });
  }
}

async function buildSfx(ctx: BuildContext): Promise<void> {
  const root = join(AUDIO_ROOT, 'sfx');
  const folders: string[] = [];
  const collect = async (rel: string): Promise<void> => {
    const subs = await listDirs(join(root, rel));
    const files = await listFiles(join(root, rel), (f) => /\.wav$/i.test(f));
    if (files.length) folders.push(rel);
    for (const sub of subs) await collect(rel ? `${rel}/${sub}` : sub);
  };
  await collect('');
  for (const folder of folders) {
    const category = SFX_CATEGORY[folder] ?? sanitize(folder);
    const files = await listFiles(join(root, folder), (f) => /\.wav$/i.test(f));
    // Group "Name 1.wav", "Name 2.wav" into one key with variants.
    const groups = new Map<string, string[]>();
    for (const file of files) {
      const stem = file.replace(/\.wav$/i, '');
      const base = stem.replace(/\s+\d+$/, '');
      const list = groups.get(base) ?? [];
      list.push(file);
      groups.set(base, list);
    }
    for (const [base, variants] of groups) {
      const name = sanitize(base);
      const sources = variants.map((v) => join(root, folder, v));
      const loop = /loop/i.test(base);
      await ctx.cached(`sfx:${folder}/${base}`, sources, async () => {
        const outputs: string[] = [];
        const encoded: AudioVariant[] = [];
        for (const [i, source] of sources.entries()) {
          const { data, duration, rmsDb: level } = await wavToOgg(source, Q_SFX);
          const out = await ctx.emit(`audio/sfx/${category}`, variants.length > 1 ? `${name}-${i + 1}` : name, 'ogg', data);
          outputs.push(out.rel);
          encoded.push({ url: out.url, duration, rmsDb: level });
        }
        const entry: AudioEntry = { kind: 'audio', group: 'audio', loop, variants: encoded };
        return { outputs, entries: { [`sfx.${category}.${name}`]: entry } };
      });
    }
  }
}

export async function buildAudio(ctx: BuildContext): Promise<void> {
  await buildMusic(ctx);
  await buildAmbience(ctx);
  await buildSfx(ctx);
}

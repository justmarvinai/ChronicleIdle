import { createOggEncoder, type WasmEncoder } from 'wasm-media-encoders';

/**
 * libvorbis stamps every stream with a random serial number, so encoding the same PCM twice gives
 * different bytes — which changes every audio asset's content hash and, with it, the committed
 * manifest on every build (CI's `git diff --exit-code` on the typed manifest caught this). The
 * stream is rewritten with a fixed serial and repaired CRCs so a build is reproducible.
 */
const OGG_SERIAL = 0;
const CRC_TABLE = ((): Uint32Array => {
  // Ogg's CRC-32: polynomial 0x04c11db7, no reflection, init 0, no final xor.
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i << 24;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x80000000) !== 0 ? (crc << 1) ^ 0x04c11db7 : crc << 1;
    table[i] = crc >>> 0;
  }
  return table;
})();

function oggCrc(page: Buffer): number {
  let crc = 0;
  for (const byte of page) crc = ((crc << 8) ^ (CRC_TABLE[((crc >>> 24) ^ byte) & 0xff] as number)) >>> 0;
  return crc >>> 0;
}

/** Rewrites every page header with a fixed stream serial and the CRC that follows from it. */
export function normaliseOgg(data: Buffer): Buffer {
  let offset = 0;
  while (offset + 27 <= data.length) {
    if (data.toString('latin1', offset, offset + 4) !== 'OggS')
      throw new Error(`Ogg page expected at byte ${offset}`);
    const segments = data.readUInt8(offset + 26);
    const tableEnd = offset + 27 + segments;
    if (tableEnd > data.length) throw new Error('Truncated Ogg segment table');
    let body = 0;
    for (let i = 0; i < segments; i += 1) body += data.readUInt8(offset + 27 + i);
    const end = tableEnd + body;
    if (end > data.length) throw new Error('Truncated Ogg page body');
    const page = data.subarray(offset, end);
    page.writeUInt32LE(OGG_SERIAL, 14);
    page.writeUInt32LE(0, 22);
    page.writeUInt32LE(oggCrc(page), 22);
    offset = end;
  }
  if (offset !== data.length) throw new Error('Trailing bytes after the last Ogg page');
  return data;
}

let encoderPromise: Promise<WasmEncoder> | undefined;

async function encoder(): Promise<WasmEncoder> {
  encoderPromise ??= createOggEncoder();
  return encoderPromise;
}

/** Encodes PCM (1–2 channels, Float32 −1..1) to Ogg Vorbis. Serialised: the WASM encoder is single-instance. */
let queue: Promise<unknown> = Promise.resolve();
export function encodeOgg(channels: Float32Array[], sampleRate: number, vbrQuality: number): Promise<Buffer> {
  const run = async (): Promise<Buffer> => {
    const enc = await encoder();
    const stereo: Float32Array[] =
      channels.length >= 2
        ? [channels[0] as Float32Array, channels[1] as Float32Array]
        : [channels[0] as Float32Array];
    enc.configure({ sampleRate, channels: stereo.length === 2 ? 2 : 1, vbrQuality });
    const parts: Buffer[] = [];
    const chunk = 65536;
    const total = (stereo[0] as Float32Array).length;
    for (let start = 0; start < total; start += chunk) {
      const slice = stereo.map((ch) => ch.subarray(start, Math.min(total, start + chunk)));
      parts.push(Buffer.from(enc.encode(slice)));
    }
    parts.push(Buffer.from(enc.finalize()));
    return normaliseOgg(Buffer.concat(parts));
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

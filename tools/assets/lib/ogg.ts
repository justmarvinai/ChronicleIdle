import { createOggEncoder, type WasmEncoder } from 'wasm-media-encoders';

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
    return Buffer.concat(parts);
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

/** Minimal RIFF/WAVE decoder for 8/16/24/32-bit PCM and 32-bit float. */
export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
  duration: number;
}

export function decodeWav(buffer: Buffer): DecodedAudio {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }
  let offset = 12;
  let format = 1;
  let channelCount = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = buffer.readUInt16LE(body);
      channelCount = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
      if (format === 0xfffe) format = buffer.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE
    } else if (id === 'data') {
      dataStart = body;
      dataLength = Math.min(size, buffer.length - body);
      break;
    }
    offset = body + size + (size % 2);
  }
  if (dataStart < 0 || channelCount === 0) throw new Error('WAV without fmt/data chunk');
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * channelCount));
  const channels = Array.from({ length: channelCount }, () => new Float32Array(frameCount));
  let pos = dataStart;
  for (let i = 0; i < frameCount; i++) {
    for (let c = 0; c < channelCount; c++) {
      let value: number;
      if (format === 3 && bitsPerSample === 32) value = buffer.readFloatLE(pos);
      else if (bitsPerSample === 16) value = buffer.readInt16LE(pos) / 32768;
      else if (bitsPerSample === 24) value = ((buffer[pos] as number) | ((buffer[pos + 1] as number) << 8) | ((buffer[pos + 2] as number) << 16) | (((buffer[pos + 2] as number) & 0x80) ? 0xff000000 : 0)) / 8388608;
      else if (bitsPerSample === 32) value = buffer.readInt32LE(pos) / 2147483648;
      else if (bitsPerSample === 8) value = ((buffer[pos] as number) - 128) / 128;
      else throw new Error(`Unsupported WAV bit depth ${bitsPerSample}`);
      (channels[c] as Float32Array)[i] = value;
      pos += bytesPerSample;
    }
  }
  return { sampleRate, channels, duration: frameCount / sampleRate };
}

export function peak(channels: Float32Array[]): number {
  let max = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) max = Math.max(max, Math.abs(ch[i] as number));
  return max;
}

export function rmsDb(channels: Float32Array[]): number {
  let sum = 0;
  let count = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i] as number;
      sum += v * v;
      count++;
    }
  }
  if (count === 0) return -96;
  const rms = Math.sqrt(sum / count);
  return rms > 0 ? 20 * Math.log10(rms) : -96;
}

/** Scales so that the peak sits at `targetDb` (default −1 dBFS). Never amplifies above ×8. */
export function normalizePeak(channels: Float32Array[], targetDb = -1): void {
  const p = peak(channels);
  if (p === 0) return;
  const gain = Math.min(8, Math.pow(10, targetDb / 20) / p);
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] = (ch[i] as number) * gain;
}

export function toStereo(channels: Float32Array[]): [Float32Array, Float32Array] {
  const left = channels[0] as Float32Array;
  const right = channels[1] ?? left;
  return [left, right];
}

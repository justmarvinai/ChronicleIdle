import { describe, expect, it } from 'vitest';
import { encodeOgg, normaliseOgg } from './ogg.ts';

/** Builds one Ogg page with the given serial and a deliberately wrong CRC. */
function page(serial: number, body: Buffer): Buffer {
  const header = Buffer.alloc(27 + 1);
  header.write('OggS', 0, 'latin1');
  header.writeUInt8(0, 4); // version
  header.writeUInt8(0x02, 5); // first page of the stream
  header.writeBigUInt64LE(0n, 6); // granule position
  header.writeUInt32LE(serial, 14);
  header.writeUInt32LE(0, 18); // page sequence
  header.writeUInt32LE(0xdeadbeef, 22); // CRC, to be repaired
  header.writeUInt8(1, 26); // one segment…
  header.writeUInt8(body.length, 27); // …of this many bytes
  return Buffer.concat([header, body]);
}

describe('normaliseOgg', () => {
  it('rewrites every page serial and repairs the CRC', () => {
    const stream = Buffer.concat([
      page(0x11223344, Buffer.from([1, 2, 3, 4])),
      page(0x11223344, Buffer.from([9, 9])),
    ]);
    const normalised = normaliseOgg(Buffer.from(stream));
    expect(normalised.readUInt32LE(14)).toBe(0);
    // The same PCM encoded twice differs only in the serial, so a fixed one makes builds
    // reproducible — the whole point of the rewrite.
    const other = normaliseOgg(
      Buffer.concat([page(0x55667788, Buffer.from([1, 2, 3, 4])), page(1, Buffer.from([9, 9]))]),
    );
    expect(other.equals(normalised)).toBe(true);
    // The repaired CRC is a real CRC, not the placeholder.
    expect(normalised.readUInt32LE(22)).not.toBe(0xdeadbeef);
    expect(normaliseOgg(Buffer.from(normalised)).equals(normalised)).toBe(true);
  });

  it('refuses a stream that is not a run of whole pages', () => {
    expect(() => normaliseOgg(Buffer.alloc(64, 7))).toThrow(/Ogg page expected/);
    expect(() => normaliseOgg(Buffer.concat([page(1, Buffer.from([1])), Buffer.from([0])]))).toThrow(
      /Trailing bytes/,
    );
    expect(() => normaliseOgg(page(1, Buffer.from([1, 2, 3])).subarray(0, 20))).toThrow(/Trailing bytes/);
  });

  it('encodes the same PCM to the same bytes twice', async () => {
    const samples = new Float32Array(4_096);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.sin(i / 16) * 0.5;
    const first = await encodeOgg([samples], 48_000, 3);
    const second = await encodeOgg([samples], 48_000, 3);
    expect(first.equals(second)).toBe(true);
  });
});

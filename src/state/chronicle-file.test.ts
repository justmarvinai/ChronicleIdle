import { describe, expect, it } from 'vitest';
import { createNewGame } from '@engine/save/new-game';
import { chronicleFileName, decodeChronicleFile, encodeChronicleFile } from './chronicle-file';

describe('chronicle file', () => {
  const save = createNewGame({ name: 'Eldric the Wise', now: 1_700_000_000_000, seedRoot: 'seed' });

  it('round-trips and names the file', async () => {
    const text = await encodeChronicleFile(save, '0.0.0', 1_700_000_100_000);
    const decoded = await decodeChronicleFile(text);
    expect(decoded.save).toEqual(save);
    expect(decoded.appVersion).toBe('0.0.0');
    expect(chronicleFileName(save, new Date(2026, 8, 12, 9, 5).getTime())).toBe(
      'Eldric_the_Wise-20260912-0905.chronicle',
    );
  });

  it('detects tampering and garbage', async () => {
    const text = await encodeChronicleFile(save, '0.0.0', 0);
    const envelope = JSON.parse(text) as { payload: string };
    envelope.payload = envelope.payload.slice(0, -4) + 'AAAA';
    await expect(decodeChronicleFile(JSON.stringify(envelope))).rejects.toThrow(/checksum/);
    await expect(decodeChronicleFile('not json')).rejects.toThrow(/format/);
    await expect(decodeChronicleFile('{"magic":"other"}')).rejects.toThrow(/format/);
  });
});

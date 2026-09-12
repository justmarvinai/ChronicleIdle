/**
 * `.chronicle` export/import format: a small JSON envelope with a base64 payload and a SHA-256
 * checksum of the payload, so damaged or edited files are detected before anything is replaced.
 */
import { SaveError } from '@engine/errors';
import type { SaveGame } from '@engine/schema/save';
import { sha256Hex } from '@platform/checksum';
import { migrateSave } from './migrations';

export const CHRONICLE_FILE_FORMAT = 1;
export const CHRONICLE_EXTENSION = '.chronicle';

interface Envelope {
  magic: 'chronicleidle';
  format: number;
  appVersion: string;
  exportedAt: number;
  checksum: string;
  payload: string;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function encodeChronicleFile(save: SaveGame, appVersion: string, now: number): Promise<string> {
  const payload = toBase64(JSON.stringify(save));
  const envelope: Envelope = {
    magic: 'chronicleidle',
    format: CHRONICLE_FILE_FORMAT,
    appVersion,
    exportedAt: now,
    checksum: await sha256Hex(payload),
    payload,
  };
  return JSON.stringify(envelope, null, 0);
}

export function chronicleFileName(save: SaveGame, now: number): string {
  const d = new Date(now);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const safeName = save.profile.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'chronicle';
  return `${safeName}-${stamp}${CHRONICLE_EXTENSION}`;
}

export interface DecodedChronicle {
  save: SaveGame;
  exportedAt: number;
  appVersion: string;
  migrated: boolean;
}

export async function decodeChronicleFile(text: string): Promise<DecodedChronicle> {
  let envelope: Partial<Envelope>;
  try {
    envelope = JSON.parse(text) as Partial<Envelope>;
  } catch {
    throw new SaveError('save_invalid', 'format');
  }
  if (
    envelope.magic !== 'chronicleidle' ||
    typeof envelope.payload !== 'string' ||
    typeof envelope.checksum !== 'string'
  ) {
    throw new SaveError('save_invalid', 'format');
  }
  if (envelope.format !== CHRONICLE_FILE_FORMAT)
    throw new SaveError('save_version_unsupported', 'format', { version: envelope.format });
  if ((await sha256Hex(envelope.payload)) !== envelope.checksum)
    throw new SaveError('save_invalid', 'checksum');
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64(envelope.payload));
  } catch {
    throw new SaveError('save_invalid', 'format');
  }
  const { save, migrated } = migrateSave(raw);
  return {
    save,
    migrated,
    exportedAt: envelope.exportedAt ?? 0,
    appVersion: envelope.appVersion ?? 'unknown',
  };
}

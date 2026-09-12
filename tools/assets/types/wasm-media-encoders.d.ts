declare module 'wasm-media-encoders' {
  export interface WasmEncoder {
    configure(options: { sampleRate: number; channels: 1 | 2; vbrQuality?: number; bitrate?: number }): void;
    /** Returns a view owned by the encoder; copy it before the next call. */
    encode(channels: Float32Array[]): Uint8Array;
    finalize(): Uint8Array;
  }
  export function createOggEncoder(): Promise<WasmEncoder>;
  export function createMp3Encoder(): Promise<WasmEncoder>;
}

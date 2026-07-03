/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { decodeGzipJson } from '@/data/gunzip';

describe('decodeGzipJson', () => {
  it('decompresses gzip bytes and parses JSON', async () => {
    const obj = { '01007': ['E5-TCM', 'C550', '00', 'CESSNA 550 Citation S2'] };
    const gz = gzipSync(Buffer.from(JSON.stringify(obj)));
    const ab = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength);
    const result = await decodeGzipJson(ab as ArrayBuffer);
    expect(result).toEqual(obj);
  });
});

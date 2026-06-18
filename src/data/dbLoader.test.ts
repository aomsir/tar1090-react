import { afterEach, describe, it, expect, vi } from 'vitest';
import { DbLoader, type ShardData, type ShardFetcher } from './dbLoader';

function makeLoader(shards: Record<string, ShardData | null>) {
  const fetchShard = vi.fn(async (bkey: string) => shards[bkey] ?? null);
  return { loader: new DbLoader(fetchShard), fetchShard };
}

describe('DbLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fetches default tar1090 JS database shards from db-0c1185b', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ '802E7': ['B-1234', 'B738', '00', 'BOEING 737-800'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchFn);

    await expect(new DbLoader().lookup('7802E7')).resolves.toEqual([
      'B-1234',
      'B738',
      '00',
      'BOEING 737-800',
    ]);

    expect(fetchFn).toHaveBeenCalledWith('/db-0c1185b/7.js');
  });

  it('allows overriding the tar1090 database folder via VITE_DB_FOLDER', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ '802E7': ['B-1234', 'B738', '00', 'BOEING 737-800'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchFn);
    vi.stubEnv('VITE_DB_FOLDER', 'db-custom');

    await expect(new DbLoader().lookup('7802E7')).resolves.toEqual([
      'B-1234',
      'B738',
      '00',
      'BOEING 737-800',
    ]);

    expect(fetchFn).toHaveBeenCalledWith('/db-custom/7.js');
  });

  it('does not keep a rejected shard request cached forever', async () => {
    const fetchShard = vi
      .fn<ShardFetcher>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ '00001': ['R1', 'T1', '00', 'L1'] });
    const loader = new DbLoader(fetchShard);

    await expect(loader.lookup('A00001')).resolves.toBeNull();
    await expect(loader.lookup('A00001')).resolves.toEqual(['R1', 'T1', '00', 'L1']);
    expect(fetchShard).toHaveBeenCalledTimes(2);
  });

  it('returns the entry when dkey is present at level 1', async () => {
    const { loader } = makeLoader({
      A: { '0F1E2': ['N123', 'C172', '00', 'CESSNA 172'] },
    });
    expect(await loader.lookup('A0F1E2')).toEqual(['N123', 'C172', '00', 'CESSNA 172']);
  });

  it('recurses into children to a deeper shard', async () => {
    const { loader } = makeLoader({
      A: { children: ['A0'] },
      A0: { '1E2': ['N9', 'B738', '00', 'BOEING 737-800'] },
    });
    expect(await loader.lookup('A01E2')).toEqual(['N9', 'B738', '00', 'BOEING 737-800']);
  });

  it('returns null when neither entry nor matching child exists', async () => {
    const { loader } = makeLoader({ A: { children: ['A0'] } });
    expect(await loader.lookup('AFFFFF')).toBeNull();
  });

  it('skips anonymous (~ prefixed) hexes without fetching', async () => {
    const { loader, fetchShard } = makeLoader({});
    expect(await loader.lookup('~ABCDEF')).toBeNull();
    expect(fetchShard).not.toHaveBeenCalled();
  });

  it('fetches each shard only once (single-flight cache)', async () => {
    const { loader, fetchShard } = makeLoader({
      A: { '00001': ['R1', 'T1', '00', 'L1'], '00002': ['R2', 'T2', '00', 'L2'] },
    });
    await Promise.all([loader.lookup('A00001'), loader.lookup('A00002')]);
    expect(fetchShard).toHaveBeenCalledTimes(1);
  });
});

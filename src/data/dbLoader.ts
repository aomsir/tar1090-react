import { apiUrl } from '@/config/api';

export type DbEntry = [registration: string, typeCode: string, flags: string, typeLong: string];
export type ShardData = {
  children?: string[];
  [dkey: string]: DbEntry | string[] | undefined;
};

export type ShardFetcher = (bkey: string) => Promise<ShardData | null>;

const DEFAULT_DATABASE_FOLDER = 'db-0c1185b';

function databaseFolder(): string {
  return import.meta.env.VITE_DB_FOLDER || DEFAULT_DATABASE_FOLDER;
}

const defaultFetchShard: ShardFetcher = async (bkey) => {
  const res = await fetch(apiUrl(`/${databaseFolder()}/${bkey}.js`));
  if (!res.ok) return null;
  return (await res.json()) as ShardData;
};

export class DbLoader {
  private cache = new Map<string, Promise<ShardData | null>>();
  private fetchShard: ShardFetcher;

  constructor(fetchShard: ShardFetcher = defaultFetchShard) {
    this.fetchShard = fetchShard;
  }

  async lookup(icaoRaw: string): Promise<DbEntry | null> {
    if (icaoRaw[0] === '~') return null;
    const icao = icaoRaw.toUpperCase();
    return this.requestFromDb(icao, 1);
  }

  private getShard(bkey: string): Promise<ShardData | null> {
    let p = this.cache.get(bkey);
    if (!p) {
      p = this.fetchShard(bkey).catch(() => {
        this.cache.delete(bkey);
        return null;
      });
      this.cache.set(bkey, p);
    }
    return p;
  }

  private async requestFromDb(icao: string, level: number): Promise<DbEntry | null> {
    const bkey = icao.substring(0, level);
    const dkey = icao.substring(level);
    const data = await this.getShard(bkey);
    if (data == null) return null;
    if (dkey in data) return data[dkey] as DbEntry;
    const children = data.children;
    if (children) {
      const subkey = bkey + dkey.substring(0, 1);
      if (children.indexOf(subkey) !== -1) return this.requestFromDb(icao, level + 1);
    }
    return null;
  }
}

export const dbLoader = new DbLoader();

import type { Aircraft } from './Aircraft';
import type { DbEntry } from '@/data/dbLoader';
import { dbLoader } from '@/data/dbLoader';
import { registrationFromHexId } from './registration';
import { findCountry, flagPath } from './country';

export interface EnrichDeps {
  lookup: (hex: string) => Promise<DbEntry | null>;
  registrationFromHexId: (hex: string) => string | null;
}

const defaultDeps: EnrichDeps = {
  lookup: (hex) => dbLoader.lookup(hex),
  registrationFromHexId,
};

export async function enrichAircraft(ac: Aircraft, deps: EnrichDeps = defaultDeps): Promise<void> {
  const entry = await deps.lookup(ac.hex);
  if (entry) {
    const [reg, typeCode, flags, typeLong] = entry;
    if (reg) ac.registration = reg;
    if (typeCode) ac.typeCode = typeCode;
    if (typeLong) ac.typeLong = typeLong;
    ac.dbFlags = flags;
    ac.isMilitary = (parseInt(flags, 16) & 0x01) !== 0;
  }
  if (!ac.registration) {
    const derived = deps.registrationFromHexId(ac.hex);
    if (derived) ac.registration = derived;
  }
  const country = findCountry(ac.hex);
  ac.country = country.country;
  ac.flagPath = flagPath(country.country_code);
  ac.enrichmentState = 'done';
}

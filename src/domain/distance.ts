const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;

function rad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function distanceNm(
  fromLat: number | undefined,
  fromLon: number | undefined,
  toLat: number | undefined,
  toLon: number | undefined,
): number | undefined {
  if (
    typeof fromLat !== 'number' ||
    typeof fromLon !== 'number' ||
    typeof toLat !== 'number' ||
    typeof toLon !== 'number'
  ) {
    return undefined;
  }
  const dLat = rad(toLat - fromLat);
  const dLon = rad(toLon - fromLon);
  const lat1 = rad(fromLat);
  const lat2 = rad(toLat);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

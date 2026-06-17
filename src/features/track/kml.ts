import type { TrackPoint } from './track';

export interface KmlPlane {
  hex: string;
  registration?: string;
}

function isoZ(tsSec: number): string {
  return new Date(tsSec * 1000).toISOString();
}

export function buildTrackKml(plane: KmlPlane, points: TrackPoint[]): string {
  const name = (plane.registration || plane.hex).toUpperCase();
  const sections: { ground: boolean; pts: TrackPoint[] }[] = [];
  let cur: { ground: boolean; pts: TrackPoint[] } | null = null;
  for (const p of points) {
    if (!cur || cur.ground !== p.ground) {
      cur = { ground: p.ground, pts: [] };
      sections.push(cur);
    }
    cur.pts.push(p);
  }
  const placemarks = sections
    .map((s) => {
      const whens = s.pts.map((p) => `<when>${isoZ(p.ts)}</when>`).join('');
      const coords = s.pts
        .map((p) => {
          const altM = s.ground ? 0 : typeof p.alt === 'number' ? Math.round(p.alt * 0.3048) : 0;
          return `<gx:coord>${p.lon} ${p.lat} ${altM}</gx:coord>`;
        })
        .join('');
      const altMode = s.ground ? '' : '<altitudeMode>absolute</altitudeMode>';
      return `<Placemark><name>${name}</name><gx:Track>${altMode}${whens}${coords}</gx:Track></Placemark>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">' +
    `<Folder><name>${name} track</name>${placemarks}</Folder></kml>`
  );
}

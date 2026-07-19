/** Distancia haversine en km entre dos puntos WGS84. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type LatLng = { lat: number; lng: number };

/** Índice de la entrada más cercana a `origin`, o -1 si la lista está vacía. */
export function nearestIndex<T extends LatLng>(origin: LatLng, points: T[]): number {
  if (points.length === 0) return -1;
  let best = 0;
  let bestKm = haversineKm(origin.lat, origin.lng, points[0].lat, points[0].lng);
  for (let i = 1; i < points.length; i++) {
    const km = haversineKm(origin.lat, origin.lng, points[i].lat, points[i].lng);
    if (km < bestKm) {
      bestKm = km;
      best = i;
    }
  }
  return best;
}

/** Formato corto para UI (p.ej. "1,2 km" o "350 m"). */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

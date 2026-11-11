/** "41.311081, 69.240562": latitude first, as map apps copy it. An empty field means no location. */
export function parseLocation(text: string): { lat: number | null; lon: number | null } {
  const value = text.trim();
  if (!value) return { lat: null, lon: null };
  const match = value.match(/^(-?\d{1,2}(?:\.\d+)?)[\s,;]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) throw new Error('invalid_location');
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('invalid_location');
  return { lat, lon };
}

export function formatLocation(lat: number | null | undefined, lon: number | null | undefined): string {
  return lat === null || lat === undefined || lon === null || lon === undefined ? '' : `${lat}, ${lon}`;
}

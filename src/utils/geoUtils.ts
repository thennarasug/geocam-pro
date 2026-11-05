import { CoordFormat, UnitSystem } from '../types/camera';

/**
 * Convert Decimal Degrees to DMS format (Degrees Minutes Seconds)
 */
export function toDMS(coordinate: number, isLatitude: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction = '';
  if (isLatitude) {
    direction = coordinate >= 0 ? 'N' : 'S';
  } else {
    direction = coordinate >= 0 ? 'E' : 'W';
  }

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * Convert Latitude and Longitude to UTM (Universal Transverse Mercator)
 * Accurate WGS84 projection
 */
export function toUTM(latitude: number, longitude: number): string {
  if (latitude < -80 || latitude > 84) {
    return `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
  }

  const zone = Math.floor((longitude + 180) / 6) + 1;
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const a = 6378137; // WGS84 major axis
  const e = 0.081819190842622; // eccentricity
  const ePrimeSq = (e * e) / (1 - e * e);
  const k0 = 0.9996;

  const N = a / Math.sqrt(1 - e * e * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrimeSq * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M = a * ((1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256) * latRad
    - (3 * e * e / 8 + 3 * e * e * e * e / 32 + 45 * e * e * e * e * e * e / 1024) * Math.sin(2 * latRad)
    + (15 * e * e * e * e / 256 + 45 * e * e * e * e * e * e / 1024) * Math.sin(4 * latRad)
    - (35 * e * e * e * e * e * e / 3072) * Math.sin(6 * latRad));

  const easting = k0 * N * (A + (1 - T + C) * A * A * A / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * ePrimeSq) * A * A * A * A * A / 120) + 500000;

  let northing = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * ePrimeSq) * A * A * A * A * A * A / 720));

  if (latitude < 0) {
    northing += 10000000; // False northing for southern hemisphere
  }

  const hemisphere = latitude >= 0 ? 'N' : 'S';
  return `${zone}${hemisphere} ${Math.round(easting)}E ${Math.round(northing)}N`;
}

/**
 * Format coordinates based on selected format
 */
export function formatCoordinates(lat: number, lng: number, format: CoordFormat): string {
  if (format === 'DMS') {
    return `${toDMS(lat, true)}  ${toDMS(lng, false)}`;
  }
  if (format === 'UTM') {
    return toUTM(lat, lng);
  }
  // Decimal Degrees
  return `${lat >= 0 ? '+' : ''}${lat.toFixed(6)}°, ${lng >= 0 ? '+' : ''}${lng.toFixed(6)}°`;
}

/**
 * Convert degrees to 16-point Compass Cardinal Direction
 */
export function getCompassDirection(degrees: number): { code: string; label: string } {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    { code: 'N', label: 'North' },
    { code: 'NNE', label: 'North-NorthEast' },
    { code: 'NE', label: 'NorthEast' },
    { code: 'ENE', label: 'East-NorthEast' },
    { code: 'E', label: 'East' },
    { code: 'ESE', label: 'East-SouthEast' },
    { code: 'SE', label: 'SouthEast' },
    { code: 'SSE', label: 'South-SouthEast' },
    { code: 'S', label: 'South' },
    { code: 'SSW', label: 'South-SouthWest' },
    { code: 'SW', label: 'SouthWest' },
    { code: 'WSW', label: 'West-SouthWest' },
    { code: 'W', label: 'West' },
    { code: 'WNW', label: 'West-NorthWest' },
    { code: 'NW', label: 'NorthWest' },
    { code: 'NNW', label: 'North-NorthWest' },
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Format altitude according to unit system
 */
export function formatAltitude(altitudeMeters: number | null, units: UnitSystem): string {
  if (altitudeMeters === null || altitudeMeters === undefined || isNaN(altitudeMeters)) {
    return '--';
  }
  if (units === 'imperial') {
    const feet = altitudeMeters * 3.28084;
    return `${feet.toFixed(1)} ft`;
  }
  return `${altitudeMeters.toFixed(1)} m`;
}

/**
 * Format distance according to unit system
 */
export function formatAccuracy(accuracyMeters: number, units: UnitSystem): string {
  if (accuracyMeters === null || accuracyMeters === undefined || isNaN(accuracyMeters)) {
    return '±--';
  }
  if (units === 'imperial') {
    const feet = accuracyMeters * 3.28084;
    return `±${feet.toFixed(1)} ft`;
  }
  return `±${accuracyMeters.toFixed(1)} m`;
}

/**
 * Haversine formula to compute distance in meters between two coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format timestamp into standard readable timestamp
 */
export function formatDateTime(timestamp: number): {
  date: string;
  time: string;
  iso: string;
  timezone: string;
} {
  const d = new Date(timestamp);
  const dateStr = d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return {
    date: dateStr,
    time: timeStr,
    iso: d.toISOString(),
    timezone: tz,
  };
}

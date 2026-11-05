import { ResolvedAddress, GeoPhoto, OfflineGpsBreadcrumb } from '../types/camera';
import { 
  getCachedGeocode, 
  setCachedGeocode, 
  getPendingSyncPhotos, 
  savePhoto, 
  getPhotoById,
  getSettings
} from './storage';
import { renderWatermarkedPhoto } from './watermark';
import { calculateDistanceMeters } from '../utils/geoUtils';

export interface SyncProgress {
  total: number;
  completed: number;
  currentPhotoId?: string;
  isSyncing: boolean;
  error?: string;
}

type SyncListener = (progress: SyncProgress) => void;
const syncListeners: Set<SyncListener> = new Set();

let currentProgress: SyncProgress = {
  total: 0,
  completed: 0,
  isSyncing: false,
};

function notifyListeners() {
  syncListeners.forEach((listener) => listener({ ...currentProgress }));
  // Also dispatch a browser custom event for wide reactivity
  window.dispatchEvent(new CustomEvent('geocam-sync-updated', { detail: currentProgress }));
}

export function subscribeToSyncProgress(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener({ ...currentProgress });
  return () => {
    syncListeners.delete(listener);
  };
}

/**
 * Reverse geocode a latitude & longitude
 * Uses local cache first, or OpenStreetMap Nominatim when online
 */
export async function reverseGeocode(
  lat: number, 
  lng: number, 
  isOnline: boolean
): Promise<ResolvedAddress> {
  // Check local offline cache first
  try {
    const cached = await getCachedGeocode(lat, lng);
    if (cached) {
      return {
        ...cached,
        isPendingReverseGeocode: false,
      };
    }
  } catch (err) {
    console.warn('Cache lookup failed', err);
  }

  // If device is offline, store as pending reverse geocode
  if (!isOnline || !navigator.onLine) {
    return {
      formatted: `GPS Fixed: ${lat.toFixed(5)}°, ${lng.toFixed(5)}° (Offline - Awaiting Sync)`,
      isPendingReverseGeocode: true,
    };
  }

  // If online, perform Nominatim reverse geocode lookup
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoCamPro-GPSCamera/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    const street = addr.road || addr.street || addr.pedestrian || addr.footway || '';
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
    const state = addr.state || addr.region || '';
    const postcode = addr.postcode || '';
    const country = addr.country || '';
    const countryCode = (addr.country_code || '').toUpperCase();

    // Construct clean formatted single-line address
    const parts = [
      street,
      suburb,
      city,
      state,
      postcode,
      country,
    ].filter(Boolean);

    const formatted = parts.length > 0 
      ? parts.join(', ') 
      : data.display_name || `Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`;

    const resolved: ResolvedAddress = {
      formatted,
      road: street,
      suburb,
      city,
      state,
      postcode,
      country,
      countryCode,
      isPendingReverseGeocode: false,
      syncedAt: Date.now(),
    };

    // Cache the resolved address
    await setCachedGeocode(lat, lng, resolved);

    return resolved;
  } catch (error) {
    console.warn('Online reverse geocode failed, fallback to pending', error);
    return {
      formatted: `GPS: ${lat.toFixed(5)}°, ${lng.toFixed(5)}° (Offline - Sync on Reconnect)`,
      isPendingReverseGeocode: true,
    };
  }
}

/**
 * Sync all pending offline photos once network connection is re-established
 */
export async function syncPendingPhotos(): Promise<{ synced: number; failed: number }> {
  if (currentProgress.isSyncing) {
    return { synced: 0, failed: 0 };
  }

  if (!navigator.onLine) {
    console.log('Cannot sync: device is currently offline');
    return { synced: 0, failed: 0 };
  }

  const pendingPhotos = await getPendingSyncPhotos();
  if (pendingPhotos.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const settings = await getSettings();

  currentProgress = {
    total: pendingPhotos.length,
    completed: 0,
    isSyncing: true,
  };
  notifyListeners();

  let synced = 0;
  let failed = 0;

  for (const photo of pendingPhotos) {
    currentProgress.currentPhotoId = photo.id;
    notifyListeners();

    try {
      // 1. Resolve address via online geocoder
      const resolvedAddress = await reverseGeocode(
        photo.location.latitude,
        photo.location.longitude,
        true
      );

      // If still pending (e.g. timeout), skip re-stamp
      if (resolvedAddress.isPendingReverseGeocode) {
        failed++;
      } else {
        // 2. Re-render the stamped image with the newly resolved real-world address!
        const { stampedDataUrl, thumbnailUrl } = await renderWatermarkedPhoto(
          photo.originalDataUrl || photo.stampedDataUrl,
          photo.location,
          resolvedAddress,
          photo.tilt,
          photo.compassHeading,
          photo.projectName,
          photo.surveyorName,
          photo.customNote,
          settings.watermark
        );

        // 3. Update photo in IndexedDB
        const updatedPhoto: GeoPhoto = {
          ...photo,
          address: resolvedAddress,
          stampedDataUrl,
          thumbnailUrl,
          syncStatus: 'synced',
          syncError: undefined,
        };

        await savePhoto(updatedPhoto);
        synced++;
      }
    } catch (err: any) {
      console.error(`Failed to sync photo ${photo.id}:`, err);
      failed++;
      photo.syncStatus = 'failed';
      photo.syncError = err?.message || 'Sync error';
      await savePhoto(photo);
    }

    currentProgress.completed++;
    notifyListeners();

    // Respect OpenStreetMap Nominatim usage policy (1 request/second)
    await new Promise((r) => setTimeout(r, 1100));
  }

  currentProgress = {
    total: 0,
    completed: 0,
    isSyncing: false,
  };
  notifyListeners();

  return { synced, failed };
}

/**
 * Manually or automatically associate offline GPS coordinates with a photo
 */
export async function associateCoordinatesWithPhoto(
  photoId: string,
  latitude: number,
  longitude: number,
  altitude: number | null = null,
  heading: number = 0
): Promise<GeoPhoto | null> {
  const photo = await getPhotoById(photoId);
  if (!photo) return null;

  const isOnline = navigator.onLine;
  const address = await reverseGeocode(latitude, longitude, isOnline);
  const settings = await getSettings();

  const updatedLocation = {
    ...photo.location,
    latitude,
    longitude,
    altitude: altitude !== null ? altitude : photo.location.altitude,
    heading: heading || photo.location.heading,
  };

  const { stampedDataUrl, thumbnailUrl } = await renderWatermarkedPhoto(
    photo.originalDataUrl || photo.stampedDataUrl,
    updatedLocation,
    address,
    photo.tilt,
    heading || photo.compassHeading,
    photo.projectName,
    photo.surveyorName,
    photo.customNote,
    settings.watermark
  );

  const updatedPhoto: GeoPhoto = {
    ...photo,
    location: updatedLocation,
    address,
    compassHeading: heading || photo.compassHeading,
    stampedDataUrl,
    thumbnailUrl,
    syncStatus: address.isPendingReverseGeocode ? 'pending_sync' : 'synced',
  };

  await savePhoto(updatedPhoto);
  window.dispatchEvent(new CustomEvent('geocam-photo-updated', { detail: { id: photoId } }));
  return updatedPhoto;
}

/**
 * Find the closest offline breadcrumb coordinate within a time threshold
 */
export function findNearestBreadcrumb(
  targetTimestamp: number,
  breadcrumbs: OfflineGpsBreadcrumb[],
  maxTimeDiffMs = 1000 * 60 * 30 // 30 minutes
): OfflineGpsBreadcrumb | null {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  let closest: OfflineGpsBreadcrumb | null = null;
  let minDiff = Infinity;

  for (const b of breadcrumbs) {
    const diff = Math.abs(b.timestamp - targetTimestamp);
    if (diff < minDiff && diff <= maxTimeDiffMs) {
      minDiff = diff;
      closest = b;
    }
  }

  return closest;
}

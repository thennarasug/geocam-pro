import { GeoPhoto, OfflineGpsBreadcrumb, AppSettings } from '../types/camera';

const DB_NAME = 'GeoCamProDB';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  watermark: {
    templateId: 'gps_map_camera',
    showMapSnippet: true,
    mapZoom: 15,
    showCoordinates: true,
    showAddress: true,
    showAltitude: true,
    showCompass: true,
    showTimestamp: true,
    showProjectName: true,
    showSurveyor: true,
    showCustomNote: true,
    showAccuracy: true,
    coordFormat: 'DD',
    unitSystem: 'metric',
  },
  projectName: 'Field Inspection',
  surveyorName: 'Surveyor 01',
  cameraFacing: 'environment',
  gridType: 'rule_of_thirds',
  activeFilter: 'none',
  compassDefaultMode: 'ribbon',
  soundEnabled: true,
  vibrationEnabled: true,
  highAccuracyGPS: true,
  autoSyncOnline: true,
  saveBothVersions: true,
  offlineTrackingEnabled: true,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('timestamp', 'timestamp', { unique: false });
        photoStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        photoStore.createIndex('offlineCaptured', 'offlineCaptured', { unique: false });
      }

      // GPS breadcrumbs for offline tracks
      if (!db.objectStoreNames.contains('breadcrumbs')) {
        const breadcrumbStore = db.createObjectStore('breadcrumbs', { keyPath: 'id' });
        breadcrumbStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Address reverse-geocode cache
      if (!db.objectStoreNames.contains('geocode_cache')) {
        db.createObjectStore('geocode_cache', { keyPath: 'key' });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// ---------------- Photos API ----------------

export async function savePhoto(photo: GeoPhoto): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const req = store.put(photo);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotos(): Promise<GeoPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const req = store.getAll();
    req.onsuccess = () => {
      // Sort newest first
      const photos = (req.result as GeoPhoto[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(photos);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotoById(id: string): Promise<GeoPhoto | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncPhotos(): Promise<GeoPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const req = store.getAll();
    req.onsuccess = () => {
      const photos = (req.result as GeoPhoto[]).filter(
        (p) => p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode
      );
      resolve(photos);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Offline GPS Breadcrumbs API ----------------

export async function saveBreadcrumb(breadcrumb: OfflineGpsBreadcrumb): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('breadcrumbs', 'readwrite');
    const store = tx.objectStore('breadcrumbs');
    const req = store.put(breadcrumb);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getRecentBreadcrumbs(limit = 100): Promise<OfflineGpsBreadcrumb[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('breadcrumbs', 'readonly');
    const store = tx.objectStore('breadcrumbs');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as OfflineGpsBreadcrumb[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(all.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearOldBreadcrumbs(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('breadcrumbs', 'readwrite');
    const store = tx.objectStore('breadcrumbs');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Geocode Cache API ----------------

export async function getCachedGeocode(lat: number, lng: number): Promise<any | null> {
  // Round to ~100m (3 decimal places) for cache key
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('geocode_cache', 'readonly');
    const store = tx.objectStore('geocode_cache');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result && Date.now() - req.result.timestamp < 1000 * 60 * 60 * 24 * 30) {
        resolve(req.result.address);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

export async function setCachedGeocode(lat: number, lng: number, address: any): Promise<void> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('geocode_cache', 'readwrite');
    const store = tx.objectStore('geocode_cache');
    store.put({ key, address, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ---------------- Settings API ----------------

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('app_settings');
    req.onsuccess = () => {
      if (req.result && req.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'app_settings', value: settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

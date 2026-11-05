import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  MapPin, 
  Sliders, 
  Database,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppSettings, GeoPhoto, OfflineGpsBreadcrumb } from './types/camera';
import { getSettings, getPhotos, getRecentBreadcrumbs, DEFAULT_SETTINGS } from './services/storage';
import { useGeoSensors } from './hooks/useGeoSensors';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import { CameraView } from './components/CameraView';
import { GalleryView } from './components/GalleryView';
import { MapExplorer } from './components/MapExplorer';
import { PhotoDetailModal } from './components/PhotoDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { OfflineSyncCenter } from './components/OfflineSyncCenter';
import { PWAInstallModal } from './components/PWAInstallModal';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<GeoPhoto[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<OfflineGpsBreadcrumb[]>([]);
  const [currentView, setCurrentView] = useState<'camera' | 'gallery' | 'map'>('camera');
  
  // Modals state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSyncCenter, setShowSyncCenter] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [detailPhoto, setDetailPhoto] = useState<GeoPhoto | null>(null);

  // Hardware and network hooks
  const { isOnline, lastSyncResult } = useOnlineStatus(settings.autoSyncOnline);
  const { 
    location, 
    tilt, 
    compassHeading, 
    gpsStatus, 
    isSimulated, 
    toggleSimulation 
  } = useGeoSensors(settings.offlineTrackingEnabled);
  const { isInstallable, isInstalled } = usePWAInstall();

  // Load photos & settings on mount and listen to events
  const loadAppData = useCallback(async () => {
    try {
      const [storedSettings, storedPhotos, storedBc] = await Promise.all([
        getSettings(),
        getPhotos(),
        getRecentBreadcrumbs(60),
      ]);
      setSettings(storedSettings);
      setPhotos(storedPhotos);
      setBreadcrumbs(storedBc);
    } catch (err) {
      console.warn('Data load error:', err);
    }
  }, []);

  useEffect(() => {
    loadAppData();

    const handlePhotoSaved = () => loadAppData();
    const handleSyncUpdated = () => loadAppData();

    window.addEventListener('geocam-photo-saved', handlePhotoSaved);
    window.addEventListener('geocam-sync-updated', handleSyncUpdated);

    return () => {
      window.removeEventListener('geocam-photo-saved', handlePhotoSaved);
      window.removeEventListener('geocam-sync-updated', handleSyncUpdated);
    };
  }, [loadAppData]);

  // Derived state
  const pendingSyncPhotos = photos.filter(
    (p) => p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode
  );
  const pendingSyncCount = pendingSyncPhotos.length;
  const recentThumbnail = photos.length > 0 ? (photos[0].thumbnailUrl || photos[0].stampedDataUrl) : null;

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Persistent Top Banner for Offline Status or PWA Install Prompt */}
      {!isOnline && (
        <div className="bg-amber-600/90 text-slate-950 px-3 py-1.5 text-xs font-semibold flex items-center justify-between z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Offline Field Mode: Coordinates logged. Street addresses will auto-associate once online.</span>
          </div>
          <button
            onClick={() => setShowSyncCenter(true)}
            className="underline font-bold text-black hover:text-slate-900 ml-2"
          >
            View Queue ({pendingSyncCount})
          </button>
        </div>
      )}

      {/* Reconnection Success Banner */}
      {lastSyncResult && lastSyncResult.synced > 0 && (
        <div className="bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold flex items-center justify-between z-30 shrink-0 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Online Reconnected: Automatically synchronized {lastSyncResult.synced} offline photo(s) with addresses!</span>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {currentView === 'camera' && (
          <CameraView
            location={location}
            tilt={tilt}
            compassHeading={compassHeading}
            gpsStatus={gpsStatus}
            isOnline={isOnline}
            settings={settings}
            onOpenGallery={() => setCurrentView('gallery')}
            onOpenMap={() => setCurrentView('map')}
            onOpenSettings={() => setShowSettings(true)}
            onOpenSyncCenter={() => setShowSyncCenter(true)}
            onOpenExportModal={() => setShowInstallModal(true)}
            onUpdateSettings={setSettings}
            pendingSyncCount={pendingSyncCount}
            recentThumbnail={recentThumbnail}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView
            photos={photos}
            settings={settings}
            isOnline={isOnline}
            onClose={() => setCurrentView('camera')}
            onOpenPhotoDetail={(photo) => setDetailPhoto(photo)}
            onPhotosReload={loadAppData}
          />
        )}

        {currentView === 'map' && (
          <MapExplorer
            photos={photos}
            currentLocation={location}
            compassHeading={compassHeading}
            breadcrumbs={breadcrumbs}
            onClose={() => setCurrentView('camera')}
            onOpenPhotoDetail={(photo) => setDetailPhoto(photo)}
          />
        )}
      </div>

      {/* Modals */}
      {detailPhoto && (
        <PhotoDetailModal
          photo={detailPhoto}
          settings={settings}
          isOnline={isOnline}
          onClose={() => setDetailPhoto(null)}
          onPhotoUpdated={(updated) => {
            setDetailPhoto(updated);
            loadAppData();
          }}
          onPhotoDeleted={() => {
            setDetailPhoto(null);
            loadAppData();
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onClose={() => setShowSettings(false)}
          onOpenInstallModal={() => {
            setShowSettings(false);
            setShowInstallModal(true);
          }}
        />
      )}

      {showSyncCenter && (
        <OfflineSyncCenter
          isOnline={isOnline}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onClose={() => setShowSyncCenter(false)}
          onOpenPhotoDetail={(photo) => setDetailPhoto(photo)}
        />
      )}

      {showInstallModal && (
        <PWAInstallModal onClose={() => setShowInstallModal(false)} />
      )}
    </div>
  );
}

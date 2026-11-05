import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  MapPin, 
  Compass, 
  Link2, 
  Sliders, 
  ArrowLeft,
  Layers,
  Database,
  Radio,
  Info
} from 'lucide-react';
import { GeoPhoto, OfflineGpsBreadcrumb, AppSettings } from '../types/camera';
import { 
  getPendingSyncPhotos, 
  getRecentBreadcrumbs, 
  getPhotos,
  saveSettings 
} from '../services/storage';
import { syncPendingPhotos, associateCoordinatesWithPhoto } from '../services/geocodingSync';
import { formatCoordinates, formatAltitude, formatAccuracy } from '../utils/geoUtils';

interface OfflineSyncCenterProps {
  isOnline: boolean;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
  onOpenPhotoDetail: (photo: GeoPhoto) => void;
}

export const OfflineSyncCenter: React.FC<OfflineSyncCenterProps> = ({
  isOnline,
  settings,
  onUpdateSettings,
  onClose,
  onOpenPhotoDetail,
}) => {
  const [pendingPhotos, setPendingPhotos] = useState<GeoPhoto[]>([]);
  const [allPhotos, setAllPhotos] = useState<GeoPhoto[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<OfflineGpsBreadcrumb[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'breadcrumbs' | 'associate'>('queue');

  // Associate Tool State
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>('');
  const [customLat, setCustomLat] = useState<string>('37.774929');
  const [customLng, setCustomLng] = useState<string>('-122.419416');
  const [customAlt, setCustomAlt] = useState<string>('15');
  const [associationNotice, setAssociationNotice] = useState<string | null>(null);

  const loadData = async () => {
    const [pending, recentBc, photos] = await Promise.all([
      getPendingSyncPhotos(),
      getRecentBreadcrumbs(40),
      getPhotos(),
    ]);
    setPendingPhotos(pending);
    setBreadcrumbs(recentBc);
    setAllPhotos(photos);
    if (photos.length > 0 && !selectedPhotoId) {
      setSelectedPhotoId(photos[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleSyncUpdated = () => loadData();
    window.addEventListener('geocam-sync-updated', handleSyncUpdated);
    window.addEventListener('geocam-photo-saved', handleSyncUpdated);
    return () => {
      window.removeEventListener('geocam-sync-updated', handleSyncUpdated);
      window.removeEventListener('geocam-photo-saved', handleSyncUpdated);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      setSyncStatusMsg('Cannot sync while device is offline. Connect to Wi-Fi or cellular network.');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg('Connecting to geocoding services and updating watermark stamps...');

    try {
      const res = await syncPendingPhotos();
      await loadData();
      if (res.synced > 0) {
        setSyncStatusMsg(`Successfully synchronized ${res.synced} photo(s) with real-world addresses!`);
      } else if (res.failed > 0) {
        setSyncStatusMsg(`Sync completed with ${res.failed} retries required.`);
      } else {
        setSyncStatusMsg('All photos are already up to date.');
      }
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message || 'Network request failed'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssociate = async (lat: number, lng: number, alt?: number) => {
    if (!selectedPhotoId) return;
    try {
      setAssociationNotice('Associating coordinates and updating watermark stamp...');
      await associateCoordinatesWithPhoto(selectedPhotoId, lat, lng, alt);
      await loadData();
      setAssociationNotice('Coordinates successfully associated and photo re-stamped!');
      setTimeout(() => setAssociationNotice(null), 3000);
    } catch (e: any) {
      setAssociationNotice(`Failed: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Offline Geotagging & Sync Center
            </h1>
            <p className="text-xs text-slate-400">
              Manage offline GPS coordinates and associate addresses
            </p>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing || !isOnline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition ${
            isOnline && !isSyncing
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Connection Banner */}
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isOnline 
          ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200' 
          : 'bg-amber-950/50 border-amber-900/60 text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-900/60' : 'bg-amber-900/60'}`}>
            {isOnline ? <Wifi className="w-6 h-6 text-emerald-400" /> : <WifiOff className="w-6 h-6 text-amber-400" />}
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>{isOnline ? 'Device is Online' : 'Device is Offline (Field Mode)'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/30 text-amber-200'
              }`}>
                {isOnline ? 'Ready to Sync' : 'GPS Stored Locally'}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              {isOnline
                ? 'Connection active. Photos are reverse-geocoded in real time with street addresses.'
                : 'GPS hardware logs exact satellite coordinates. Addresses will auto-associate once connection is re-established.'}
            </p>
          </div>
        </div>

        {/* Auto-Sync Toggle */}
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer self-start sm:self-auto bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
          <input
            type="checkbox"
            checked={settings.autoSyncOnline}
            onChange={(e) => {
              const updated = { ...settings, autoSyncOnline: e.target.checked };
              onUpdateSettings(updated);
              saveSettings(updated);
            }}
            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Auto-sync on reconnect</span>
        </label>
      </div>

      {/* Sync Status Alert */}
      {syncStatusMsg && (
        <div className="px-4 py-2.5 bg-cyan-950/60 border-b border-cyan-800/50 text-cyan-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4">
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'queue'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Sync Queue</span>
          {pendingPhotos.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
              {pendingPhotos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('breadcrumbs')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'breadcrumbs'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Offline GPS Track ({breadcrumbs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('associate')}
          className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'associate'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Associate GPS Coords</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: PENDING SYNC QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            {pendingPhotos.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 max-w-md mx-auto my-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">All Offline Geotags Synced!</h3>
                <p className="text-xs text-slate-400">
                  There are no photos currently awaiting reverse geocoding. When you capture photos offline, they will queue here and automatically associate addresses once connected.
                </p>
              </div>
            ) : (
              pendingPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={photo.thumbnailUrl || photo.stampedDataUrl}
                      alt="Thumbnail"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-800 shrink-0 cursor-pointer"
                      onClick={() => onOpenPhotoDetail(photo)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {formatCoordinates(photo.location.latitude, photo.location.longitude, 'DD')}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                          Awaiting Address
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Taken: {new Date(photo.timestamp).toLocaleString()} • Alt: {formatAltitude(photo.location.altitude, settings.watermark.unitSystem)}
                      </p>
                      <p className="text-[11px] text-amber-400/90 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {photo.address.formatted}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onOpenPhotoDetail(photo)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: OFFLINE GPS TRACK LOG (BREADCRUMBS) */}
        {activeTab === 'breadcrumbs' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Continuous GPS Breadcrumb Logger</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  GeoCam records high-accuracy GPS breadcrumbs while in the field so you can associate exact coordinates to any captured photo.
                </p>
              </div>
            </div>

            {breadcrumbs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No GPS breadcrumbs logged yet. As you use the camera, coordinates are automatically logged every 15 seconds.
              </div>
            ) : (
              <div className="space-y-2">
                {breadcrumbs.map((bc) => (
                  <div
                    key={bc.id}
                    className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="text-cyan-300 font-semibold">
                        {bc.latitude.toFixed(6)}°, {bc.longitude.toFixed(6)}°
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(bc.timestamp).toLocaleTimeString()} • Accuracy: {formatAccuracy(bc.accuracy, settings.watermark.unitSystem)} • Alt: {formatAltitude(bc.altitude, settings.watermark.unitSystem)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('associate');
                        setCustomLat(bc.latitude.toString());
                        setCustomLng(bc.longitude.toString());
                        if (bc.altitude !== null) setCustomAlt(bc.altitude.toString());
                      }}
                      className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-sans transition"
                    >
                      Use Coords
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSOCIATE GPS COORDINATES TOOL */}
        {activeTab === 'associate' && (
          <div className="max-w-xl mx-auto space-y-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-400" />
                Associate GPS Coordinates with a Photo
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link offline GPS coordinates to any photo and automatically re-generate the burned-in watermark stamp.
              </p>
            </div>

            {associationNotice && (
              <div className="p-3 bg-cyan-950/80 border border-cyan-700/60 rounded-xl text-xs text-cyan-200">
                {associationNotice}
              </div>
            )}

            {/* Select Target Photo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Photo to Geotag
              </label>
              {allPhotos.length === 0 ? (
                <p className="text-xs text-slate-500">No photos available to associate.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allPhotos.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPhotoId(p.id)}
                      className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                        selectedPhotoId === p.id
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                          : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p.thumbnailUrl || p.stampedDataUrl} alt="Photo" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white p-0.5 text-center truncate">
                        {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coordinates Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Altitude (m)</label>
                <input
                  type="number"
                  step="1"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Quick Location Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'San Francisco Overlook', lat: 37.819929, lng: -122.478255, alt: 85 },
                  { name: 'Tokyo Tower', lat: 35.658581, lng: 139.745433, alt: 25 },
                  { name: 'London Big Ben', lat: 51.500729, lng: -0.124625, alt: 12 },
                  { name: 'Sydney Harbour', lat: -33.856784, lng: 151.215297, alt: 4 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCustomLat(preset.lat.toString());
                      setCustomLng(preset.lng.toString());
                      setCustomAlt(preset.alt.toString());
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded-lg transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Associate Action Button */}
            <button
              onClick={() => handleAssociate(parseFloat(customLat), parseFloat(customLng), parseFloat(customAlt))}
              disabled={!selectedPhotoId}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2"
            >
              <Link2 className="w-4 h-4" />
              <span>Associate Coords & Refresh Watermark Stamp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

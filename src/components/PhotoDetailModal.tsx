import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  MapPin, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Compass,
  Layers,
  FileText
} from 'lucide-react';
import { GeoPhoto, AppSettings } from '../types/camera';
import { formatCoordinates, formatAltitude, formatAccuracy, getCompassDirection, toDMS, toUTM } from '../utils/geoUtils';
import { reverseGeocode } from '../services/geocodingSync';
import { renderWatermarkedPhoto } from '../services/watermark';
import { savePhoto, deletePhoto } from '../services/storage';
import { GeoMapSnippetCard } from './GeoMapSnippetCard';

interface PhotoDetailModalProps {
  photo: GeoPhoto;
  settings: AppSettings;
  isOnline: boolean;
  onClose: () => void;
  onPhotoUpdated: (photo: GeoPhoto) => void;
  onPhotoDeleted: (id: string) => void;
}

export const PhotoDetailModal: React.FC<PhotoDetailModalProps> = ({
  photo,
  settings,
  isOnline,
  onClose,
  onPhotoUpdated,
  onPhotoDeleted,
}) => {
  const [viewMode, setViewMode] = useState<'stamped' | 'original'>('stamped');
  const [isSyncingAddress, setIsSyncingAddress] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loc = photo.location;
  const compassInfo = getCompassDirection(photo.compassHeading);

  const handleDownload = () => {
    const dataUrl = viewMode === 'stamped' ? photo.stampedDataUrl : photo.originalDataUrl;
    const a = document.createElement('a');
    a.href = dataUrl;
    const dateSlug = new Date(photo.timestamp).toISOString().replace(/[:.]/g, '-');
    a.download = `GeoCam_${viewMode}_${dateSlug}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const [isSharing, setIsSharing] = useState<boolean>(false);

  const handleShare = async () => {
    setIsSharing(true);
    const targetDataUrl = viewMode === 'stamped' ? photo.stampedDataUrl : photo.originalDataUrl;
    const dateSlug = new Date(photo.timestamp).toISOString().replace(/[:.]/g, '-');
    const filename = `GeoCam_${viewMode}_${dateSlug}.jpg`;

    const shareTitle = `GeoCam Photo - ${photo.projectName || 'Field Survey'}`;
    const shareText = `📍 Location: ${photo.address.formatted}\n🌐 Coordinates: ${loc.latitude.toFixed(6)}°, ${loc.longitude.toFixed(6)}°\n▲ Altitude: ${formatAltitude(loc.altitude, settings.watermark.unitSystem)}\n🧭 Heading: ${Math.round(photo.compassHeading)}° ${compassInfo.code}\n📅 Captured: ${new Date(photo.timestamp).toLocaleString()}\n🗺️ Maps: https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

    try {
      // Convert data URL to Blob and File for native attachment
      const response = await fetch(targetDataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });

      // Check if navigator.share and file sharing is supported
      if (typeof navigator !== 'undefined' && navigator.share) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [file],
          });
          setNotice('Photo shared successfully!');
          setTimeout(() => setNotice(null), 3000);
          return;
        } else {
          // Native share without file attachment
          await navigator.share({
            title: shareTitle,
            text: shareText,
          });
          setNotice('Geotag details shared successfully!');
          setTimeout(() => setNotice(null), 3000);
          return;
        }
      }

      // Fallback if Web Share API is not available on this browser/platform
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        // Also trigger download as a convenience
        handleDownload();
        setNotice('Photo downloaded & coordinates copied to clipboard!');
        setTimeout(() => setNotice(null), 3500);
      } else {
        handleDownload();
        setNotice('Photo downloaded!');
        setTimeout(() => setNotice(null), 3000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed or was dismissed:', err);
        setNotice(`Sharing info: ${err.message || 'Share dialog closed'}`);
        setTimeout(() => setNotice(null), 3000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleManualSyncAddress = async () => {
    if (!isOnline) {
      setNotice('Cannot resolve address while device is offline.');
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    setIsSyncingAddress(true);
    setNotice('Resolving street address and re-stamping watermark...');

    try {
      const resolvedAddress = await reverseGeocode(loc.latitude, loc.longitude, true);
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

      const updated: GeoPhoto = {
        ...photo,
        address: resolvedAddress,
        stampedDataUrl,
        thumbnailUrl,
        syncStatus: 'synced',
      };

      await savePhoto(updated);
      onPhotoUpdated(updated);
      setNotice('Address resolved and watermark updated!');
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncingAddress(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this geotagged photo from device storage?')) {
      await deletePhoto(photo.id);
      onPhotoDeleted(photo.id);
      onClose();
    }
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col overflow-y-auto text-slate-100 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white">Geotag Photo Inspector</h2>
            <p className="text-xs text-slate-400">
              {new Date(photo.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Header Right Actions: Share & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition active:scale-95"
            title="Share via native Web Share API"
          >
            <Share2 className={`w-3.5 h-3.5 ${isSharing ? 'animate-spin' : ''}`} />
            <span>{isSharing ? 'Sharing...' : 'Share'}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('stamped')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'stamped' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stamped
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'original' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="bg-cyan-900/80 border-b border-cyan-700 text-cyan-200 text-xs px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 max-w-4xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Column: Image Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative min-h-[360px]">
          <img
            src={viewMode === 'stamped' ? photo.stampedDataUrl : photo.originalDataUrl}
            alt="Captured photo"
            className="w-full h-auto max-h-[70vh] object-contain"
          />

          {photo.address.isPendingReverseGeocode && (
            <div className="absolute top-3 left-3 bg-amber-500/90 text-black text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1 backdrop-blur-md">
              <AlertCircle className="w-3.5 h-3.5" />
              Offline Captured (Awaiting Address Sync)
            </div>
          )}
        </div>

        {/* Right Column: Complete Telemetry Breakdown */}
        <div className="w-full md:w-84 flex flex-col gap-4">
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition transform active:scale-98"
            >
              <Share2 className={`w-4 h-4 ${isSharing ? 'animate-spin' : ''}`} />
              <span>{isSharing ? 'Opening Share Menu...' : 'Share Geotagged Photo'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
              >
                <Download className="w-4 h-4" />
                Download JPEG
              </button>
              <button
                onClick={openGoogleMaps}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
              >
                <ExternalLink className="w-4 h-4" />
                Open Maps
              </button>
            </div>
          </div>

          {/* Geo Information Snippet with Mini Map Picture */}
          <GeoMapSnippetCard
            location={photo.location}
            address={photo.address}
            tilt={photo.tilt}
            compassHeading={photo.compassHeading}
            timestamp={photo.timestamp}
            projectName={photo.projectName}
            customNote={photo.customNote}
            unitSystem={settings.watermark.unitSystem}
            zoom={settings.watermark.mapZoom || 15}
            onOpenMap={openGoogleMaps}
          />

          {/* Location & Address Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                <MapPin className="w-4 h-4" /> Location Details
              </span>
              <button
                onClick={openGoogleMaps}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
              >
                Maps <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Address */}
            <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-1">STREET ADDRESS</span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {photo.address.formatted}
              </p>

              {photo.address.isPendingReverseGeocode && (
                <button
                  onClick={handleManualSyncAddress}
                  disabled={isSyncingAddress || !isOnline}
                  className="mt-2.5 w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAddress ? 'animate-spin' : ''}`} />
                  Resolve Address Now
                </button>
              )}
            </div>

            {/* Coordinate Formats */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">DD:</span>
                <span className="text-cyan-300 font-semibold">
                  {loc.latitude.toFixed(6)}°, {loc.longitude.toFixed(6)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">DMS:</span>
                <span className="text-slate-200">{toDMS(loc.latitude, true)} {toDMS(loc.longitude, false)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">UTM:</span>
                <span className="text-slate-200">{toUTM(loc.latitude, loc.longitude)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Altitude:</span>
                <span className="text-emerald-400 font-semibold">{formatAltitude(loc.altitude, settings.watermark.unitSystem)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Accuracy:</span>
                <span className="text-slate-300">{formatAccuracy(loc.accuracy, settings.watermark.unitSystem)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Heading:</span>
                <span className="text-cyan-300 font-semibold">{Math.round(photo.compassHeading)}° {compassInfo.code}</span>
              </div>
            </div>
          </div>

          {/* Inspection Metadata Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-cyan-400" /> Survey Metadata
            </span>
            <div className="space-y-1 text-slate-300">
              <div><span className="text-slate-500">Project:</span> {photo.projectName || 'Default'}</div>
              <div><span className="text-slate-500">Surveyor:</span> {photo.surveyorName || 'N/A'}</div>
              {photo.customNote && (
                <div><span className="text-slate-500">Note:</span> {photo.customNote}</div>
              )}
              <div><span className="text-slate-500">Tilt:</span> Pitch {photo.tilt.pitch.toFixed(1)}° / Roll {photo.tilt.roll.toFixed(1)}°</div>
              <div><span className="text-slate-500">Stamp Style:</span> {photo.watermarkTemplate}</div>
            </div>
          </div>

          {/* Delete Action */}
          <button
            onClick={handleDelete}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition mt-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Photo
          </button>
        </div>
      </div>
    </div>
  );
};

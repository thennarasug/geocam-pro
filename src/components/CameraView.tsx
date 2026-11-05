import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Grid, 
  Compass, 
  Layers, 
  Image as ImageIcon, 
  MapPin, 
  Sliders, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Upload,
  Crosshair,
  Info,
  CheckCircle2,
  AlertCircle,
  Map,
  Smartphone,
  Palette
} from 'lucide-react';
import { 
  GeoLocationData, 
  ResolvedAddress, 
  DeviceTilt, 
  AppSettings, 
  GeoPhoto 
} from '../types/camera';
import { formatCoordinates, formatAltitude, formatAccuracy, getCompassDirection } from '../utils/geoUtils';
import { renderWatermarkedPhoto } from '../services/watermark';
import { reverseGeocode } from '../services/geocodingSync';
import { savePhoto, saveSettings } from '../services/storage';
import { playShutterSound, triggerHaptic } from '../utils/audio';
import { GeoMapSnippetCard } from './GeoMapSnippetCard';
import { InteractiveCompassOverlay } from './InteractiveCompassOverlay';
import { CameraFilterId, CAMERA_FILTERS, getFilterCss } from '../utils/filterUtils';

interface CameraViewProps {
  location: GeoLocationData | null;
  tilt: DeviceTilt;
  compassHeading: number;
  gpsStatus: 'acquiring' | 'locked' | 'error' | 'simulated';
  isOnline: boolean;
  settings: AppSettings;
  onOpenGallery: () => void;
  onOpenMap: () => void;
  onOpenSettings: () => void;
  onOpenSyncCenter: () => void;
  onOpenExportModal?: () => void;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  pendingSyncCount: number;
  recentThumbnail: string | null;
}

export const CameraView: React.FC<CameraViewProps> = ({
  location,
  tilt,
  compassHeading,
  gpsStatus,
  isOnline,
  settings,
  onOpenGallery,
  onOpenMap,
  onOpenSettings,
  onOpenSyncCenter,
  onOpenExportModal,
  onUpdateSettings,
  pendingSyncCount,
  recentThumbnail,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(settings.cameraFacing);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [gridType, setGridType] = useState(settings.gridType);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveAddress, setLiveAddress] = useState<ResolvedAddress | null>(null);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);
  const [showLiveMapSnippet, setShowLiveMapSnippet] = useState<boolean>(true);
  const [showCompassOverlay, setShowCompassOverlay] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<CameraFilterId>(settings.activeFilter || 'none');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (settings.activeFilter) {
      setActiveFilter(settings.activeFilter);
    }
  }, [settings.activeFilter]);

  useEffect(() => {
    if (settings.gridType !== undefined) {
      setGridType(settings.gridType);
    }
  }, [settings.gridType]);

  // Initialize Camera Stream
  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      setCameraError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if torch is available
      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        const capabilities = (track as any).getCapabilities();
        setHasTorch(Boolean(capabilities?.torch));
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let msg = 'Unable to access hardware camera.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission denied. Allow camera access or upload an image below.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device. You can import photos to geotag.';
      }
      setCameraError(msg);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch failed', e);
    }
  };

  // Flip Front/Back Camera
  const toggleFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Resolve address when location changes
  useEffect(() => {
    if (!location) return;
    let isMounted = true;

    reverseGeocode(location.latitude, location.longitude, isOnline)
      .then((addr) => {
        if (isMounted) setLiveAddress(addr);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [location?.latitude, location?.longitude, isOnline]);

  // Take Snapshot & Apply Watermark Stamp
  const capturePhoto = async () => {
    if (isCapturing) return;

    // Trigger visual shutter flash and audio
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    if (settings.soundEnabled) playShutterSound();
    if (settings.vibrationEnabled) triggerHaptic([40, 20]);

    setIsCapturing(true);

    try {
      let sourceElement: HTMLVideoElement | HTMLCanvasElement;
      let width: number;
      let height: number;

      if (videoRef.current && streamRef.current && videoRef.current.readyState >= 2) {
        sourceElement = videoRef.current;
        width = videoRef.current.videoWidth || 1280;
        height = videoRef.current.videoHeight || 720;
      } else {
        // Fallback placeholder canvas if camera is inactive/blocked
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 1280;
        fallbackCanvas.height = 720;
        const ctx = fallbackCanvas.getContext('2d')!;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#334155';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GeoCam Capture - Hardware Viewfinder', 640, 360);
        sourceElement = fallbackCanvas;
        width = 1280;
        height = 720;
      }

      // 1. Capture Raw Canvas
      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = width;
      rawCanvas.height = height;
      const rawCtx = rawCanvas.getContext('2d')!;
      rawCtx.drawImage(sourceElement, 0, 0, width, height);
      const originalDataUrl = rawCanvas.toDataURL('image/jpeg', 0.92);

      // 2. Prepare Geotag Telemetry
      const captureLocation: GeoLocationData = location || {
        latitude: 37.8199,
        longitude: -122.4782,
        altitude: 45,
        accuracy: 3.0,
        altitudeAccuracy: 1.0,
        heading: compassHeading,
        speed: 0,
        timestamp: Date.now(),
        isSimulated: true,
      };

      const resolvedAddress: ResolvedAddress = liveAddress || (await reverseGeocode(
        captureLocation.latitude,
        captureLocation.longitude,
        isOnline
      ));

      // 3. Render Burned-In Watermark with active filter
      const { stampedDataUrl, thumbnailUrl } = await renderWatermarkedPhoto(
        rawCanvas,
        captureLocation,
        resolvedAddress,
        tilt,
        compassHeading,
        settings.projectName,
        settings.surveyorName,
        customNote,
        settings.watermark,
        activeFilter
      );

      // 4. Create and Save Photo Entity to IndexedDB
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const offlineCaptured = !isOnline;
      const syncStatus = resolvedAddress.isPendingReverseGeocode ? 'pending_sync' : 'synced';

      const newPhoto: GeoPhoto = {
        id: photoId,
        timestamp: Date.now(),
        originalDataUrl,
        stampedDataUrl,
        thumbnailUrl,
        location: captureLocation,
        address: resolvedAddress,
        tilt,
        compassHeading,
        projectName: settings.projectName,
        surveyorName: settings.surveyorName,
        customNote,
        watermarkTemplate: settings.watermark.templateId,
        filterId: activeFilter,
        offlineCaptured,
        syncStatus,
      };

      await savePhoto(newPhoto);

      // Notify user
      const notice = offlineCaptured
        ? 'Photo saved offline! GPS tagged. Address will auto-sync on reconnect.'
        : 'Photo stamped & saved with GPS geotag!';
      setLastSavedNotice(notice);
      setTimeout(() => setLastSavedNotice(null), 3500);

      // Trigger custom event so gallery updates
      window.dispatchEvent(new CustomEvent('geocam-photo-saved', { detail: { id: photoId } }));
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle manual photo upload / import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = async () => {
        const captureLocation: GeoLocationData = location || {
          latitude: 37.8199,
          longitude: -122.4782,
          altitude: 45,
          accuracy: 3.0,
          altitudeAccuracy: 1.0,
          heading: compassHeading,
          speed: 0,
          timestamp: Date.now(),
        };

        const resolvedAddress = liveAddress || (await reverseGeocode(
          captureLocation.latitude,
          captureLocation.longitude,
          isOnline
        ));

        const { stampedDataUrl, thumbnailUrl } = await renderWatermarkedPhoto(
          img,
          captureLocation,
          resolvedAddress,
          tilt,
          compassHeading,
          settings.projectName,
          settings.surveyorName,
          customNote || 'Imported Image',
          settings.watermark,
          activeFilter
        );

        const newPhoto: GeoPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          originalDataUrl: dataUrl,
          stampedDataUrl,
          thumbnailUrl,
          location: captureLocation,
          address: resolvedAddress,
          tilt,
          compassHeading,
          projectName: settings.projectName,
          surveyorName: settings.surveyorName,
          customNote: customNote || 'Imported Image',
          watermarkTemplate: settings.watermark.templateId,
          filterId: activeFilter,
          offlineCaptured: !isOnline,
          syncStatus: resolvedAddress.isPendingReverseGeocode ? 'pending_sync' : 'synced',
        };

        await savePhoto(newPhoto);
        setLastSavedNotice('Imported photo geotagged & stamped successfully!');
        setTimeout(() => setLastSavedNotice(null), 3500);
        window.dispatchEvent(new CustomEvent('geocam-photo-saved', { detail: { id: newPhoto.id } }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Compass formatting
  const compassInfo = getCompassDirection(compassHeading);
  const coordsFormatted = location 
    ? formatCoordinates(location.latitude, location.longitude, settings.watermark.coordFormat) 
    : 'Acquiring GPS Fix...';
  const altFormatted = location ? formatAltitude(location.altitude, settings.watermark.unitSystem) : '--';
  const accFormatted = location ? formatAccuracy(location.accuracy, settings.watermark.unitSystem) : '±--';

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-between">
      {/* Visual Shutter Flash Effect */}
      {flashAnimation && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 opacity-100" />
      )}

      {/* Main Video Viewfinder */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-slate-900/90 rounded-2xl border border-slate-800 m-4">
            <Camera className="w-12 h-12 text-slate-500 mb-3" />
            <p className="text-sm text-slate-300 font-medium mb-2">{cameraError}</p>
            <p className="text-xs text-slate-400 mb-4">
              You can still capture simulated frames, or import photos from your device to apply GPS geotags and watermark stamps.
            </p>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <Upload className="w-3.5 h-3.5" /> Import Photo
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ filter: getFilterCss(activeFilter) }}
            className="w-full h-full object-cover transition-[filter] duration-300"
          />
        )}
      </div>

      {/* Framing Grids Overlay */}
      {gridType === 'rule_of_thirds' && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-white/25" />
            <div className="border-r border-white/25" />
            <div />
          </div>
          {/* 4 Rule of Thirds Intersection Power Points */}
          <div className="absolute left-[33.33%] top-[33.33%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-cyan-400/90 bg-cyan-400/30 shadow-[0_0_6px_#22d3ee]" />
          <div className="absolute left-[66.66%] top-[33.33%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-cyan-400/90 bg-cyan-400/30 shadow-[0_0_6px_#22d3ee]" />
          <div className="absolute left-[33.33%] top-[66.66%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-cyan-400/90 bg-cyan-400/30 shadow-[0_0_6px_#22d3ee]" />
          <div className="absolute left-[66.66%] top-[66.66%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-cyan-400/90 bg-cyan-400/30 shadow-[0_0_6px_#22d3ee]" />
        </div>
      )}

      {gridType === 'golden_ratio' && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Vertical Phi lines at 38.2% and 61.8% */}
          <div className="absolute top-0 bottom-0 left-[38.2%] w-px bg-white/25" />
          <div className="absolute top-0 bottom-0 left-[61.8%] w-px bg-white/25" />
          {/* Horizontal Phi lines at 38.2% and 61.8% */}
          <div className="absolute left-0 right-0 top-[38.2%] h-px bg-white/25" />
          <div className="absolute left-0 right-0 top-[61.8%] h-px bg-white/25" />
          {/* 4 Golden Ratio power points */}
          <div className="absolute left-[38.2%] top-[38.2%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-amber-400/90 bg-amber-400/30 shadow-[0_0_6px_#f59e0b]" />
          <div className="absolute left-[61.8%] top-[38.2%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-amber-400/90 bg-amber-400/30 shadow-[0_0_6px_#f59e0b]" />
          <div className="absolute left-[38.2%] top-[61.8%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-amber-400/90 bg-amber-400/30 shadow-[0_0_6px_#f59e0b]" />
          <div className="absolute left-[61.8%] top-[61.8%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-amber-400/90 bg-amber-400/30 shadow-[0_0_6px_#f59e0b]" />
        </div>
      )}

      {gridType === 'crosshair' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border border-cyan-400/50 flex items-center justify-center animate-radar">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <div className="absolute w-28 h-px bg-cyan-400/50" />
          <div className="absolute h-28 w-px bg-cyan-400/50" />
        </div>
      )}

      {/* Horizon Level Bubble in Center */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div 
          className="w-36 h-0.5 bg-white/30 rounded-full relative transition-transform duration-75"
          style={{ transform: `rotate(${-tilt.roll}deg)` }}
        >
          {/* Level indicator dot */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-colors ${
              Math.abs(tilt.roll) < 1.5 && Math.abs(tilt.pitch) < 3
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-amber-400/80'
            }`}
            style={{ 
              left: `calc(50% + ${Math.max(-50, Math.min(50, tilt.roll * 2))}px - 7px)` 
            }}
          />
          {/* Pitch & Roll Mini Readout */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/70 whitespace-nowrap bg-black/40 px-1.5 py-0.5 rounded">
            {tilt.roll.toFixed(1)}° / {tilt.pitch.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* TOP HUD BAR: Real-time Telemetry, Network Status & Controls */}
      <div className="relative z-20 w-full p-3 pt-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-2">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Offline Status Badge & Sync indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSyncCenter}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md transition shadow-sm ${
                isOnline
                  ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline GPS'}</span>
              {pendingSyncCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* GPS Signal Status Pill */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono backdrop-blur-md ${
              gpsStatus === 'locked' 
                ? 'bg-slate-900/80 border border-cyan-500/40 text-cyan-300' 
                : gpsStatus === 'simulated'
                ? 'bg-slate-900/80 border border-purple-500/40 text-purple-300'
                : 'bg-slate-900/80 border border-amber-500/40 text-amber-300 animate-pulse'
            }`}>
              <Crosshair className="w-3 h-3" />
              <span>{accFormatted}</span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-full backdrop-blur-md transition ${
                  torchOn ? 'bg-amber-400 text-black' : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                title="Toggle Torch"
              >
                {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => setShowCompassOverlay(!showCompassOverlay)}
              className={`p-2 rounded-full backdrop-blur-md transition ${
                showCompassOverlay ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Interactive Compass Alignment Overlay"
            >
              <Compass className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const nextGrid: 'none' | 'rule_of_thirds' | 'crosshair' | 'golden_ratio' = 
                  gridType === 'none' ? 'rule_of_thirds' :
                  gridType === 'rule_of_thirds' ? 'crosshair' :
                  gridType === 'crosshair' ? 'golden_ratio' : 'none';
                setGridType(nextGrid);
                if (onUpdateSettings) {
                  const updated = { ...settings, gridType: nextGrid };
                  onUpdateSettings(updated);
                  saveSettings(updated);
                }
              }}
              className={`p-2 rounded-full backdrop-blur-md transition relative ${
                gridType !== 'none' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title={`Framing Grid Overlay (${gridType === 'rule_of_thirds' ? 'Rule of Thirds' : gridType === 'crosshair' ? 'Crosshair' : gridType === 'golden_ratio' ? 'Golden Ratio' : 'Off'})`}
            >
              <Grid className="w-4 h-4" />
              {gridType !== 'none' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-1 ring-slate-950" />
              )}
            </button>

            <button
              onClick={() => setShowLiveMapSnippet(!showLiveMapSnippet)}
              className={`p-2 rounded-full backdrop-blur-md transition ${
                showLiveMapSnippet ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Toggle Live Mini Map Picture Snippet"
            >
              <Map className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`p-2 rounded-full backdrop-blur-md transition relative ${
                showFilterDrawer || activeFilter !== 'none'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Camera Color & Survey Filters"
            >
              <Palette className="w-4 h-4" />
              {activeFilter !== 'none' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-1 ring-slate-950" />
              )}
            </button>

            <button
              onClick={toggleFacing}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition"
              title="Flip Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="p-2 rounded-full bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 border border-cyan-400/40 backdrop-blur-md transition shadow"
                title="Export APK to Mobile & GitHub"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition"
              title="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Compass Cardinal Overlay on Viewfinder */}
        {showCompassOverlay && (
          <div className="w-full my-0.5 animate-in fade-in slide-from-top-1 duration-150">
            <InteractiveCompassOverlay
              heading={compassHeading}
              tiltPitch={tilt.pitch}
              tiltRoll={tilt.roll}
              defaultMode={settings.compassDefaultMode || 'ribbon'}
              soundEnabled={settings.soundEnabled}
            />
          </div>
        )}

        {/* Interactive Live Filter Drawer */}
        {showFilterDrawer && (
          <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150 my-1 pointer-events-auto">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Active Filter: {CAMERA_FILTERS.find((f) => f.id === activeFilter)?.name}
              </span>
              {activeFilter !== 'none' && (
                <button
                  onClick={() => setActiveFilter('none')}
                  className="text-[10px] text-slate-400 hover:text-white underline font-medium"
                >
                  Reset (Normal)
                </button>
              )}
            </div>

            {/* Scrollable Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CAMERA_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFilter(f.id);
                    triggerHaptic([20]);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border shrink-0 transition ${
                    activeFilter === f.id
                      ? 'bg-cyan-950/70 border-cyan-400 ring-1 ring-cyan-400 shadow-md'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                  style={{ minWidth: '76px' }}
                >
                  <div className={`w-8 h-8 rounded-full border border-white/20 shadow-inner flex items-center justify-center text-xs font-bold text-white ${f.previewBg}`}>
                    {f.id === 'none' ? 'OFF' : f.name[0]}
                  </div>
                  <span className={`text-[10px] font-semibold text-center leading-tight truncate max-w-[70px] ${
                    activeFilter === f.id ? 'text-cyan-300' : 'text-slate-300'
                  }`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Telemetry Ribbon */}
        <div className="bg-slate-950/70 border border-slate-800/80 backdrop-blur-md rounded-xl p-2.5 text-xs font-mono text-slate-200 flex flex-col gap-1 shadow-lg">
          <div className="flex items-center justify-between text-cyan-300 font-semibold tracking-wide">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {coordsFormatted}
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              ▲ {altFormatted}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5 border-t border-slate-800/60">
            <span className="truncate max-w-[240px] text-slate-300">
              {liveAddress?.isPendingReverseGeocode ? (
                <span className="text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Offline (Coords logged for sync)
                </span>
              ) : (
                liveAddress?.formatted || 'Resolving location...'
              )}
            </span>
            <span className="font-mono text-cyan-300 whitespace-nowrap pl-2">
              {Math.round(compassHeading)}° {compassInfo.code}
            </span>
          </div>
        </div>

        {/* Custom Note input toggle */}
        {showNoteInput && (
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-2 flex gap-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Tag note: e.g. Pillar A-12 inspection..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              onClick={() => setShowNoteInput(false)}
              className="px-2 py-1 bg-cyan-600 text-white rounded text-xs font-semibold"
            >
              Set
            </button>
          </div>
        )}
      </div>

      {/* Floating Notice / Toast */}
      {lastSavedNotice && (
        <div className="absolute top-36 left-4 right-4 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 border border-cyan-500/50 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-medium">{lastSavedNotice}</span>
          </div>
        </div>
      )}

      {/* Live Floating Mini Map Picture & Geo Information Snippet */}
      {showLiveMapSnippet && location && liveAddress && (
        <div className="relative z-20 px-4 mb-2 pointer-events-auto max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="relative">
            <GeoMapSnippetCard
              location={location}
              address={liveAddress}
              tilt={tilt}
              compassHeading={compassHeading}
              projectName={settings.projectName}
              customNote={customNote}
              unitSystem={settings.watermark.unitSystem}
              zoom={settings.watermark.mapZoom || 15}
              compact={true}
              onOpenMap={onOpenMap}
            />
            {/* Quick minimize button */}
            <button
              onClick={() => setShowLiveMapSnippet(false)}
              className="absolute -top-2 -right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-slate-700 shadow z-10"
              title="Hide live map snippet preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM CAMERA CONTROLS */}
      <div className="relative z-20 w-full p-4 pb-7 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3">
        {/* Quick Stamp Template Tag, Filter Tag & Note Button */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-1.5">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="text-[11px] px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 rounded-lg border border-slate-800 backdrop-blur-md flex items-center gap-1"
          >
            <span>📝</span>
            <span>{customNote ? `Note: ${customNote}` : '+ Add Field Note'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {activeFilter !== 'none' && (
              <button
                onClick={() => setShowFilterDrawer(true)}
                className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 px-2 py-1 rounded-lg border border-cyan-800 flex items-center gap-1"
              >
                <span>✨</span>
                <span>{CAMERA_FILTERS.find((f) => f.id === activeFilter)?.name}</span>
              </button>
            )}

            <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              Stamp: {settings.watermark.templateId.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Shutter Bar with Gallery & Map buttons */}
        <div className="flex items-center justify-around px-4">
          {/* Gallery / Recent Thumbnail */}
          <button
            onClick={onOpenGallery}
            className="w-13 h-13 rounded-2xl bg-slate-900/80 border-2 border-slate-700/80 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition shadow-lg relative group"
            title="Open Gallery"
          >
            {recentThumbnail ? (
              <img src={recentThumbnail} alt="Recent" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
            )}
            {pendingSyncCount > 0 && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900" />
            )}
          </button>

          {/* Large Shutter Button */}
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className={`w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center p-1.5 transition transform active:scale-90 shadow-[0_0_25px_rgba(255,255,255,0.25)] ${
              isCapturing ? 'opacity-70 scale-95' : 'hover:border-cyan-400'
            }`}
            title="Capture Geo Photo"
          >
            <div className={`w-full h-full rounded-full transition-all ${
              isCapturing ? 'bg-cyan-500 animate-pulse' : 'bg-white hover:bg-cyan-100'
            }`} />
          </button>

          {/* Interactive Map Button */}
          <button
            onClick={onOpenMap}
            className="w-13 h-13 rounded-2xl bg-slate-900/80 border-2 border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:border-cyan-400 transition shadow-lg"
            title="Open Map View"
          >
            <MapPin className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Hidden File Input for Image Upload / Fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

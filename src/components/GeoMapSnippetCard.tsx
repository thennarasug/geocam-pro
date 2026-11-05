import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { GeoLocationData, ResolvedAddress, DeviceTilt, UnitSystem } from '../types/camera';
import { formatCoordinates, formatAltitude, formatAccuracy, getCompassDirection, toDMS, toUTM } from '../utils/geoUtils';
import { getMapSnippetCanvas } from '../utils/mapSnippet';

interface GeoMapSnippetCardProps {
  location: GeoLocationData;
  address: ResolvedAddress;
  tilt?: DeviceTilt;
  compassHeading?: number;
  timestamp?: number;
  projectName?: string;
  customNote?: string;
  unitSystem?: UnitSystem;
  zoom?: number;
  compact?: boolean;
  onOpenMap?: () => void;
}

export const GeoMapSnippetCard: React.FC<GeoMapSnippetCardProps> = ({
  location,
  address,
  tilt,
  compassHeading = 0,
  timestamp = Date.now(),
  projectName,
  customNote,
  unitSystem = 'metric',
  zoom = 15,
  compact = false,
  onOpenMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  const compassInfo = getCompassDirection(compassHeading);
  const altFormatted = formatAltitude(location.altitude, unitSystem);
  const accFormatted = formatAccuracy(location.accuracy, unitSystem);

  // Load and render mini map picture snippet on canvas
  useEffect(() => {
    let isMounted = true;
    const size = compact ? 100 : 130;

    getMapSnippetCanvas(location.latitude, location.longitude, size, zoom)
      .then((generatedCanvas) => {
        if (!isMounted || !canvasRef.current) return;
        const targetCanvas = canvasRef.current;
        targetCanvas.width = size;
        targetCanvas.height = size;
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(generatedCanvas, 0, 0, size, size);
          setMapLoaded(true);
        }
      })
      .catch((e) => {
        console.warn('Mini map snippet load error', e);
      });

    return () => {
      isMounted = false;
    };
  }, [location.latitude, location.longitude, zoom, compact]);

  // Formatted Text Snippet for clipboard
  const geoTextSnippet = `📍 GEO INFORMATION SNIPPET
• Address: ${address.formatted}
• GPS Coordinates: ${location.latitude.toFixed(6)}°, ${location.longitude.toFixed(6)}°
• DMS: ${toDMS(location.latitude, true)}  ${toDMS(location.longitude, false)}
• UTM: ${toUTM(location.latitude, location.longitude)}
• Altitude: ${altFormatted} (Accuracy: ${accFormatted})
• Compass Heading: ${Math.round(compassHeading)}° ${compassInfo.code}
• Date & Time: ${new Date(timestamp).toLocaleString()}
${projectName ? `• Project: ${projectName}\n` : ''}${customNote ? `• Note: ${customNote}\n` : ''}• Google Maps: https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  const handleCopySnippet = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(geoTextSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const openGoogleMaps = () => {
    if (onOpenMap) {
      onOpenMap();
    } else {
      window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-3.5 shadow-xl backdrop-blur-md flex flex-col gap-2.5">
      {/* Header with Title and Copy Snippet button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
          <Globe className="w-4 h-4 text-cyan-400" />
          Geo Information & Mini Map Snippet
        </span>

        <button
          onClick={handleCopySnippet}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
            copied
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
          }`}
          title="Copy formatted geo information snippet to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-slate-950" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-cyan-400" />
              <span>Copy Snippet</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content: Mini Map Picture on Left, Geo Telemetry on Right */}
      <div className="flex gap-3 items-start">
        {/* Mini Map Picture Canvas with GPS Marker Pin */}
        <div 
          onClick={openGoogleMaps}
          className="relative shrink-0 rounded-xl overflow-hidden border-2 border-cyan-500 shadow-md group cursor-pointer bg-slate-950"
          title="Click to view full map"
        >
          <canvas
            ref={canvasRef}
            className="w-24 h-24 sm:w-28 sm:h-28 object-cover block group-hover:scale-105 transition duration-200"
          />
          {/* Mini Map badge label */}
          <div className="absolute top-1 left-1 bg-slate-950/80 text-[8px] font-mono text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/40 uppercase">
            Map
          </div>
          <div className="absolute bottom-1 right-1 bg-slate-950/80 text-[8px] font-mono text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition">
            <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Geo Telemetry Breakdown */}
        <div className="flex-1 min-w-0 text-xs flex flex-col justify-between gap-1">
          {/* Coordinates */}
          <div className="font-mono font-bold text-cyan-300 text-xs sm:text-[13px] flex items-center justify-between">
            <span className="truncate">
              {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
            </span>
          </div>

          {/* Address */}
          <div className="text-slate-200 text-[11px] leading-tight line-clamp-2">
            📍 {address.isPendingReverseGeocode ? (
              <span className="text-amber-400">Offline Fixed (Pending Street Name Sync)</span>
            ) : (
              address.formatted
            )}
          </div>

          {/* Altitude & Heading */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 pt-0.5">
            <span>▲ Elev: {altFormatted}</span>
            <span className="text-slate-400">•</span>
            <span className="text-cyan-300">🧭 {Math.round(compassHeading)}° {compassInfo.code}</span>
          </div>

          {/* DMS Coordinates & Accuracy */}
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {toDMS(location.latitude, true)} {toDMS(location.longitude, false)} • Acc: {accFormatted}
          </div>
        </div>
      </div>
    </div>
  );
};

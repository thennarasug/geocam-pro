import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Layers, 
  Image as ImageIcon,
  Calendar,
  Compass,
  AlertCircle
} from 'lucide-react';
import { GeoPhoto, GeoLocationData, OfflineGpsBreadcrumb } from '../types/camera';
import { formatCoordinates, formatAltitude } from '../utils/geoUtils';

interface MapExplorerProps {
  photos: GeoPhoto[];
  currentLocation: GeoLocationData | null;
  compassHeading: number;
  breadcrumbs: OfflineGpsBreadcrumb[];
  onClose: () => void;
  onOpenPhotoDetail: (photo: GeoPhoto) => void;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  photos,
  currentLocation,
  compassHeading,
  breadcrumbs,
  onClose,
  onOpenPhotoDetail,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const breadcrumbLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<GeoPhoto | null>(null);
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on user location or first photo or default
    const initialLat = currentLocation?.latitude || (photos.length > 0 ? photos[0].location.latitude : 37.8199);
    const initialLng = currentLocation?.longitude || (photos.length > 0 ? photos[0].location.longitude : -122.4782);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });
    mapRef.current = map;

    // Dark styled OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers for Photos
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const displayPhotos = filterPendingOnly
      ? photos.filter((p) => p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode)
      : photos;

    displayPhotos.forEach((photo) => {
      const isPending = photo.syncStatus === 'pending_sync' || photo.address.isPendingReverseGeocode;
      
      // Custom HTML Marker with Photo Thumbnail
      const customIcon = L.divIcon({
        className: 'custom-photo-marker',
        html: `
          <div style="
            width: 44px; 
            height: 44px; 
            border-radius: 12px; 
            overflow: hidden; 
            border: 3px solid ${isPending ? '#f59e0b' : '#06b6d4'}; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            background: #0f172a;
            position: relative;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <img src="${photo.thumbnailUrl || photo.stampedDataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
            ${isPending ? '<div style="position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; background: #f59e0b; border-radius: 9999px;"></div>' : ''}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([photo.location.latitude, photo.location.longitude], {
        icon: customIcon,
      });

      marker.on('click', () => {
        setSelectedPhoto(photo);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [photos, filterPendingOnly]);

  // Update Breadcrumb Path
  useEffect(() => {
    if (!mapRef.current) return;

    if (breadcrumbLayerRef.current) {
      mapRef.current.removeLayer(breadcrumbLayerRef.current);
    }

    if (breadcrumbs.length > 1) {
      const latlngs: [number, number][] = breadcrumbs.map((b) => [b.latitude, b.longitude]);
      breadcrumbLayerRef.current = L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 3,
        opacity: 0.6,
        dashArray: '4, 8',
      }).addTo(mapRef.current);
    }
  }, [breadcrumbs]);

  // Update Current User Location Marker
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;

    const latlng: [number, number] = [currentLocation.latitude, currentLocation.longitude];

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          width: 24px; 
          height: 24px; 
          border-radius: 9999px; 
          background: #38bdf8; 
          border: 3px solid #ffffff; 
          box-shadow: 0 0 14px #38bdf8;
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [0, 0],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latlng);
    } else {
      userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(mapRef.current);
    }
  }, [currentLocation]);

  const recenterOnUser = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo([currentLocation.latitude, currentLocation.longitude], 16, { duration: 1 });
    }
  };

  const fitAllPhotos = () => {
    if (!mapRef.current || photos.length === 0) return;
    const bounds = L.latLngBounds(photos.map((p) => [p.location.latitude, p.location.longitude]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-200">
      {/* Top Floating Map Header */}
      <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between gap-3 pointer-events-none">
        <button
          onClick={onClose}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto transition"
          title="Back to Camera"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-auto flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-white">
            {photos.length} Photo{photos.length === 1 ? '' : 's'} Mapped
          </span>
          <button
            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            className={`ml-2 text-[11px] px-2 py-0.5 rounded-md font-medium transition ${
              filterPendingOnly 
                ? 'bg-amber-500 text-black font-bold' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {filterPendingOnly ? 'Showing Offline Only' : 'Filter Offline'}
          </button>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={fitAllPhotos}
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-2xl backdrop-blur-md transition"
            title="Fit All Photos"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={recenterOnUser}
            className="p-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-2xl backdrop-blur-md transition"
            title="My GPS Location"
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Bottom Popup Card for Selected Photo Pin */}
      {selectedPhoto && (
        <div className="absolute bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-96 z-40 bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300">
              {formatCoordinates(selectedPhoto.location.latitude, selectedPhoto.location.longitude, 'DD')}
            </span>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-3">
            <img
              src={selectedPhoto.thumbnailUrl || selectedPhoto.stampedDataUrl}
              alt="Preview"
              className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
            />
            <div className="flex flex-col justify-between text-xs overflow-hidden">
              <p className="text-slate-200 font-medium truncate">
                {selectedPhoto.address.isPendingReverseGeocode ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Offline (Pending Sync)
                  </span>
                ) : (
                  selectedPhoto.address.formatted
                )}
              </p>
              <p className="text-[11px] text-slate-400">
                {new Date(selectedPhoto.timestamp).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <span>▲ {formatAltitude(selectedPhoto.location.altitude, 'metric')}</span>
                <span>• {selectedPhoto.compassHeading}°</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onOpenPhotoDetail(selectedPhoto);
              setSelectedPhoto(null);
            }}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            Inspect Full Photo & EXIF
          </button>
        </div>
      )}
    </div>
  );
};

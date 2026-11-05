import { useState, useEffect, useRef, useCallback } from 'react';
import { GeoLocationData, DeviceTilt, OfflineGpsBreadcrumb } from '../types/camera';
import { saveBreadcrumb } from '../services/storage';

export interface UseGeoSensorsReturn {
  location: GeoLocationData | null;
  tilt: DeviceTilt;
  compassHeading: number;
  gpsStatus: 'acquiring' | 'locked' | 'error' | 'simulated';
  gpsError: string | null;
  isSimulated: boolean;
  toggleSimulation: () => void;
  setManualLocation: (lat: number, lng: number, alt?: number) => void;
  calibrateCompass: () => void;
}

// Fallback high-fidelity sample location (e.g., Golden Gate Overlook)
const DEFAULT_FALLBACK_LOCATION: GeoLocationData = {
  latitude: 37.819929,
  longitude: -122.478255,
  altitude: 84.5,
  accuracy: 3.2,
  altitudeAccuracy: 1.5,
  heading: 215,
  speed: 0.2,
  timestamp: Date.now(),
  isSimulated: true,
};

export function useGeoSensors(enableTracking = true): UseGeoSensorsReturn {
  const [location, setLocation] = useState<GeoLocationData | null>(null);
  const [tilt, setTilt] = useState<DeviceTilt>({ pitch: 0, roll: 0 });
  const [compassHeading, setCompassHeading] = useState<number>(215);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'error' | 'simulated'>('acquiring');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const lastBreadcrumbRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Record breadcrumb periodically (e.g. every 15s or 10 meters)
  const maybeLogBreadcrumb = useCallback((loc: GeoLocationData) => {
    if (!enableTracking) return;
    const now = Date.now();
    if (now - lastBreadcrumbRef.current > 15000) {
      lastBreadcrumbRef.current = now;
      const breadcrumb: OfflineGpsBreadcrumb = {
        id: `bc_${now}_${Math.random().toString(36).substring(2, 6)}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        accuracy: loc.accuracy,
        heading: loc.heading,
        timestamp: now,
      };
      saveBreadcrumb(breadcrumb).catch(() => {});
    }
  }, [enableTracking]);

  // 1. Geolocation Watcher
  useEffect(() => {
    if (isSimulated) {
      setGpsStatus('simulated');
      setLocation(DEFAULT_FALLBACK_LOCATION);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation API not supported by this browser.');
      setLocation(DEFAULT_FALLBACK_LOCATION);
      setIsSimulated(true);
      return;
    }

    setGpsStatus('acquiring');

    const handleSuccess = (position: GeolocationPosition) => {
      const coords = position.coords;
      const newLoc: GeoLocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: coords.accuracy,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        speed: coords.speed,
        timestamp: position.timestamp || Date.now(),
        isSimulated: false,
      };

      setLocation(newLoc);
      setGpsStatus('locked');
      setGpsError(null);

      // If hardware compass heading is reported by GPS, sync it
      if (coords.heading !== null && !isNaN(coords.heading)) {
        setCompassHeading(coords.heading);
      }

      maybeLogBreadcrumb(newLoc);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation error:', error.message);
      let errMsg = 'Could not acquire GPS position.';
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = 'Location permission denied. Using high-accuracy simulation.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errMsg = 'GPS signal unavailable. Using high-accuracy simulation.';
      } else if (error.code === error.TIMEOUT) {
        errMsg = 'GPS search timed out. Using high-accuracy simulation.';
      }
      setGpsError(errMsg);
      setGpsStatus('simulated');
      setIsSimulated(true);
      setLocation({ ...DEFAULT_FALLBACK_LOCATION, timestamp: Date.now() });
    };

    const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    });
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isSimulated, maybeLogBreadcrumb]);

  // 2. Device Orientation (Compass & Tilt)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // 1. Tilt (Pitch & Roll)
      // beta: front-to-back tilt in degrees [-180, 180]
      // gamma: left-to-right tilt in degrees [-90, 90]
      const pitch = e.beta !== null ? Math.round(e.beta * 10) / 10 : 0;
      const roll = e.gamma !== null ? Math.round(e.gamma * 10) / 10 : 0;
      setTilt({ pitch, roll });

      // 2. Compass Heading
      let heading: number | null = null;
      // iOS Safari provides webkitCompassHeading directly
      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android standard: alpha is rotation around z-axis
        heading = 360 - e.alpha;
      }

      if (heading !== null && !isNaN(heading)) {
        setCompassHeading(Math.round(((heading % 360) + 360) % 360));
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  const toggleSimulation = () => {
    setIsSimulated((prev) => !prev);
  };

  const setManualLocation = (lat: number, lng: number, alt: number = 50) => {
    const customLoc: GeoLocationData = {
      latitude: lat,
      longitude: lng,
      altitude: alt,
      accuracy: 2.5,
      altitudeAccuracy: 1.0,
      heading: compassHeading,
      speed: 0,
      timestamp: Date.now(),
      isSimulated: true,
    };
    setLocation(customLoc);
    setIsSimulated(true);
    setGpsStatus('simulated');
    maybeLogBreadcrumb(customLoc);
  };

  const calibrateCompass = () => {
    // Request permission on iOS 13+ if needed
    if (
      typeof (DeviceOrientationEvent as any)?.requestPermission === 'function'
    ) {
      (DeviceOrientationEvent as any).requestPermission().catch(console.error);
    }
  };

  return {
    location,
    tilt,
    compassHeading,
    gpsStatus,
    gpsError,
    isSimulated,
    toggleSimulation,
    setManualLocation,
    calibrateCompass,
  };
}

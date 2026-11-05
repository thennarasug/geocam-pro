export type CoordFormat = 'DD' | 'DMS' | 'UTM';
export type UnitSystem = 'metric' | 'imperial';

export type WatermarkTemplateId = 
  | 'gps_map_camera'
  | 'survey_pro' 
  | 'corner_badge' 
  | 'telemetry_hud' 
  | 'minimal_coords' 
  | 'raw_photo';

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  isSimulated?: boolean;
}

export interface ResolvedAddress {
  formatted: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  isPendingReverseGeocode: boolean;
  syncedAt?: number;
}

export interface DeviceTilt {
  pitch: number; // degrees, front/back tilt
  roll: number;  // degrees, left/right tilt
}

export interface WatermarkOptions {
  templateId: WatermarkTemplateId;
  showMapSnippet: boolean;
  mapZoom: number;
  showCoordinates: boolean;
  showAddress: boolean;
  showAltitude: boolean;
  showCompass: boolean;
  showTimestamp: boolean;
  showProjectName: boolean;
  showSurveyor: boolean;
  showCustomNote: boolean;
  showAccuracy: boolean;
  coordFormat: CoordFormat;
  unitSystem: UnitSystem;
}

export interface GeoPhoto {
  id: string;
  timestamp: number;
  originalDataUrl: string;
  stampedDataUrl: string;
  thumbnailUrl: string;
  location: GeoLocationData;
  address: ResolvedAddress;
  tilt: DeviceTilt;
  compassHeading: number;
  projectName: string;
  surveyorName: string;
  customNote: string;
  watermarkTemplate: WatermarkTemplateId;
  filterId?: import('../utils/filterUtils').CameraFilterId;
  offlineCaptured: boolean;
  syncStatus: 'synced' | 'pending_sync' | 'syncing' | 'failed';
  syncError?: string;
  associatedTrackId?: string;
}

export interface OfflineGpsBreadcrumb {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  timestamp: number;
}

export interface AppSettings {
  watermark: WatermarkOptions;
  projectName: string;
  surveyorName: string;
  cameraFacing: 'environment' | 'user';
  gridType: 'none' | 'rule_of_thirds' | 'crosshair' | 'golden_ratio';
  activeFilter: import('../utils/filterUtils').CameraFilterId;
  compassDefaultMode?: 'ribbon' | 'circular';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  highAccuracyGPS: boolean;
  autoSyncOnline: boolean;
  saveBothVersions: boolean;
  offlineTrackingEnabled: boolean;
}

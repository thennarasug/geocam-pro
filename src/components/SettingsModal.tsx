import React from 'react';
import { 
  X, 
  Map, 
  Sliders, 
  Check, 
  Layers, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Smartphone, 
  Globe, 
  FileText,
  Compass,
  Download,
  Palette,
  Grid
} from 'lucide-react';
import { AppSettings, WatermarkTemplateId, CoordFormat, UnitSystem } from '../types/camera';
import { saveSettings } from '../services/storage';
import { CAMERA_FILTERS, CameraFilterId } from '../utils/filterUtils';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  onOpenInstallModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenInstallModal,
}) => {
  const update = (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    onUpdateSettings(updated);
    saveSettings(updated);
  };

  const updateWatermark = (partial: Partial<AppSettings['watermark']>) => {
    const updated = {
      ...settings,
      watermark: {
        ...settings.watermark,
        ...partial,
      },
    };
    onUpdateSettings(updated);
    saveSettings(updated);
  };

  const templates: { id: WatermarkTemplateId; label: string; desc: string }[] = [
    {
      id: 'gps_map_camera',
      label: 'GPS Map & Address (Recommended)',
      desc: 'Embeds a live map snippet with pin alongside full coordinate telemetry and street address',
    },
    {
      id: 'survey_pro',
      label: 'Survey Pro Banner',
      desc: 'Sleek dark bottom banner with compass rose, elevation, and field inspection details',
    },
    {
      id: 'corner_badge',
      label: 'Floating Corner Card',
      desc: 'Compact rounded badge in the corner with embedded mini-map and coordinates',
    },
    {
      id: 'telemetry_hud',
      label: 'Technical Spec HUD',
      desc: 'Top & bottom military/survey spec bars with pitch, roll tilt, and UTC stamp',
    },
    {
      id: 'minimal_coords',
      label: 'Minimalist Text Stamp',
      desc: 'Clean text overlay without container bars for low-profile field photos',
    },
    {
      id: 'raw_photo',
      label: 'Raw Photo (No Stamp)',
      desc: 'Preserves untouched photo while keeping GPS metadata logged in app database',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col overflow-y-auto text-slate-100 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Camera & Geotag Settings
            </h2>
            <p className="text-xs text-slate-400">Configure watermark stamps, map snippets and telemetry</p>
          </div>
        </div>

        <button
          onClick={onOpenInstallModal}
          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download APK</span>
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* SECTION 1: STAMP TEMPLATE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Watermark Stamp Layout
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => updateWatermark({ templateId: tmpl.id })}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                  settings.watermark.templateId === tmpl.id
                    ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{tmpl.label}</span>
                    {tmpl.id === 'gps_map_camera' && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                        Map Snippet
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tmpl.desc}</p>
                </div>
                {settings.watermark.templateId === tmpl.id && (
                  <div className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: MAP SNIPPET SETTINGS */}
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Map className="w-4 h-4" /> Map Snippet Over Captured Photo
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200">Embed Map Snippet in Stamp</span>
              <p className="text-[11px] text-slate-400">Embeds a square centered map thumbnail with red GPS pin</p>
            </div>
            <input
              type="checkbox"
              checked={settings.watermark.showMapSnippet !== false}
              onChange={(e) => updateWatermark({ showMapSnippet: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-semibold text-slate-200">Map Zoom Level</span>
              <p className="text-[11px] text-slate-400">Controls scale of the embedded map snippet</p>
            </div>
            <select
              value={settings.watermark.mapZoom || 15}
              onChange={(e) => updateWatermark({ mapZoom: parseInt(e.target.value, 10) })}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="13">Zoom 13 - Regional / Neighborhood</option>
              <option value="15">Zoom 15 - Street Level (Default)</option>
              <option value="17">Zoom 17 - High Detail / Building</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: WATERMARK DATA TOGGLES */}
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> Data Elements on Stamp
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { key: 'showCoordinates', label: 'Coordinates (Lat, Lon)' },
              { key: 'showAddress', label: 'Resolved Street Address' },
              { key: 'showAltitude', label: 'Elevation / Altitude' },
              { key: 'showCompass', label: 'Compass Direction & Heading' },
              { key: 'showTimestamp', label: 'Date, Time & Timezone' },
              { key: 'showAccuracy', label: 'GPS Accuracy (± meters/ft)' },
              { key: 'showProjectName', label: 'Project Name' },
              { key: 'showSurveyor', label: 'Surveyor / Inspector Name' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 cursor-pointer">
                <span className="text-slate-300 font-medium">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(settings.watermark as any)[item.key]}
                  onChange={(e) => updateWatermark({ [item.key]: e.target.checked } as any)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                />
              </label>
            ))}
          </div>
        </div>

        {/* SECTION 4: FORMATS & UNITS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400">
              Coordinate Format
            </label>
            <select
              value={settings.watermark.coordFormat}
              onChange={(e) => updateWatermark({ coordFormat: e.target.value as CoordFormat })}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="DD">Decimal Degrees (37.774929°, -122.419416°)</option>
              <option value="DMS">DMS (37°46'29.7"N  122°24'41.2"W)</option>
              <option value="UTM">UTM (Universal Transverse Mercator)</option>
            </select>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400">
              Units System
            </label>
            <select
              value={settings.watermark.unitSystem}
              onChange={(e) => updateWatermark({ unitSystem: e.target.value as UnitSystem })}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="metric">Metric (Meters, km/h)</option>
              <option value="imperial">Imperial (Feet, mph)</option>
            </select>
          </div>
        </div>

        {/* SECTION 5: FIELD INSPECTION DEFAULTS */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Project & Inspector Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Default Project Name</label>
              <input
                type="text"
                value={settings.projectName}
                onChange={(e) => update({ projectName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Default Surveyor Name</label>
              <input
                type="text"
                value={settings.surveyorName}
                onChange={(e) => update({ surveyorName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: CAMERA VISUAL FILTERS */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Default Camera Filter
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Current: {CAMERA_FILTERS.find((f) => f.id === (settings.activeFilter || 'none'))?.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Selected filter is applied live in the viewfinder and stamped onto exported field photos.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            {CAMERA_FILTERS.map((f) => {
              const isSelected = (settings.activeFilter || 'none') === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => update({ activeFilter: f.id })}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white truncate">{f.name}</span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">
                    {f.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 7: INTERACTIVE COMPASS OVERLAY */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4" /> Viewfinder Compass Overlay
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200">Compass Display Mode</span>
              <p className="text-[11px] text-slate-400">Horizontal sliding degree tape vs 360° circular dial</p>
            </div>
            <select
              value={settings.compassDefaultMode || 'ribbon'}
              onChange={(e) => update({ compassDefaultMode: e.target.value as 'ribbon' | 'circular' })}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ribbon">Horizontal Ribbon Tape (Degrees & Cardinals)</option>
              <option value="circular">360° Circular Compass Rose</option>
            </select>
          </div>
        </div>

        {/* SECTION 8: CAMERA VIEWFINDER GRID (RULE OF THIRDS) */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Grid className="w-4 h-4" /> Viewfinder Grid Overlay (Rule of Thirds)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Overlays compositional guides on the camera screen for better framing and horizon alignment
              </p>
            </div>
            
            {/* Quick Toggle Switch for Rule of Thirds */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.gridType !== 'none'}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  update({ gridType: isChecked ? 'rule_of_thirds' : 'none' });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Grid Style Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {[
              {
                id: 'rule_of_thirds',
                label: 'Rule of Thirds',
                badge: 'Recommended',
                desc: '3×3 grid with 4 power points for balanced framing',
                previewType: 'thirds'
              },
              {
                id: 'crosshair',
                label: 'Survey Crosshair',
                badge: 'Center Target',
                desc: 'Circular aiming reticle with alignment crosshairs',
                previewType: 'cross'
              },
              {
                id: 'golden_ratio',
                label: 'Golden Ratio (Phi)',
                badge: '1:0.618:1',
                desc: 'Phi proportion grid for architectural lines',
                previewType: 'phi'
              },
            ].map((item) => {
              const isSelected = settings.gridType === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => update({ gridType: item.id as any })}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.label}</span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">{item.badge}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                  </div>

                  {/* Visual Mini Preview Box */}
                  <div className="mt-2.5 h-14 bg-slate-900 border border-slate-800/80 rounded-lg relative overflow-hidden flex items-center justify-center">
                    {item.previewType === 'thirds' && (
                      <div className="w-full h-full grid grid-cols-3 grid-rows-3 relative">
                        <div className="border-r border-b border-cyan-400/30" />
                        <div className="border-r border-b border-cyan-400/30" />
                        <div className="border-b border-cyan-400/30" />
                        <div className="border-r border-b border-cyan-400/30" />
                        <div className="border-r border-b border-cyan-400/30" />
                        <div className="border-b border-cyan-400/30" />
                        <div className="border-r border-cyan-400/30" />
                        <div className="border-r border-cyan-400/30" />
                        <div />
                        {/* 4 dots */}
                        <div className="absolute left-[33%] top-[33%] -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <div className="absolute left-[67%] top-[33%] -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <div className="absolute left-[33%] top-[67%] -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <div className="absolute left-[67%] top-[67%] -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      </div>
                    )}
                    {item.previewType === 'cross' && (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full border border-cyan-400/60 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-cyan-400" />
                        </div>
                        <div className="absolute w-12 h-px bg-cyan-400/50" />
                        <div className="absolute h-10 w-px bg-cyan-400/50" />
                      </div>
                    )}
                    {item.previewType === 'phi' && (
                      <div className="w-full h-full relative">
                        <div className="absolute top-0 bottom-0 left-[38.2%] w-px bg-amber-400/40" />
                        <div className="absolute top-0 bottom-0 left-[61.8%] w-px bg-amber-400/40" />
                        <div className="absolute left-0 right-0 top-[38.2%] h-px bg-amber-400/40" />
                        <div className="absolute left-0 right-0 top-[61.8%] h-px bg-amber-400/40" />
                        <div className="absolute left-[38.2%] top-[38.2%] -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400" />
                        <div className="absolute left-[61.8%] top-[38.2%] -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400" />
                        <div className="absolute left-[38.2%] top-[61.8%] -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400" />
                        <div className="absolute left-[61.8%] top-[61.8%] -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {settings.gridType === 'none' && (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between">
              <span>Viewfinder grid is currently turned off.</span>
              <button
                onClick={() => update({ gridType: 'rule_of_thirds' })}
                className="text-cyan-400 hover:underline font-semibold"
              >
                Enable Rule of Thirds
              </button>
            </div>
          )}
        </div>

        {/* SECTION 9: HARDWARE & SOUND */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Hardware Feedback
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-xs text-slate-200">Shutter Mechanical Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => update({ soundEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-xs text-slate-200">Haptic Shutter Vibration</span>
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) => update({ vibrationEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-200">Continuous Offline GPS Breadcrumb Logging</span>
            <input
              type="checkbox"
              checked={settings.offlineTrackingEnabled}
              onChange={(e) => update({ offlineTrackingEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

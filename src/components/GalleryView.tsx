import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  ArrowLeft, 
  Download, 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Archive, 
  Camera, 
  Trash2, 
  Filter,
  Search,
  X,
  Palette,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';
import { GeoPhoto, AppSettings } from '../types/camera';
import { formatCoordinates, formatAltitude, toDMS } from '../utils/geoUtils';
import { syncPendingPhotos } from '../services/geocodingSync';
import { deletePhotos } from '../services/storage';
import { CAMERA_FILTERS } from '../utils/filterUtils';

interface GalleryViewProps {
  photos: GeoPhoto[];
  settings: AppSettings;
  isOnline: boolean;
  onClose: () => void;
  onOpenPhotoDetail: (photo: GeoPhoto) => void;
  onPhotosReload: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  settings,
  isOnline,
  onClose,
  onOpenPhotoDetail,
  onPhotosReload,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'offline' | 'synced'>('all');
  const [selectedFilterType, setSelectedFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  
  // Multi-photo selection state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const pendingCount = photos.filter(
    (p) => p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode
  ).length;

  const filteredPhotos = photos.filter((p) => {
    // 1. Status Filter
    if (statusFilter === 'pending' && !(p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode)) return false;
    if (statusFilter === 'offline' && !p.offlineCaptured) return false;
    if (statusFilter === 'synced' && (p.syncStatus === 'pending_sync' || p.address.isPendingReverseGeocode)) return false;

    // 2. Camera Visual Filter
    if (selectedFilterType !== 'all') {
      if ((p.filterId || 'none') !== selectedFilterType) return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAddr = p.address.formatted.toLowerCase().includes(q);
      const matchProj = (p.projectName || '').toLowerCase().includes(q);
      const matchNote = (p.customNote || '').toLowerCase().includes(q);
      const matchCoords = `${p.location.latitude},${p.location.longitude}`.includes(q);
      if (!matchAddr && !matchProj && !matchNote && !matchCoords) return false;
    }

    return true;
  });

  const toggleSelectPhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    if (next.size > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingSelected(true);
    try {
      await deletePhotos(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setShowDeleteConfirm(false);
      onPhotosReload();
      setSyncNotice(`Deleted ${selectedIds.size} photo(s).`);
      setTimeout(() => setSyncNotice(null), 3000);
    } catch (e: any) {
      console.error('Delete error:', e);
      setSyncNotice(`Failed to delete photos: ${e.message}`);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      setSyncNotice('Device is offline. Connect to internet to sync street addresses.');
      return;
    }
    setIsSyncing(true);
    setSyncNotice('Syncing pending photos with OpenStreetMap Nominatim...');
    try {
      const res = await syncPendingPhotos();
      onPhotosReload();
      setSyncNotice(`Synced ${res.synced} photo(s) with addresses!`);
      setTimeout(() => setSyncNotice(null), 3500);
    } catch (e: any) {
      setSyncNotice(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Batch Export all filtered photos OR selected photos + CSV metadata report in ZIP
  const handleExportZip = async () => {
    let targetPhotos = filteredPhotos;
    if (selectedIds.size > 0) {
      targetPhotos = filteredPhotos.filter((p) => selectedIds.has(p.id));
    }
    if (targetPhotos.length === 0) targetPhotos = photos;
    if (targetPhotos.length === 0) return;

    setIsExportingZip(true);

    try {
      const zip = new JSZip();
      const photosFolder = zip.folder('geotagged_photos');

      // Create CSV Header
      let csvContent = 'Photo ID,Timestamp,Latitude,Longitude,Altitude (m),Accuracy (m),Heading (deg),Address,Project,Surveyor,Filter,Notes,Pending Sync\n';

      for (let i = 0; i < targetPhotos.length; i++) {
        const photo = targetPhotos[i];
        const filename = `Photo_${i + 1}_${photo.id}.jpg`;

        // Fetch base64 data to blob
        const res = await fetch(photo.stampedDataUrl);
        const blob = await res.blob();
        photosFolder?.file(filename, blob);

        // Add CSV row
        const escapedAddr = `"${photo.address.formatted.replace(/"/g, '""')}"`;
        const escapedNote = `"${(photo.customNote || '').replace(/"/g, '""')}"`;
        const isPending = photo.address.isPendingReverseGeocode ? 'YES' : 'NO';
        const filterName = CAMERA_FILTERS.find((f) => f.id === photo.filterId)?.name || 'Normal';

        csvContent += `${photo.id},${new Date(photo.timestamp).toISOString()},${photo.location.latitude},${photo.location.longitude},${photo.location.altitude || ''},${photo.location.accuracy || ''},${photo.compassHeading},${escapedAddr},"${photo.projectName || ''}","${photo.surveyorName || ''}","${filterName}",${escapedNote},${isPending}\n`;
      }

      zip.file('survey_report.csv', csvContent);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `GeoCam_Survey_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('ZIP export error:', e);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-150">
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
              <Camera className="w-5 h-5 text-cyan-400" />
              GeoCam Photo Gallery
            </h1>
            <p className="text-xs text-slate-400">
              Showing {filteredPhotos.length} of {photos.length} Photos
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && !isSelectionMode && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
              <span>({pendingCount})</span>
            </button>
          )}

          {photos.length > 0 && (
            <button
              onClick={() => {
                if (isSelectionMode) {
                  handleCancelSelection();
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
                isSelectionMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectionMode ? 'Cancel' : 'Select'}</span>
            </button>
          )}

          <button
            onClick={handleExportZip}
            disabled={isExportingZip || filteredPhotos.length === 0}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>
              {isExportingZip 
                ? 'Exporting...' 
                : selectedIds.size > 0 
                ? `Export (${selectedIds.size})` 
                : 'Export ZIP'}
            </span>
          </button>
        </div>
      </div>

      {/* SELECTION ACTIONS DOCK */}
      {isSelectionMode && (
        <div className="p-3 bg-cyan-950/70 border-b border-cyan-800 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-700/60 font-semibold flex items-center gap-1.5"
            >
              {selectedIds.size === filteredPhotos.length ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All ({filteredPhotos.length})</span>
                </>
              )}
            </button>
            <span className="text-white font-bold">
              {selectedIds.size} of {filteredPhotos.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {syncNotice && (
        <div className="bg-cyan-950/80 border-b border-cyan-800 text-cyan-200 text-xs px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* SEARCH & FILTERS CONTROL BAR */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2.5 shrink-0">
        {/* Search Input Row */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos by address, project, note, or coordinates..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row: Status Pills & Camera Filter Dropdown */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Status Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: `All (${photos.length})` },
              { id: 'pending', label: `Pending Sync (${pendingCount})` },
              { id: 'offline', label: `Offline (${photos.filter((p) => p.offlineCaptured).length})` },
              { id: 'synced', label: `Synced (${photos.filter((p) => !p.address.isPendingReverseGeocode).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Camera Filter Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter:</span>
            </span>
            <select
              value={selectedFilterType}
              onChange={(e) => setSelectedFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-cyan-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="all">All Camera Filters</option>
              {CAMERA_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredPhotos.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
            <Camera className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-medium">No photos match your filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting search keywords or selecting "All Photos".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredPhotos.map((photo) => {
              const isPending = photo.syncStatus === 'pending_sync' || photo.address.isPendingReverseGeocode;
              const filterInfo = CAMERA_FILTERS.find((f) => f.id === photo.filterId);
              const isSelected = selectedIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectPhoto(photo.id);
                    } else {
                      onOpenPhotoDetail(photo);
                    }
                  }}
                  className={`group relative bg-slate-900 rounded-xl overflow-hidden border cursor-pointer shadow-md transition transform hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-400/60'
                      : 'border-slate-800 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-black relative">
                    <img
                      src={photo.thumbnailUrl || photo.stampedDataUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />

                    {/* Camera Filter Tag Pill */}
                    {filterInfo && filterInfo.id !== 'none' && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 border border-cyan-500/40 text-cyan-300 text-[8px] font-mono shadow backdrop-blur-sm">
                        ✨ {filterInfo.name}
                      </span>
                    )}

                    {/* Multi-Select Checkbox Overlay */}
                    {(isSelectionMode || isSelected) && (
                      <div
                        onClick={(e) => toggleSelectPhoto(photo.id, e)}
                        className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition shadow-lg ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-black/60 border border-white/50 text-transparent hover:border-cyan-400'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Status Overlay Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isPending ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-bold shadow flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Pending Sync
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/80 text-white text-[9px] font-bold shadow flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Synced
                      </span>
                    )}
                  </div>

                  {/* Bottom Info Bar */}
                  <div className="p-2 bg-slate-900/95 text-[11px] font-mono">
                    <div className="text-cyan-300 font-bold truncate">
                      {photo.location.latitude.toFixed(4)}°, {photo.location.longitude.toFixed(4)}°
                    </div>
                    <div className="text-slate-400 text-[10px] truncate font-sans mt-0.5">
                      {photo.address.formatted}
                    </div>
                    <div className="text-slate-500 text-[9px] mt-0.5 flex items-center justify-between">
                      <span>{new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {photo.projectName && (
                        <span className="text-slate-400 truncate max-w-[80px]">{photo.projectName}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Selected Photos?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete {selectedIds.size} photo(s)? This will permanently remove them and their offline GPS telemetry logs.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeletingSelected}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {isDeletingSelected ? 'Deleting...' : `Delete ${selectedIds.size} Photo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

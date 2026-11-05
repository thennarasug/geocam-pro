import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Compass, 
  Target, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  RotateCw, 
  Eye, 
  EyeOff,
  Maximize2
} from 'lucide-react';
import { getCompassDirection } from '../utils/geoUtils';
import { triggerHaptic, playSuccessChirp } from '../utils/audio';

interface InteractiveCompassOverlayProps {
  heading: number; // 0 - 360 degrees
  tiltPitch?: number;
  tiltRoll?: number;
  defaultMode?: CompassMode;
  onHeadingChange?: (newHeading: number) => void;
  soundEnabled?: boolean;
}

export type CompassMode = 'ribbon' | 'circular' | 'theodolite';

export const InteractiveCompassOverlay: React.FC<InteractiveCompassOverlayProps> = ({
  heading,
  tiltPitch = 0,
  tiltRoll = 0,
  defaultMode = 'ribbon',
  onHeadingChange,
  soundEnabled = true,
}) => {
  const [mode, setMode] = useState<CompassMode>(defaultMode);
  const [targetBearing, setTargetBearing] = useState<number | null>(null);
  const [manualOffset, setManualOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartOffset, setDragStartOffset] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [wasAligned, setWasAligned] = useState<boolean>(false);

  // Effective bearing including any user manual adjustment
  const currentHeading = Math.round(((heading + manualOffset) % 360 + 360) % 360);
  const compassInfo = getCompassDirection(currentHeading);

  // Compute angle difference to target bearing if set
  let diffToTarget: number | null = null;
  let isAligned = false;

  if (targetBearing !== null) {
    let diff = (targetBearing - currentHeading + 540) % 360 - 180;
    diffToTarget = diff; // positive = turn right, negative = turn left
    isAligned = Math.abs(diff) <= 2.5; // within 2.5 degrees is aligned
  }

  // Trigger feedback when becoming aligned
  useEffect(() => {
    if (isAligned && !wasAligned) {
      triggerHaptic([35, 20]);
      if (soundEnabled) playSuccessChirp();
    }
    setWasAligned(isAligned);
  }, [isAligned, wasAligned, soundEnabled]);

  // Touch / Drag to rotate or calibrate heading
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(manualOffset);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    // 1 pixel = ~0.4 degrees
    const newOffset = Math.round((dragStartOffset - deltaX * 0.4) % 360);
    setManualOffset(newOffset);
    if (onHeadingChange) {
      onHeadingChange(Math.round(((heading + newOffset) % 360 + 360) % 360));
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Quick cardinal snap
  const snapToCardinal = (targetDeg: number) => {
    if (targetBearing === targetDeg) {
      setTargetBearing(null); // toggle off
    } else {
      setTargetBearing(targetDeg);
      triggerHaptic([20]);
    }
  };

  // Render the sliding degree tape ticks
  // We render a window around currentHeading ± 60°
  const renderRibbonTicks = () => {
    const ticks = [];
    const windowDegrees = 50; // ±50 degrees visible on screen
    const step = 5;

    for (let offset = -windowDegrees; offset <= windowDegrees; offset += step) {
      const deg = (Math.round(currentHeading / step) * step + offset + 3600) % 360;
      const isMajor = deg % 30 === 0;
      const isTen = deg % 10 === 0;

      // Special cardinal directions
      let label = '';
      let isCardinal = false;
      let cardinalColor = 'text-slate-300';

      if (deg === 0) {
        label = 'N';
        isCardinal = true;
        cardinalColor = 'text-red-500 font-extrabold text-sm';
      } else if (deg === 90) {
        label = 'E';
        isCardinal = true;
        cardinalColor = 'text-cyan-400 font-extrabold text-sm';
      } else if (deg === 180) {
        label = 'S';
        isCardinal = true;
        cardinalColor = 'text-emerald-400 font-extrabold text-sm';
      } else if (deg === 270) {
        label = 'W';
        isCardinal = true;
        cardinalColor = 'text-amber-400 font-extrabold text-sm';
      } else if (deg === 45) {
        label = 'NE';
      } else if (deg === 135) {
        label = 'SE';
      } else if (deg === 225) {
        label = 'SW';
      } else if (deg === 315) {
        label = 'NW';
      } else if (isMajor) {
        label = `${deg}°`;
      }

      // Check if this tick is the locked target bearing
      const isTarget = targetBearing !== null && Math.abs((deg - targetBearing + 540) % 360 - 180) < 2.5;

      ticks.push(
        <div
          key={`tick_${offset}_${deg}`}
          className="flex flex-col items-center shrink-0 select-none pointer-events-none"
          style={{ width: '28px' }}
        >
          {/* Degree / Cardinal Label */}
          <div className="h-4 flex items-center justify-center">
            {isTarget ? (
              <span className="text-amber-400 font-bold text-xs animate-bounce">🎯</span>
            ) : label ? (
              <span className={`text-[10px] font-mono leading-none ${isCardinal ? cardinalColor : 'text-slate-400'}`}>
                {label}
              </span>
            ) : null}
          </div>

          {/* Vertical tick notch */}
          <div
            className={`transition-colors ${
              isTarget
                ? 'w-1 h-3.5 bg-amber-400'
                : isCardinal
                ? 'w-0.5 h-3 bg-white'
                : isTen
                ? 'w-0.5 h-2 bg-slate-300'
                : 'w-px h-1 bg-slate-600'
            }`}
          />
        </div>
      );
    }

    return ticks;
  };

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none z-30">
      {/* 1. HORIZONTAL COMPASS TAPE RIBBON */}
      {mode === 'ribbon' && (
        <div className="w-full max-w-lg px-2 flex flex-col items-center">
          {/* Compass Ribbon Container */}
          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-full bg-slate-950/80 border backdrop-blur-md rounded-2xl p-1.5 shadow-2xl relative overflow-hidden pointer-events-auto cursor-ew-resize transition-all ${
              isAligned 
                ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400' 
                : targetBearing !== null 
                ? 'border-amber-500/70' 
                : 'border-slate-800/90'
            }`}
          >
            {/* Center Fixed Alignment Reticle & Triangular Pointer */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none z-20">
              {/* Downward triangle pointer */}
              <div 
                className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent transition-colors ${
                  isAligned 
                    ? 'border-t-[7px] border-t-emerald-400 drop-shadow-[0_0_6px_#34d399]' 
                    : targetBearing !== null
                    ? 'border-t-[7px] border-t-amber-400'
                    : 'border-t-[7px] border-t-cyan-400'
                }`} 
              />

              {/* Center vertical crosshair hairline */}
              <div 
                className={`w-0.5 flex-1 transition-colors ${
                  isAligned ? 'bg-emerald-400' : targetBearing !== null ? 'bg-amber-400' : 'bg-cyan-400/80'
                }`} 
              />

              {/* Upward triangle pointer */}
              <div 
                className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent transition-colors ${
                  isAligned ? 'border-b-[5px] border-b-emerald-400' : 'border-b-[5px] border-b-cyan-400'
                }`} 
              />
            </div>

            {/* Left/Right Edge Gradient Fades */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10" />

            {/* Sliding Tape Content */}
            <div className="flex items-end justify-center h-8 overflow-hidden">
              {renderRibbonTicks()}
            </div>
          </div>

          {/* Heading Readout & Target Guidance Strip */}
          <div className="flex items-center justify-between w-full px-2 mt-1 pointer-events-auto">
            {/* Left: Current Heading & Cardinal Badge */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800/80 px-2 py-0.5 rounded-lg text-xs font-mono backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">{currentHeading}°</span>
              <span className={`font-bold px-1 py-0.2 rounded text-[10px] ${
                compassInfo.code === 'N' ? 'bg-red-500/20 text-red-400' :
                compassInfo.code === 'E' ? 'bg-cyan-500/20 text-cyan-400' :
                compassInfo.code === 'S' ? 'bg-emerald-500/20 text-emerald-400' :
                compassInfo.code === 'W' ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-800 text-slate-300'
              }`}>
                {compassInfo.code}
              </span>
            </div>

            {/* Center: Target Guidance Status */}
            {targetBearing !== null && diffToTarget !== null ? (
              <div className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 shadow backdrop-blur-md ${
                isAligned
                  ? 'bg-emerald-500 text-slate-950 animate-pulse'
                  : 'bg-amber-500/90 text-slate-950'
              }`}>
                {isAligned ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>ALIGNED {targetBearing}°</span>
                  </>
                ) : diffToTarget > 0 ? (
                  <>
                    <span>Turn Right {Math.round(diffToTarget)}°</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Turn Left {Math.round(Math.abs(diffToTarget))}°</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Drag ribbon to adjust • Tap cardinal to align
              </div>
            )}

            {/* Right: Quick Controls Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode('circular')}
                className="p-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition text-[10px] font-mono flex items-center gap-1"
                title="Switch to Circular 360° Rose"
              >
                <span>Dial</span>
              </button>
              <button
                onClick={() => setShowControls(!showControls)}
                className={`p-1 rounded-lg border text-[10px] transition ${
                  showControls || targetBearing !== null
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Alignment Tools"
              >
                <Target className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CIRCULAR 360° COMPASS ROSE MODE */}
      {mode === 'circular' && (
        <div className="flex flex-col items-center pointer-events-auto mt-1">
          <div className="relative w-28 h-28 bg-slate-950/85 border border-cyan-500/40 rounded-full shadow-2xl backdrop-blur-md flex items-center justify-center p-1.5">
            {/* Outer Rotating Compass Rose */}
            <div 
              className="absolute inset-2 rounded-full border border-slate-700/80 flex items-center justify-center transition-transform duration-100"
              style={{ transform: `rotate(${-currentHeading}deg)` }}
            >
              {/* Cardinal Markers on dial */}
              <span className="absolute top-0 text-[11px] font-extrabold text-red-500 -translate-y-1">N</span>
              <span className="absolute right-0 text-[10px] font-bold text-cyan-400 translate-x-1">E</span>
              <span className="absolute bottom-0 text-[10px] font-bold text-emerald-400 translate-y-1">S</span>
              <span className="absolute left-0 text-[10px] font-bold text-amber-400 -translate-x-1">W</span>

              {/* Intercardinal dots */}
              <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-slate-500" />
              <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-slate-500" />
              <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-slate-500" />
              <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-slate-500" />

              {/* North Needle */}
              <div className="w-0.5 h-8 bg-gradient-to-t from-transparent via-red-500 to-red-400 absolute top-2 rounded-full" />
              {/* South Needle */}
              <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-slate-400 to-white absolute bottom-2 rounded-full" />
            </div>

            {/* Target Bearing Needle if set */}
            {targetBearing !== null && (
              <div 
                className="absolute inset-2 pointer-events-none transition-transform duration-100"
                style={{ transform: `rotate(${targetBearing - currentHeading}deg)` }}
              >
                <div className="w-1.5 h-3 bg-amber-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_#f59e0b]" />
              </div>
            )}

            {/* Center Heading Readout */}
            <div className="z-10 w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-inner">
              <span className="text-[11px] font-mono font-bold text-cyan-300 leading-none">
                {currentHeading}°
              </span>
              <span className="text-[9px] font-bold text-slate-300 leading-none mt-0.5">
                {compassInfo.code}
              </span>
            </div>

            {/* Mode Switch Button */}
            <button
              onClick={() => setMode('ribbon')}
              className="absolute -top-1 -right-1 bg-slate-800 hover:bg-slate-700 text-slate-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-slate-700 shadow"
              title="Switch to Ribbon Tape"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. CARDINAL ALIGNMENT CONTROL DOCK */}
      {showControls && (
        <div className="w-full max-w-sm mt-2 px-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Align Shot to Cardinal Direction:
              </span>
              {targetBearing !== null && (
                <button
                  onClick={() => setTargetBearing(null)}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Clear Target
                </button>
              )}
            </div>

            {/* Cardinal Snap Buttons: N (0°), E (90°), S (180°), W (270°) */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'North (0°)', deg: 0, color: 'hover:border-red-500' },
                { label: 'East (90°)', deg: 90, color: 'hover:border-cyan-400' },
                { label: 'South (180°)', deg: 180, color: 'hover:border-emerald-400' },
                { label: 'West (270°)', deg: 270, color: 'hover:border-amber-400' },
              ].map((cardinal) => (
                <button
                  key={cardinal.deg}
                  onClick={() => snapToCardinal(cardinal.deg)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-mono font-semibold transition border ${
                    targetBearing === cardinal.deg
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md'
                      : `bg-slate-900 text-slate-200 border-slate-800 ${cardinal.color}`
                  }`}
                >
                  {cardinal.label}
                </button>
              ))}
            </div>

            {/* Current Bearing Lock & Reset */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <button
                onClick={() => snapToCardinal(currentHeading)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition"
              >
                🔒 Lock Current Bearing ({currentHeading}°)
              </button>

              {manualOffset !== 0 && (
                <button
                  onClick={() => {
                    setManualOffset(0);
                    if (onHeadingChange) onHeadingChange(heading);
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" /> Reset Offset
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

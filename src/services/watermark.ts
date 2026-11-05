import { 
  GeoLocationData, 
  ResolvedAddress, 
  DeviceTilt, 
  WatermarkOptions, 
  WatermarkTemplateId 
} from '../types/camera';
import { 
  formatCoordinates, 
  formatAltitude, 
  formatAccuracy, 
  getCompassDirection, 
  formatDateTime 
} from '../utils/geoUtils';
import { getMapSnippetCanvas } from '../utils/mapSnippet';
import { CameraFilterId, getFilterCss } from '../utils/filterUtils';

/**
 * Render a high-resolution burned-in watermark stamp directly onto a photo,
 * embedding the snippet of map with coordinate details, address, and telemetry.
 */
export async function renderWatermarkedPhoto(
  sourceImage: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  location: GeoLocationData,
  address: ResolvedAddress,
  tilt: DeviceTilt,
  compassHeading: number,
  projectName: string,
  surveyorName: string,
  customNote: string,
  options: WatermarkOptions,
  filterId: CameraFilterId = 'none'
): Promise<{ stampedDataUrl: string; thumbnailUrl: string }> {
  let media: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

  if (typeof sourceImage === 'string') {
    media = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = sourceImage;
    });
  } else {
    media = sourceImage;
  }

  const width = media instanceof HTMLVideoElement 
    ? media.videoWidth 
    : media instanceof HTMLCanvasElement 
    ? media.width 
    : media.naturalWidth || media.width;
  const height = media instanceof HTMLVideoElement 
    ? media.videoHeight 
    : media instanceof HTMLCanvasElement 
    ? media.height 
    : media.naturalHeight || media.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw camera capture with selected filter applied
  if (filterId && filterId !== 'none') {
    ctx.filter = getFilterCss(filterId);
  }
  ctx.drawImage(media, 0, 0, width, height);
  ctx.filter = 'none'; // Ensure crisp unfiltered watermark overlay

  // If raw photo, return immediately
  if (options.templateId === 'raw_photo') {
    return {
      stampedDataUrl: canvas.toDataURL('image/jpeg', 0.92),
      thumbnailUrl: createThumbnail(canvas),
    };
  }

  // Dynamic scaling based on canvas width (baseline 1200px)
  const scale = Math.max(0.65, Math.min(2.5, width / 1200));
  const pad = 20 * scale;

  // 2. Fetch Map Snippet if enabled
  let mapCanvas: HTMLCanvasElement | null = null;
  if (options.showMapSnippet !== false) {
    try {
      const mapSnippetSize = Math.round(180 * scale);
      mapCanvas = await getMapSnippetCanvas(
        location.latitude,
        location.longitude,
        mapSnippetSize,
        options.mapZoom || 15
      );
    } catch (err) {
      console.warn('Map snippet generation error:', err);
    }
  }

  const dt = formatDateTime(location.timestamp);
  const coordsStr = formatCoordinates(location.latitude, location.longitude, options.coordFormat);
  const compassInfo = getCompassDirection(compassHeading);
  const altStr = formatAltitude(location.altitude, options.unitSystem);
  const accStr = formatAccuracy(location.accuracy, options.unitSystem);

  const templateData = {
    coordsStr,
    compassInfo,
    compassHeading,
    altStr,
    accStr,
    dt,
    address,
    location,
    tilt,
    projectName,
    surveyorName,
    customNote,
    options,
    mapCanvas,
  };

  switch (options.templateId) {
    case 'gps_map_camera':
    default:
      renderGpsMapCameraTemplate(ctx, width, height, scale, pad, templateData);
      break;

    case 'survey_pro':
      renderSurveyProTemplate(ctx, width, height, scale, pad, templateData);
      break;

    case 'corner_badge':
      renderCornerBadgeTemplate(ctx, width, height, scale, pad, templateData);
      break;

    case 'telemetry_hud':
      renderTelemetryHudTemplate(ctx, width, height, scale, pad, templateData);
      break;

    case 'minimal_coords':
      renderMinimalCoordsTemplate(ctx, width, height, scale, pad, templateData);
      break;
  }

  const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const thumbnailUrl = createThumbnail(canvas);

  return { stampedDataUrl, thumbnailUrl };
}

// ----------------- TEMPLATE: GPS Map Camera (Map Snippet + Telemetry Bar) -----------------
function renderGpsMapCameraTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: any
) {
  const barHeight = Math.max(170 * scale, 190 * scale);
  const barY = height - barHeight;

  // Dark frosted gradient background
  const grad = ctx.createLinearGradient(0, barY, 0, height);
  grad.addColorStop(0, 'rgba(10, 15, 29, 0.88)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, width, barHeight);

  // Cyan accent bar on top
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(0, barY, width, 3.5 * scale);

  let textStartX = pad * 1.2;

  // 1. EMBEDDED MAP SNIPPET
  if (data.mapCanvas && data.options.showMapSnippet !== false) {
    const mapSize = barHeight - 28 * scale;
    const mapX = pad * 1.2;
    const mapY = barY + 14 * scale;
    const mapRadius = 12 * scale;

    ctx.save();
    // Clip map inside rounded rectangle
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, mapRadius);
    ctx.clip();
    ctx.drawImage(data.mapCanvas, mapX, mapY, mapSize, mapSize);
    ctx.restore();

    // Border around map snippet
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, mapRadius);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#06b6d4';
    ctx.stroke();

    // Map badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(mapX + 6 * scale, mapY + 6 * scale, 56 * scale, 18 * scale, 4 * scale);
    ctx.fill();
    ctx.font = `bold ${Math.round(10 * scale)}px sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('GPS MAP', mapX + 11 * scale, mapY + 19 * scale);

    textStartX = mapX + mapSize + 18 * scale;
  }

  // 2. TEXT DETAILS: COORDINATES, ADDRESS & TELEMETRY
  let cursorY = barY + 30 * scale;
  const maxTextWidth = width - textStartX - (110 * scale); // leave space for right compass

  // Line 1: Coordinates + Accuracy Badge
  ctx.font = `bold ${Math.round(20 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
  ctx.fillStyle = '#38bdf8'; // Cyan
  const coordsLabel = `GPS: ${data.coordsStr}`;
  ctx.fillText(coordsLabel, textStartX, cursorY);

  if (data.options.showAccuracy) {
    const coordsWidth = ctx.measureText(coordsLabel).width;
    ctx.font = `${Math.round(14 * scale)}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(` (${data.accStr})`, textStartX + coordsWidth + 8 * scale, cursorY);
  }

  // Line 2: Street Address
  cursorY += 26 * scale;
  ctx.font = `${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  if (data.address.isPendingReverseGeocode) {
    ctx.fillStyle = '#f59e0b'; // Amber for offline
    ctx.fillText(`📍 ${data.address.formatted}`, textStartX, cursorY);
  } else {
    ctx.fillStyle = '#f8fafc';
    let addrText = data.address.formatted;
    if (ctx.measureText(addrText).width > maxTextWidth) {
      while (ctx.measureText(addrText + '...').width > maxTextWidth && addrText.length > 10) {
        addrText = addrText.substring(0, addrText.length - 1);
      }
      addrText += '...';
    }
    ctx.fillText(`📍 ${addrText}`, textStartX, cursorY);
  }

  // Line 3: Timestamp & Timezone
  cursorY += 24 * scale;
  ctx.font = `${Math.round(14 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#cbd5e1';
  let line3 = `📅 ${data.dt.date}  ${data.dt.time} (${data.dt.timezone})`;
  if (data.options.showProjectName && data.projectName) {
    line3 += `  •  ${data.projectName}`;
  }
  ctx.fillText(line3, textStartX, cursorY);

  // Line 4: Altitude, Heading & Tilt
  cursorY += 23 * scale;
  ctx.font = `${Math.round(13 * scale)}px monospace`;
  ctx.fillStyle = '#10b981'; // Emerald
  let line4 = `▲ Elev: ${data.altStr}  •  Dir: ${Math.round(data.compassHeading)}° ${data.compassInfo.code}`;
  ctx.fillText(line4, textStartX, cursorY);

  ctx.fillStyle = '#94a3b8';
  const line4Width = ctx.measureText(line4).width;
  ctx.fillText(`  •  Pitch: ${data.tilt.pitch.toFixed(1)}°`, textStartX + line4Width, cursorY);

  // Line 5: Custom Note / Surveyor
  if (data.customNote || (data.options.showSurveyor && data.surveyorName)) {
    cursorY += 22 * scale;
    ctx.font = `${Math.round(12 * scale)}px sans-serif`;
    ctx.fillStyle = '#e2e8f0';
    let line5 = '';
    if (data.customNote) line5 += `Note: ${data.customNote}  `;
    if (data.options.showSurveyor && data.surveyorName) line5 += `| Surveyor: ${data.surveyorName}`;
    ctx.fillText(line5, textStartX, cursorY);
  }

  // 3. RIGHT COMPASS ROSE
  const rightX = width - pad * 1.5;
  const compassRadius = 35 * scale;
  const compassCenterY = barY + barHeight / 2;

  ctx.save();
  ctx.translate(rightX - compassRadius, compassCenterY);

  ctx.beginPath();
  ctx.arc(0, 0, compassRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fill();
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  // Cardinal N indicator
  ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -compassRadius + 11 * scale);

  // Needle rotated to heading
  const headingRad = (data.compassHeading * Math.PI) / 180;
  ctx.rotate(headingRad);

  ctx.beginPath();
  ctx.moveTo(0, -compassRadius + 7 * scale);
  ctx.lineTo(-5 * scale, 0);
  ctx.lineTo(5 * scale, 0);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, compassRadius - 7 * scale);
  ctx.lineTo(-5 * scale, 0);
  ctx.lineTo(5 * scale, 0);
  ctx.closePath();
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  ctx.restore();
}

// ----------------- TEMPLATE: Survey Pro -----------------
function renderSurveyProTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: any
) {
  // Uses similar layout with survey grid styling
  renderGpsMapCameraTemplate(ctx, width, height, scale, pad, data);
}

// ----------------- TEMPLATE: Corner Floating Badge with Map -----------------
function renderCornerBadgeTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: any
) {
  const cardWidth = 520 * scale;
  const cardHeight = 180 * scale;
  const cardX = pad;
  const cardY = height - cardHeight - pad;
  const radius = 16 * scale;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.stroke();

  let textX = cardX + 18 * scale;

  // Embedded Mini Map Snippet in Card
  if (data.mapCanvas && data.options.showMapSnippet !== false) {
    const mapSize = cardHeight - 32 * scale;
    const mapX = cardX + 16 * scale;
    const mapY = cardY + 16 * scale;
    const mapRadius = 10 * scale;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, mapRadius);
    ctx.clip();
    ctx.drawImage(data.mapCanvas, mapX, mapY, mapSize, mapSize);
    ctx.restore();

    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, mapRadius);
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeStyle = '#06b6d4';
    ctx.stroke();

    textX = mapX + mapSize + 16 * scale;
  }

  let textY = cardY + 28 * scale;

  ctx.font = `bold ${Math.round(13 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('GEOCAM GPS MAP STAMP', textX, textY);

  textY += 24 * scale;
  ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.coordsStr, textX, textY);

  textY += 22 * scale;
  ctx.font = `${Math.round(13 * scale)}px sans-serif`;
  ctx.fillStyle = data.address.isPendingReverseGeocode ? '#f59e0b' : '#cbd5e1';
  let addr = data.address.formatted;
  if (addr.length > 38) addr = addr.substring(0, 35) + '...';
  ctx.fillText(addr, textX, textY);

  textY += 22 * scale;
  ctx.font = `${Math.round(13 * scale)}px monospace`;
  ctx.fillStyle = '#10b981';
  ctx.fillText(`Alt: ${data.altStr}  •  ${Math.round(data.compassHeading)}° ${data.compassInfo.code}`, textX, textY);

  textY += 22 * scale;
  ctx.font = `${Math.round(12 * scale)}px sans-serif`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${data.dt.date} ${data.dt.time} • ${data.projectName || 'Field Survey'}`, textX, textY);

  ctx.restore();
}

// ----------------- TEMPLATE: Telemetry HUD -----------------
function renderTelemetryHudTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: any
) {
  renderGpsMapCameraTemplate(ctx, width, height, scale, pad, data);
}

// ----------------- TEMPLATE: Minimal Coords -----------------
function renderMinimalCoordsTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: any
) {
  const textX = pad;
  const startY = height - pad - 60 * scale;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 2 * scale;

  ctx.font = `bold ${Math.round(18 * scale)}px monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.coordsStr, textX, startY);

  ctx.font = `${Math.round(14 * scale)}px sans-serif`;
  ctx.fillStyle = data.address.isPendingReverseGeocode ? '#fcd34d' : '#f1f5f9';
  ctx.fillText(data.address.formatted, textX, startY + 24 * scale);

  ctx.font = `${Math.round(13 * scale)}px sans-serif`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${data.dt.date} ${data.dt.time}  •  ${data.altStr}  •  ${data.compassInfo.code}`, textX, startY + 46 * scale);

  ctx.shadowColor = 'transparent';
}

function createThumbnail(sourceCanvas: HTMLCanvasElement): string {
  const thumbCanvas = document.createElement('canvas');
  const size = 300;
  thumbCanvas.width = size;
  thumbCanvas.height = size;
  const tCtx = thumbCanvas.getContext('2d')!;

  const minDim = Math.min(sourceCanvas.width, sourceCanvas.height);
  const sx = (sourceCanvas.width - minDim) / 2;
  const sy = (sourceCanvas.height - minDim) / 2;

  tCtx.drawImage(sourceCanvas, sx, sy, minDim, minDim, 0, 0, size, size);
  return thumbCanvas.toDataURL('image/jpeg', 0.8);
}

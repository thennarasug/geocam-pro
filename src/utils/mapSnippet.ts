/**
 * Map snippet generation utility for embedding mini-maps onto watermarked photos
 * Supports OpenStreetMap tile fetching with offline vector radar fallback.
 */

// Memory cache for fetched map tile images
const mapSnippetCache = new Map<string, HTMLCanvasElement>();

/**
 * Convert lat/lon to OpenStreetMap tile coordinates
 */
function latLonToTileCoords(lat: number, lon: number, zoom: number): { x: number; y: number; pixelX: number; pixelY: number } {
  const n = Math.pow(2, zoom);
  const xExact = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const tileX = Math.floor(xExact);
  const tileY = Math.floor(yExact);
  const pixelX = (xExact - tileX) * 256;
  const pixelY = (yExact - tileY) * 256;

  return { x: tileX, y: tileY, pixelX, pixelY };
}

/**
 * Fetch and stitch a centered map snippet around (lat, lon)
 * Returns a Canvas ready to be drawn directly onto the photo watermark
 */
export async function getMapSnippetCanvas(
  lat: number,
  lon: number,
  size = 200,
  zoom = 15
): Promise<HTMLCanvasElement> {
  const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${zoom}_${size}`;
  if (mapSnippetCache.has(cacheKey)) {
    return mapSnippetCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  try {
    const { x: centerTileX, y: centerTileY, pixelX, pixelY } = latLonToTileCoords(lat, lon, zoom);
    const n = Math.pow(2, zoom);

    // We stitch a 2x2 or 3x3 tile grid to ensure smooth centering
    // For size ~200px, 2x2 tiles (512x512) is plenty
    const tilePromises: Promise<{ img: HTMLImageElement; dx: number; dy: number } | null>[] = [];

    const offsets = [
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
    ];

    // Load main center tile and adjacent tiles
    const loadTile = (tx: number, ty: number, offsetX: number, offsetY: number) => {
      return new Promise<{ img: HTMLImageElement; dx: number; dy: number } | null>((resolve) => {
        const wrappedX = ((tx % n) + n) % n;
        if (ty < 0 || ty >= n) return resolve(null);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        const timeout = setTimeout(() => resolve(null), 3500);

        img.onload = () => {
          clearTimeout(timeout);
          resolve({ img, dx: offsetX, dy: offsetY });
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        img.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`;
      });
    };

    // Load surrounding 4 quadrant tiles
    const quadrants = [
      { tx: centerTileX, ty: centerTileY, ox: 0, oy: 0 },
      { tx: centerTileX + (pixelX > 128 ? 1 : -1), ty: centerTileY, ox: pixelX > 128 ? 256 : -256, oy: 0 },
      { tx: centerTileX, ty: centerTileY + (pixelY > 128 ? 1 : -1), ox: 0, oy: pixelY > 128 ? 256 : -256 },
      { 
        tx: centerTileX + (pixelX > 128 ? 1 : -1), 
        ty: centerTileY + (pixelY > 128 ? 1 : -1), 
        ox: pixelX > 128 ? 256 : -256, 
        oy: pixelY > 128 ? 256 : -256 
      },
    ];

    const results = await Promise.all(
      quadrants.map((q) => loadTile(q.tx, q.ty, q.ox, q.oy))
    );

    const validTiles = results.filter(Boolean) as { img: HTMLImageElement; dx: number; dy: number }[];

    if (validTiles.length === 0) {
      // Offline fallback: draw vector radar map
      drawVectorRadarMap(ctx, size, lat, lon);
    } else {
      // Draw stitched tiles centered on pixelX, pixelY
      const cx = size / 2;
      const cy = size / 2;

      ctx.save();
      for (const t of validTiles) {
        const drawX = cx - pixelX + t.dx;
        const drawY = cy - pixelY + t.dy;
        ctx.drawImage(t.img, drawX, drawY, 256, 256);
      }
      ctx.restore();

      // Subtle contrast / saturation enhancement for visibility
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, size, size);

      // Draw red pin at center
      drawMapPin(ctx, cx, cy);
    }
  } catch (e) {
    // Graceful offline fallback
    drawVectorRadarMap(ctx, size, lat, lon);
  }

  mapSnippetCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Draw professional vector topographic radar map when offline or tiles fail
 */
function drawVectorRadarMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  lat: number,
  lon: number
) {
  const cx = size / 2;
  const cy = size / 2;

  // Dark topographic styling
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Radar grid rings
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  for (let r = 25; r < size; r += 28) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cross grid lines
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(size, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, size);
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  // Diagonal reference lines
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
  ctx.stroke();

  // Topographic elevation contour curves
  ctx.beginPath();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1;
  ctx.ellipse(cx - 20, cy + 15, 45, 25, Math.PI / 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#06b6d4';
  ctx.ellipse(cx + 10, cy - 10, 60, 35, -Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();

  // Water body shape simulation
  ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
  ctx.beginPath();
  ctx.arc(cx + 30, cy + 40, 45, 0, Math.PI * 2);
  ctx.fill();

  // "OFFLINE MAP" label
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('OFFLINE GPS RADAR', 8, 16);

  // Draw red pin at center
  drawMapPin(ctx, cx, cy);
}

/**
 * Draw a crisp high-visibility GPS Location Pin at (cx, cy)
 */
function drawMapPin(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // Radar ripple shadow under pin
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 7, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Pin body
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444'; // Bright Red
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Pin pointer point
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 8);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + 6, cy - 8);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Center white dot
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

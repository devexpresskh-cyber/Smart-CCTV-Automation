export type GridLayoutPreset =
  | 'auto'
  | 'smartpss-live-6x6'
  | 'smartpss-playback-4x4'
  | 'grid-8x4'
  | 'grid-6x6'
  | 'grid-5x5'
  | 'grid-6x4'
  | 'grid-4x4'
  | 'grid-3x3'
  | 'grid-4x2'
  | 'grid-2x2';

export type DetectionSensitivity = 'normal' | 'strict' | 'high';

export interface DetectedCameraCell {
  channelNumber: number;
  row: number;
  col: number;
  /** Normalized 0..1 bounding box relative to the full image */
  box: { x: number; y: number; w: number; h: number };
  status: 'ok' | 'issue';
  reason: 'active_video' | 'black_screen' | 'no_signal_flat';
  confidence: number;
  metrics: {
    meanLum: number;
    darkRatio: number;
    edgeDensity: number;
    stdDev: number;
  };
}

export interface AutoDetectResult {
  cols: number;
  rows: number;
  detectedGridSlots: number;
  scannedChannels: number;
  /** Normalized 0..1 video grid bounding box */
  gridBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  layoutType: 'smartpss-live' | 'smartpss-playback' | 'fullscreen-grid' | 'custom';
  cells: DetectedCameraCell[];
  okCount: number;
  issueCount: number;
  issueChannels: number[];
}

export interface AutoDetectOptions {
  channelCount: number;
  gridPreset?: GridLayoutPreset;
  sensitivity?: DetectionSensitivity;
}

const getLum = (data: Uint8ClampedArray, idx: number): number =>
  data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

/**
 * Compute per-column and per-row texture/color metrics to locate dark flat UI sidebars,
 * top toolbars, and bottom playback timelines automatically.
 */
function detectVideoGridBounds(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  preset: GridLayoutPreset
): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  layoutType: AutoDetectResult['layoutType'];
} {
  // Explicit SmartPSS presets with known proportions
  if (preset === 'smartpss-playback-4x4') {
    return {
      left: 0.275,
      top: 0.06,
      right: 0.992,
      bottom: 0.855,
      layoutType: 'smartpss-playback',
    };
  }

  // Helper to measure horizontal & vertical edge texture in a strip
  const colActivity = new Float32Array(w);
  const colMeanLum = new Float32Array(w);
  const colDarkFlat = new Float32Array(w);

  const yStartBand = Math.floor(h * 0.1);
  const yEndBand = Math.floor(h * 0.82);
  const bandHeight = Math.max(1, yEndBand - yStartBand);

  for (let x = 1; x < w - 1; x++) {
    let lumSum = 0;
    let edgeSum = 0;
    let flatDarkCount = 0;

    for (let y = yStartBand; y < yEndBand; y++) {
      const i = (y * w + x) * 4;
      const lum = getLum(data, i);
      const lumUp = getLum(data, ((y - 1) * w + x) * 4);
      const lumLeft = getLum(data, (y * w + (x - 1)) * 4);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      lumSum += lum;
      const grad = Math.abs(lum - lumUp) + Math.abs(lum - lumLeft);
      if (grad > 14) edgeSum++;

      // Typical dark UI gray/charcoal (#14..#3a) with neutral chroma
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum >= 12 && lum <= 62 && chroma < 14 && grad < 10) {
        flatDarkCount++;
      }
    }

    colMeanLum[x] = lumSum / bandHeight;
    colActivity[x] = edgeSum / bandHeight;
    colDarkFlat[x] = flatDarkCount / bandHeight;
  }

  // Detect Left Sidebar Boundary (between 0.08*w and 0.36*w)
  let detectedLeft = 0.0;
  let bestLeftScore = 0;

  // Check if left 8% looks like a flat dark sidebar (not raw fullscreen video)
  let leftUiFlatness = 0;
  const checkCols = Math.max(4, Math.floor(w * 0.08));
  for (let x = 2; x < checkCols; x++) {
    leftUiFlatness += colDarkFlat[x];
  }
  leftUiFlatness /= Math.max(1, checkCols - 2);

  if (leftUiFlatness > 0.42) {
    // Scan potential divider columns x from 0.09*w to 0.35*w
    const minX = Math.floor(w * 0.09);
    const maxX = Math.floor(w * 0.35);

    for (let x = minX; x < maxX; x++) {
      // Average UI flatness immediately to the left [x-18 .. x-3]
      let leftFlat = 0;
      const ls = Math.max(2, x - 18);
      for (let k = ls; k < x - 2; k++) leftFlat += colDarkFlat[k];
      leftFlat /= Math.max(1, x - 2 - ls);

      // Average video activity or brightness shift to the right [x+3 .. x+28]
      let rightActivity = 0;
      let rightLumDiff = 0;
      const re = Math.min(w - 2, x + 28);
      let leftAvgLum = 0;
      for (let k = ls; k < x - 2; k++) leftAvgLum += colMeanLum[k];
      leftAvgLum /= Math.max(1, x - 2 - ls);

      for (let k = x + 3; k < re; k++) {
        rightActivity += colActivity[k];
        rightLumDiff += Math.abs(colMeanLum[k] - leftAvgLum);
      }
      const rSpan = Math.max(1, re - (x + 3));
      rightActivity /= rSpan;
      rightLumDiff /= rSpan;

      // Also check if x itself is a crisp vertical divider line (low variance, distinct from neighbors)
      const isVerticalEdge = Math.abs(colMeanLum[x + 2] - colMeanLum[x - 2]) > 8 || colActivity[x] < 0.05;

      const score =
        leftFlat * 1.5 +
        Math.min(1.5, rightActivity * 4) +
        Math.min(1.2, rightLumDiff / 25) +
        (isVerticalEdge ? 0.3 : 0);

      if (leftFlat > 0.45 && (rightActivity > 0.06 || rightLumDiff > 18) && score > bestLeftScore) {
        bestLeftScore = score;
        detectedLeft = x / w;
      }
    }

    // Snap reasonable fallback if left is flat UI but divider edge was subtle
    if (detectedLeft === 0) {
      detectedLeft = 0.115;
    }
  }

  // Row stats in the video horizontal span [left..0.97]
  const vx0 = Math.floor(detectedLeft * w + 4);
  const vx1 = Math.floor(w * 0.97);
  const vw = Math.max(1, vx1 - vx0);

  const rowActivity = new Float32Array(h);
  const rowDarkFlat = new Float32Array(h);
  const rowMeanLum = new Float32Array(h);

  for (let y = 1; y < h - 1; y++) {
    let lumSum = 0;
    let edgeSum = 0;
    let flatDark = 0;

    for (let x = vx0; x < vx1; x++) {
      const i = (y * w + x) * 4;
      const lum = getLum(data, i);
      const lumL = getLum(data, (y * w + (x - 1)) * 4);
      const lumU = getLum(data, ((y - 1) * w + x) * 4);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      lumSum += lum;
      const grad = Math.abs(lum - lumL) + Math.abs(lum - lumU);
      if (grad > 14) edgeSum++;

      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum >= 10 && lum <= 62 && chroma < 14 && grad < 10) {
        flatDark++;
      }
    }

    rowMeanLum[y] = lumSum / vw;
    rowActivity[y] = edgeSum / vw;
    rowDarkFlat[y] = flatDark / vw;
  }

  // Detect Top Header Bar (scan y from 0 to 0.14*h)
  let detectedTop = 0.0;
  let topFlatness = 0;
  const topSampleEnd = Math.floor(h * 0.045);
  for (let y = 1; y < topSampleEnd; y++) topFlatness += rowDarkFlat[y];
  topFlatness /= Math.max(1, topSampleEnd - 1);

  if (topFlatness > 0.45) {
    detectedTop = 0.055;
    const maxTop = Math.floor(h * 0.14);
    for (let y = Math.floor(h * 0.03); y < maxTop; y++) {
      // Transition from flat dark header to textured/bright video row
      const belowAct = (rowActivity[y + 3] + rowActivity[y + 6] + rowActivity[y + 9]) / 3;
      const aboveFlat = (rowDarkFlat[y - 2] + rowDarkFlat[y - 4]) / 2;
      if (aboveFlat > 0.5 && (belowAct > 0.06 || Math.abs(rowMeanLum[y + 5] - rowMeanLum[y - 3]) > 18)) {
        detectedTop = y / h;
        break;
      }
    }
  }

  // Detect Bottom Timeline / Status Bar (scan upward from h-2 to 0.72*h)
  let detectedBottom = 1.0;
  let bottomFlatness = 0;
  for (let y = Math.floor(h * 0.93); y < h - 1; y++) {
    bottomFlatness += rowDarkFlat[y];
  }
  bottomFlatness /= Math.max(1, h - 1 - Math.floor(h * 0.93));

  // Check for SmartPSS Playback green recorded timeline strip in bottom [0.86..0.98]
  let greenBarY = -1;
  for (let y = Math.floor(h * 0.86); y < Math.floor(h * 0.98); y++) {
    let greenPixels = 0;
    for (let x = vx0; x < vx1; x += 2) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g > 110 && g > r + 35 && g > b + 35) {
        greenPixels++;
      }
    }
    if (greenPixels / Math.max(1, vw / 2) > 0.08) {
      greenBarY = y;
      break;
    }
  }

  if (greenBarY > 0) {
    // SmartPSS Playback controls & time ruler sit ~12..55px above the green timeline bar
    const searchStart = Math.max(Math.floor(h * 0.75), greenBarY - Math.round(h * 0.095));
    const searchEnd = Math.max(searchStart + 4, greenBarY - Math.round(h * 0.02));
    let bestBotY = Math.max(Math.floor(h * 0.76), greenBarY - Math.round(h * 0.055));
    let bestTransition = -1;

    for (let y = searchEnd; y >= searchStart; y--) {
      const aboveAct = (rowActivity[Math.max(1, y - 4)] + rowActivity[Math.max(1, y - 8)]) / 2;
      const belowAct = (rowActivity[y + 2] + rowActivity[Math.min(h - 2, y + 5)]) / 2;
      const belowFlat = (rowDarkFlat[y + 2] + rowDarkFlat[Math.min(h - 2, y + 5)]) / 2;
      // Top edge of playback bar has dark flat strip or sharp drop from camera grid into control panel
      const score = belowFlat * 1.4 + Math.max(0, aboveAct - belowAct * 0.5) * 3;
      if (score > bestTransition && (belowFlat > 0.35 || aboveAct > 0.04)) {
        bestTransition = score;
        bestBotY = y;
      }
    }
    detectedBottom = bestBotY / h;
  } else if (bottomFlatness > 0.42 || detectedLeft > 0.2) {
    // Generic dark bottom status / timeline panel scan
    const minBot = Math.floor(h * 0.73);
    for (let y = Math.floor(h * 0.96); y >= minBot; y--) {
      const belowFlat = (rowDarkFlat[y + 2] + rowDarkFlat[Math.min(h - 2, y + 6)]) / 2;
      const aboveAct = (rowActivity[y - 4] + rowActivity[y - 8] + rowActivity[y - 12]) / 3;
      if (belowFlat > 0.45 && aboveAct > 0.06) {
        detectedBottom = y / h;
        break;
      }
    }
    if (detectedBottom === 1.0 && bottomFlatness > 0.5) {
      detectedBottom = 0.965;
    }
  }

  // Detect Right Margin (usually small scrollbar or panel border 0.97..1.0)
  let detectedRight = 0.995;
  if (colDarkFlat[w - 4] > 0.7 && colDarkFlat[w - 8] > 0.7) {
    detectedRight = 0.985;
  }

  // Classify layout type
  let layoutType: AutoDetectResult['layoutType'] = 'fullscreen-grid';
  if (detectedLeft > 0.21 || detectedBottom < 0.9) {
    layoutType = 'smartpss-playback';
  } else if (detectedLeft > 0.07) {
    layoutType = 'smartpss-live';
  }

  if (preset === 'smartpss-live-6x6' && detectedLeft < 0.08) {
    detectedLeft = 0.145;
    detectedTop = Math.max(detectedTop, 0.058);
    layoutType = 'smartpss-live';
  }

  return {
    left: Math.max(0, Math.min(0.45, detectedLeft)),
    top: Math.max(0, Math.min(0.25, detectedTop)),
    right: Math.min(1, Math.max(0.6, detectedRight)),
    bottom: Math.min(1, Math.max(0.6, detectedBottom)),
    layoutType,
  };
}

/**
 * Score how cleanly a candidate (cols x rows) grid aligns with actual camera tile
 * separator lines and visual boundaries inside [gx0..gx1, gy0..gy1].
 */
function scoreCandidateGrid(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bounds: { left: number; top: number; right: number; bottom: number },
  cols: number,
  rows: number
): number {
  const gx0 = bounds.left * w;
  const gy0 = bounds.top * h;
  const gw = (bounds.right - bounds.left) * w;
  const gh = (bounds.bottom - bounds.top) * h;

  if (gw < 40 || gh < 40) return 0;

  let vScoreSum = 0;
  const cellW = gw / cols;
  const cellH = gh / rows;

  // Evaluate interior vertical boundaries
  for (let c = 1; c < cols; c++) {
    const cx = Math.round(gx0 + c * cellW);
    let bestLineScore = 0;

    // Allow +/- 3px tolerance around expected grid divider
    for (let dx = -3; dx <= 3; dx++) {
      const x = cx + dx;
      if (x < 4 || x >= w - 4) continue;

      let lineUniformity = 0;
      let crossContrast = 0;
      const samples = 40;
      const yStep = Math.max(1, Math.floor(gh / samples));
      let count = 0;

      for (let y = Math.floor(gy0 + 4); y < Math.floor(gy0 + gh - 4); y += yStep) {
        const lumLine = getLum(data, (y * w + x) * 4);
        const lumLeft = getLum(data, (y * w + (x - 4)) * 4);
        const lumRight = getLum(data, (y * w + (x + 4)) * 4);

        // Dark or crisp line between cells
        if (lumLine < 65 && lumLine <= Math.min(lumLeft, lumRight) + 5) {
          lineUniformity++;
        }
        // Adjacent cells typically have distinct brightness levels
        if (Math.abs(lumLeft - lumRight) > 10) {
          crossContrast++;
        }
        count++;
      }

      if (count > 0) {
        const s = (lineUniformity / count) * 1.4 + (crossContrast / count) * 1.0;
        if (s > bestLineScore) bestLineScore = s;
      }
    }
    vScoreSum += bestLineScore;
  }

  // Evaluate interior horizontal boundaries
  let hScoreSum = 0;
  for (let r = 1; r < rows; r++) {
    const cy = Math.round(gy0 + r * cellH);
    let bestLineScore = 0;

    for (let dy = -3; dy <= 3; dy++) {
      const y = cy + dy;
      if (y < 4 || y >= h - 4) continue;

      let lineUniformity = 0;
      let crossContrast = 0;
      const samples = 40;
      const xStep = Math.max(1, Math.floor(gw / samples));
      let count = 0;

      for (let x = Math.floor(gx0 + 4); x < Math.floor(gx0 + gw - 4); x += xStep) {
        const lumLine = getLum(data, (y * w + x) * 4);
        const lumTop = getLum(data, ((y - 4) * w + x) * 4);
        const lumBot = getLum(data, ((y + 4) * w + x) * 4);

        if (lumLine < 65 && lumLine <= Math.min(lumTop, lumBot) + 5) {
          lineUniformity++;
        }
        if (Math.abs(lumTop - lumBot) > 10) {
          crossContrast++;
        }
        count++;
      }

      if (count > 0) {
        const s = (lineUniformity / count) * 1.4 + (crossContrast / count) * 1.0;
        if (s > bestLineScore) bestLineScore = s;
      }
    }
    hScoreSum += bestLineScore;
  }

  const avgV = cols > 1 ? vScoreSum / (cols - 1) : 1.0;
  const avgH = rows > 1 ? hScoreSum / (rows - 1) : 1.0;

  // Aspect ratio bonus: camera cells are normally ~16:9 or ~4:3 (ratio 1.15 .. 2.1)
  const cellAspect = cellW / Math.max(1, cellH);
  const aspectBonus = cellAspect >= 1.15 && cellAspect <= 2.15 ? 0.35 : -0.2;

  return (avgV + avgH) / 2 + aspectBonus;
}

function getPresetDimensions(preset: GridLayoutPreset): { cols: number; rows: number } | null {
  switch (preset) {
    case 'smartpss-live-6x6':
    case 'grid-6x6':
      return { cols: 6, rows: 6 };
    case 'smartpss-playback-4x4':
    case 'grid-4x4':
      return { cols: 4, rows: 4 };
    case 'grid-8x4':
      return { cols: 8, rows: 4 };
    case 'grid-6x4':
      return { cols: 6, rows: 4 };
    case 'grid-5x5':
      return { cols: 5, rows: 5 };
    case 'grid-3x3':
      return { cols: 3, rows: 3 };
    case 'grid-4x2':
      return { cols: 4, rows: 2 };
    case 'grid-2x2':
      return { cols: 2, rows: 2 };
    default:
      return null;
  }
}

function getDefaultDimsForCount(chCount: number): { cols: number; rows: number } {
  if (chCount <= 4) return { cols: 2, rows: 2 };
  if (chCount <= 8) return { cols: 4, rows: 2 };
  if (chCount <= 9) return { cols: 3, rows: 3 };
  if (chCount <= 16) return { cols: 4, rows: 4 };
  if (chCount <= 25) return { cols: 5, rows: 5 };
  if (chCount <= 32) return { cols: 6, rows: 6 };
  const c = Math.ceil(Math.sqrt(chCount));
  return { cols: c, rows: Math.ceil(chCount / c) };
}

/**
 * Automatically detect SmartPSS / DVR video grid bounds, tile layout (4x4, 6x6, 8x4, etc.),
 * and classify every camera channel as active vs black-screen / no-signal.
 */
export function autoDetectCamerasFromImage(
  imgElement: HTMLImageElement,
  options: AutoDetectOptions
): AutoDetectResult {
  const { channelCount, gridPreset = 'auto', sensitivity = 'normal' } = options;

  const srcW = imgElement.naturalWidth || imgElement.width || 960;
  const srcH = imgElement.naturalHeight || imgElement.height || 540;

  // Normalize to max 960px wide for fast, consistent edge thresholds
  const scale = Math.min(1, 960 / srcW);
  const w = Math.max(160, Math.round(srcW * scale));
  const h = Math.max(90, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const fallbackDims = getPresetDimensions(gridPreset) || getDefaultDimsForCount(channelCount);

  if (!ctx) {
    return {
      cols: fallbackDims.cols,
      rows: fallbackDims.rows,
      detectedGridSlots: fallbackDims.cols * fallbackDims.rows,
      scannedChannels: 0,
      gridBounds: { left: 0.14, top: 0.06, right: 0.99, bottom: 0.97 },
      layoutType: 'smartpss-live',
      cells: [],
      okCount: 0,
      issueCount: 0,
      issueChannels: [],
    };
  }

  ctx.drawImage(imgElement, 0, 0, w, h);
  const fullData = ctx.getImageData(0, 0, w, h).data;

  // 1. Auto-detect video grid area
  const bounds = detectVideoGridBounds(fullData, w, h, gridPreset);

  // 2. Choose grid (cols x rows)
  let chosenCols = fallbackDims.cols;
  let chosenRows = fallbackDims.rows;

  const explicitDims = getPresetDimensions(gridPreset);
  if (explicitDims) {
    chosenCols = explicitDims.cols;
    chosenRows = explicitDims.rows;
  } else {
    // Score relevant candidate grids for the DVR channel count
    const candidates: Array<{ cols: number; rows: number }> = [];
    if (channelCount <= 4) {
      candidates.push({ cols: 2, rows: 2 });
    } else if (channelCount <= 8) {
      candidates.push({ cols: 4, rows: 2 }, { cols: 3, rows: 3 });
    } else if (channelCount <= 16) {
      candidates.push({ cols: 4, rows: 4 }, { cols: 4, rows: 2 }, { cols: 3, rows: 3 });
    } else if (channelCount <= 25) {
      candidates.push({ cols: 5, rows: 5 }, { cols: 6, rows: 4 }, { cols: 4, rows: 4 });
    } else {
      // 32CH+: SmartPSS uses 6x6 for 32CH live view, 8x4 in compact views, or 4x4 in Playback!
      candidates.push({ cols: 6, rows: 6 }, { cols: 8, rows: 4 }, { cols: 4, rows: 4 });
    }

    let bestScore = -999;
    for (const cand of candidates) {
      let score = scoreCandidateGrid(fullData, w, h, bounds, cand.cols, cand.rows);
      // Slight bias toward matching DVR's full channel capacity (avoid shrinking to 4x4 unless clearly 4x4)
      if (cand.cols * cand.rows >= channelCount) {
        score += 0.12;
      }
      // If Playback UI detected (wide left tree + bottom timeline), 4x4 is very common
      if (bounds.layoutType === 'smartpss-playback' && cand.cols === 4 && cand.rows === 4) {
        score += 0.22;
      }

      if (score > bestScore) {
        bestScore = score;
        chosenCols = cand.cols;
        chosenRows = cand.rows;
      }
    }
  }

  // 3. Scan every cell inside the detected grid bounds
  const gridSlots = chosenCols * chosenRows;
  const scannedChannels = Math.min(channelCount, gridSlots);

  const cellNormW = (bounds.right - bounds.left) / chosenCols;
  const cellNormH = (bounds.bottom - bounds.top) / chosenRows;

  const cells: DetectedCameraCell[] = [];
  const issueChannels: number[] = [];

  for (let idx = 0; idx < scannedChannels; idx++) {
    const row = Math.floor(idx / chosenCols);
    const col = idx % chosenCols;

    const normX = bounds.left + col * cellNormW;
    const normY = bounds.top + row * cellNormH;

    // Sample the inner 70% area (ignore 15% border/OSD timestamps/corner channel labels)
    const sx = Math.max(0, Math.floor((normX + cellNormW * 0.15) * w));
    const sy = Math.max(0, Math.floor((normY + cellNormH * 0.16) * h));
    const sw = Math.max(8, Math.floor(cellNormW * 0.7 * w));
    const sh = Math.max(8, Math.floor(cellNormH * 0.68 * h));

    const maxX = Math.min(w - 1, sx + sw);
    const maxY = Math.min(h - 1, sy + sh);

    let lumSum = 0;
    let lumSqSum = 0;
    let darkCount = 0;
    let veryDarkCount = 0;
    let flatDarkUiCount = 0;
    let edgeCount = 0;
    let pixelCount = 0;

    for (let y = sy; y < maxY; y++) {
      for (let x = sx; x < maxX; x++) {
        const i = (y * w + x) * 4;
        const lum = getLum(fullData, i);
        const lumRight = getLum(fullData, (y * w + Math.min(w - 1, x + 1)) * 4);
        const lumDown = getLum(fullData, (Math.min(h - 1, y + 1) * w + x) * 4);

        const r = fullData[i];
        const g = fullData[i + 1];
        const b = fullData[i + 2];
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        lumSum += lum;
        lumSqSum += lum * lum;
        if (lum < 32) darkCount++;
        if (lum < 18) veryDarkCount++;

        const grad = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
        if (grad > 14) edgeCount++;

        // Empty SmartPSS slot or dead feed dark background (#00..#30 neutral flat)
        if (lum < 48 && chroma < 12 && grad < 8) {
          flatDarkUiCount++;
        }

        pixelCount++;
      }
    }

    const n = Math.max(1, pixelCount);
    const meanLum = lumSum / n;
    const variance = Math.max(0, lumSqSum / n - meanLum * meanLum);
    const stdDev = Math.sqrt(variance);
    const darkRatio = darkCount / n;
    const veryDarkRatio = veryDarkCount / n;
    const flatRatio = flatDarkUiCount / n;
    const edgeDensity = edgeCount / n;

    let isIssue = false;
    let reason: DetectedCameraCell['reason'] = 'active_video';

    if (sensitivity === 'strict') {
      if (
        (darkRatio > 0.74 && edgeDensity < 0.065) ||
        (flatRatio > 0.8 && edgeDensity < 0.05) ||
        (meanLum < 45 && edgeDensity < 0.045 && stdDev < 16)
      ) {
        isIssue = true;
        reason = veryDarkRatio > 0.65 ? 'black_screen' : 'no_signal_flat';
      }
    } else if (sensitivity === 'high') {
      if (
        (veryDarkRatio > 0.9 && edgeDensity < 0.04) ||
        (flatRatio > 0.92 && edgeDensity < 0.03) ||
        (meanLum < 22 && edgeDensity < 0.03 && stdDev < 10)
      ) {
        isIssue = true;
        reason = 'black_screen';
      }
    } else {
      // Balanced default ('normal') tuned for real SmartPSS Live & Night Playback
      if (
        (darkRatio > 0.84 && edgeDensity < 0.055) ||
        (veryDarkRatio > 0.88 && edgeDensity < 0.085) ||
        (flatRatio > 0.86 && edgeDensity < 0.045) ||
        (meanLum < 38 && edgeDensity < 0.035 && stdDev < 14)
      ) {
        isIssue = true;
        reason = veryDarkRatio > 0.7 ? 'black_screen' : 'no_signal_flat';
      }
    }

    // Confidence score (0..100)
    const confidence = isIssue
      ? Math.min(99, Math.round(70 + flatRatio * 20 + Math.max(0, 0.06 - edgeDensity) * 150))
      : Math.min(99, Math.round(68 + Math.min(0.25, edgeDensity) * 100 + Math.min(30, stdDev) * 0.4));

    if (isIssue) {
      issueChannels.push(idx + 1);
    }

    cells.push({
      channelNumber: idx + 1,
      row,
      col,
      box: { x: normX, y: normY, w: cellNormW, h: cellNormH },
      status: isIssue ? 'issue' : 'ok',
      reason,
      confidence,
      metrics: {
        meanLum: Math.round(meanLum * 10) / 10,
        darkRatio: Math.round(darkRatio * 1000) / 1000,
        edgeDensity: Math.round(edgeDensity * 1000) / 1000,
        stdDev: Math.round(stdDev * 10) / 10,
      },
    });
  }

  return {
    cols: chosenCols,
    rows: chosenRows,
    detectedGridSlots: gridSlots,
    scannedChannels,
    gridBounds: {
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
    },
    layoutType: bounds.layoutType,
    cells,
    okCount: scannedChannels - issueChannels.length,
    issueCount: issueChannels.length,
    issueChannels,
  };
}

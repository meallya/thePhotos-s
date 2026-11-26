import { normalizeCssColor } from "./paperColor.js";

export const frames = [
  { id: "cream", name: "Sunday paper", bg: "#f3eadb", ink: "#5b4036", accent: "#a44c4d" },
  { id: "rose", name: "Rosy hours", bg: "#e9c9c7", ink: "#603b40", accent: "#a65c64" },
  { id: "noir", name: "After hours", bg: "#292323", ink: "#f4e8d8", accent: "#c68b79" },
  { id: "red", name: "Cherry club", bg: "#791f2b", ink: "#f7e9d8", accent: "#e4b7a8" },
  { id: "blue", name: "Blue hour", bg: "#d9e0df", ink: "#394d50", accent: "#789596" },
  { id: "butter", name: "Butter note", bg: "#eee2b9", ink: "#65513a", accent: "#ad7952" },
];

export const filters = [
  { id: "natural", name: "Original", css: "none" },
  { id: "warm", name: "Warm film", css: "sepia(.22) saturate(1.12) contrast(1.04)" },
  { id: "mono", name: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "soft", name: "Soft glow", css: "brightness(1.08) saturate(.82) sepia(.12)" },
];

export const FRAME_PAPER_COLORS = Object.freeze([
  { id: "palette", name: "Selected paper", color: null, ink: null, accent: null },
  { id: "white", name: "White", color: "#fffdf9", ink: "#4c3932", accent: "#a44c4d" },
  { id: "cream", name: "Cream", color: "#f3eadb", ink: "#5b4036", accent: "#a44c4d" },
  { id: "warm-white", name: "Warm White", color: "#faf6ed", ink: "#5b453d", accent: "#a45b50" },
  { id: "soft-gray", name: "Soft Gray", color: "#e8e6e2", ink: "#4c4945", accent: "#8e5652" },
  { id: "retro-red", name: "Retro Red", color: "#A63D40", ink: "#fff4e7", accent: "#f0c3aa" },
  { id: "darkroom-brown", name: "Darkroom Brown", color: "#49352A", ink: "#f6ead9", accent: "#d4ac8e" },
  { id: "darkroom-black", name: "Darkroom Black", color: "#242424", ink: "#f4e9dc", accent: "#d5a598" },
  { id: "sage-green", name: "Sage Green", color: "#879B82", ink: "#303a30", accent: "#704546" },
  { id: "dusty-blue", name: "Dusty Blue", color: "#718DA5", ink: "#263644", accent: "#713e48" },
  { id: "blush-pink", name: "Blush Pink", color: "#D9A6A6", ink: "#583d40", accent: "#8b3e49" },
  { id: "custom", name: "Custom Color", color: null, ink: null, accent: null },
]);

export const FRAME_BORDER_STYLES = Object.freeze([
  { id: "classic", name: "Classic" },
  { id: "thin", name: "Thin" },
  { id: "double", name: "Double" },
  { id: "none", name: "None" },
]);

export const DEFAULT_FRAME_PAPER = Object.freeze({
  paperColor: "palette",
  texture: 35,
  borderStyle: "classic",
  customColor: "#f3eadb",
});

export const shotCount = 4;
export const PHOTO_COUNTS = Object.freeze([1, 2, 3, 4]);

export function normalizePhotoCount(value) {
  const count = Number(value);
  return PHOTO_COUNTS.includes(count) ? count : shotCount;
}

export const DEFAULT_STRIP_CONFIG = Object.freeze({
  layout: "vertical",
  stripSize: 620,
  photoScale: 100,
  spacing: 12,
  padding: 28,
  captionVisible: true,
  showDate: false,
  cropX: 50,
  cropY: 50,
  exportScale: 1,
  exportQuality: "high",
});

export const DEFAULT_GLOBAL_FILTER = Object.freeze({ filterId: "natural", filterIntensity: 100 });

export const DEFAULT_PHOTO_EDITS = Object.freeze({
  filterId: "natural",
  filterIntensity: 100,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  cropX: 50,
  cropY: 50,
  zoom: 100,
});

const FILTER_IDS = new Set(filters.map((filter) => filter.id));

export function normalizeGlobalFilter(settings = {}) {
  return {
    filterId: FILTER_IDS.has(settings.filterId) ? settings.filterId : DEFAULT_GLOBAL_FILTER.filterId,
    filterIntensity: Math.round(clamp(settings.filterIntensity, 0, 100, DEFAULT_GLOBAL_FILTER.filterIntensity)),
  };
}

const FRAME_PAPER_COLOR_IDS = new Set(FRAME_PAPER_COLORS.map((option) => option.id));
const FRAME_BORDER_STYLE_IDS = new Set(FRAME_BORDER_STYLES.map((option) => option.id));

export function normalizeFramePaper(settings = {}) {
  return {
    paperColor: FRAME_PAPER_COLOR_IDS.has(settings.paperColor) ? settings.paperColor : DEFAULT_FRAME_PAPER.paperColor,
    texture: Math.round(clamp(settings.texture, 0, 100, DEFAULT_FRAME_PAPER.texture)),
    borderStyle: FRAME_BORDER_STYLE_IDS.has(settings.borderStyle) ? settings.borderStyle : DEFAULT_FRAME_PAPER.borderStyle,
    customColor: normalizeCssColor(settings.customColor) ?? DEFAULT_FRAME_PAPER.customColor,
  };
}

export function getFramePaperColor(frame, settings = DEFAULT_FRAME_PAPER) {
  const paper = normalizeFramePaper(settings);
  if (paper.paperColor === "palette") return normalizeCssColor(frame.bg) ?? DEFAULT_FRAME_PAPER.customColor;
  if (paper.paperColor === "custom") return paper.customColor;
  const option = FRAME_PAPER_COLORS.find((item) => item.id === paper.paperColor);
  return normalizeCssColor(option?.color) ?? DEFAULT_FRAME_PAPER.customColor;
}

function customPaperInk(color) {
  const red = parseInt(color.slice(1, 3), 16) / 255;
  const green = parseInt(color.slice(3, 5), 16) / 255;
  const blue = parseInt(color.slice(5, 7), 16) / 255;
  const linear = (channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return luminance < 0.38
    ? { ink: "#f5e9d9", accent: "#e7b9a7" }
    : { ink: "#503b34", accent: "#873b43" };
}

export function resolveFramePaper(frame, settings = DEFAULT_FRAME_PAPER) {
  const paper = normalizeFramePaper(settings);
  if (paper.paperColor === "palette") return { ...frame, bg: getFramePaperColor(frame, paper) };
  if (paper.paperColor === "custom") {
    return { ...frame, bg: paper.customColor, ...customPaperInk(paper.customColor) };
  }
  const color = FRAME_PAPER_COLORS.find((option) => option.id === paper.paperColor);
  return color ? { ...frame, bg: getFramePaperColor(frame, paper), ink: color.ink, accent: color.accent } : { ...frame };
}
const PRESET_EFFECTS = {
  natural: () => [],
  warm: (amount) => [
    "sepia(" + (0.22 * amount).toFixed(3) + ")",
    "saturate(" + (1 + 0.12 * amount).toFixed(3) + ")",
    "contrast(" + (1 + 0.04 * amount).toFixed(3) + ")",
  ],
  mono: (amount) => [
    "grayscale(" + amount.toFixed(3) + ")",
    "contrast(" + (1 + 0.08 * amount).toFixed(3) + ")",
  ],
  soft: (amount) => [
    "brightness(" + (1 + 0.08 * amount).toFixed(3) + ")",
    "saturate(" + (1 - 0.18 * amount).toFixed(3) + ")",
    "sepia(" + (0.12 * amount).toFixed(3) + ")",
  ],
};

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum, fallback = minimum) {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)));
}

export function normalizePhotoEdits(edits = {}) {
  const filterId = FILTER_IDS.has(edits.filterId) ? edits.filterId : DEFAULT_PHOTO_EDITS.filterId;
  return {
    filterId,
    filterIntensity: Math.round(clamp(edits.filterIntensity, 0, 100, DEFAULT_PHOTO_EDITS.filterIntensity)),
    brightness: Math.round(clamp(edits.brightness, 50, 150, DEFAULT_PHOTO_EDITS.brightness)),
    contrast: Math.round(clamp(edits.contrast, 50, 150, DEFAULT_PHOTO_EDITS.contrast)),
    saturation: Math.round(clamp(edits.saturation, 0, 200, DEFAULT_PHOTO_EDITS.saturation)),
    warmth: Math.round(clamp(edits.warmth, -100, 100, DEFAULT_PHOTO_EDITS.warmth)),
    cropX: Math.round(clamp(edits.cropX, 0, 100, DEFAULT_PHOTO_EDITS.cropX)),
    cropY: Math.round(clamp(edits.cropY, 0, 100, DEFAULT_PHOTO_EDITS.cropY)),
    zoom: Math.round(clamp(edits.zoom, 100, 200, DEFAULT_PHOTO_EDITS.zoom)),
  };
}

export function createPhotoModel(original, id, filterId = "natural") {
  return {
    id: String(id),
    original,
    edits: normalizePhotoEdits({ filterId }),
  };
}

export function normalizePhoto(photo, index = 0) {
  if (typeof photo === "string") {
    return createPhotoModel(photo, "photo-" + (index + 1));
  }
  if (!photo || typeof photo !== "object") {
    return createPhotoModel("", "photo-" + (index + 1));
  }
  return {
    id: String(photo.id ?? "photo-" + (index + 1)),
    original: typeof photo.original === "string" ? photo.original : "",
    edits: normalizePhotoEdits(photo.edits),
  };
}

export function normalizePhotos(photos = []) {
  return Array.isArray(photos)
    ? photos.slice(0, shotCount).map((photo, index) => normalizePhoto(photo, index))
    : [];
}

export function updatePhotoEdits(photos, photoId, patch) {
  return photos.map((photo, index) => {
    const normalized = normalizePhoto(photo, index);
    return normalized.id === photoId
      ? { ...normalized, edits: normalizePhotoEdits({ ...normalized.edits, ...patch }) }
      : normalized;
  });
}

export function resetPhotoEdits(photo) {
  const normalized = normalizePhoto(photo);
  return { ...normalized, edits: { ...DEFAULT_PHOTO_EDITS } };
}

export function getPhotoFilterCss(edits = {}) {
  const normalized = normalizePhotoEdits(edits);
  const intensity = normalized.filterIntensity / 100;
  const parts = PRESET_EFFECTS[normalized.filterId](intensity);
  if (normalized.brightness !== 100) parts.push("brightness(" + (normalized.brightness / 100).toFixed(3) + ")");
  if (normalized.contrast !== 100) parts.push("contrast(" + (normalized.contrast / 100).toFixed(3) + ")");
  if (normalized.saturation !== 100) parts.push("saturate(" + (normalized.saturation / 100).toFixed(3) + ")");
  if (normalized.warmth > 0) parts.push("sepia(" + (0.35 * normalized.warmth / 100).toFixed(3) + ")");
  if (normalized.warmth < 0) parts.push("hue-rotate(" + (-0.16 * normalized.warmth).toFixed(1) + "deg)");
  return parts.length ? parts.join(" ") : "none";
}

export function supportsCanvasFilters() {
  if (typeof document === "undefined") return false;
  try {
    const context = document.createElement("canvas").getContext("2d");
    return Boolean(context && "filter" in context);
  } catch {
    return false;
  }
}

export function spotifyEmbedUrl(value) {
  const input = value.trim();
  const uriMatch = input.match(/^spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return "https://open.spotify.com/embed/" + uriMatch[1] + "/" + uriMatch[2] + "?utm_source=generator&theme=0";
  }
  try {
    const url = new URL(input);
    if (!["open.spotify.com", "www.open.spotify.com"].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
    return match
      ? "https://open.spotify.com/embed/" + match[1] + "/" + match[2] + "?utm_source=generator&theme=0"
      : null;
  } catch {
    return null;
  }
}

export function parseSpotifyPlaylistId(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!["open.spotify.com", "www.open.spotify.com"].includes(url.hostname)) return null;
    const match = url.pathname.match(/(?:^|\/)playlist\/([a-zA-Z0-9]+)\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function captureSnapshot(video) {
  if (!video?.videoWidth || !video?.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas for this photo.");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function capturePhoto(video, id, filterId = "natural") {
  const original = captureSnapshot(video);
  return original ? createPhotoModel(original, id, filterId) : null;
}

export function calculateCoverCrop(imageWidth, imageHeight, targetWidth, targetHeight, cropX = 50, cropY = 50, zoom = 100) {
  const zoomScale = clamp(zoom, 100, 200, 100) / 100;
  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight) * zoomScale;
  const sourceWidth = targetWidth / scale;
  const sourceHeight = targetHeight / scale;
  const availableX = imageWidth - sourceWidth;
  const availableY = imageHeight - sourceHeight;
  return {
    sx: availableX * clamp(cropX, 0, 100, 50) / 100,
    sy: availableY * clamp(cropY, 0, 100, 50) / 100,
    sWidth: sourceWidth,
    sHeight: sourceHeight,
  };
}

export function calculateStripLayout({
  layout = DEFAULT_STRIP_CONFIG.layout,
  stripSize = DEFAULT_STRIP_CONFIG.stripSize,
  photoScale = DEFAULT_STRIP_CONFIG.photoScale,
  spacing = DEFAULT_STRIP_CONFIG.spacing,
  padding = DEFAULT_STRIP_CONFIG.padding,
  photoWidth,
  photoHeight,
  showDate = DEFAULT_STRIP_CONFIG.showDate,
  photoCount = shotCount,
  captionLineCount = 1,
} = {}) {
  const orientation = layout === "horizontal" ? "horizontal" : "vertical";
  const shortEdge = Math.round(clamp(stripSize, 480, 760, 620));
  const sizeScale = shortEdge / 620;
  const pad = Math.round(clamp(padding, 12, 64, 28) * sizeScale);
  const gap = Math.round(clamp(spacing, 0, 36, 12) * sizeScale);
  const imageScale = clamp(photoScale, 70, 100, 100) / 100;
  const count = normalizePhotoCount(photoCount);
  const lineCount = Math.round(clamp(captionLineCount, 1, 6, 1));
  const defaultFrameWidth = orientation === "vertical" ? 564 : 390;
  const defaultFrameHeight = orientation === "vertical" ? 390 : 270;
  const requestedFrameWidth = clamp(photoWidth, 240, 700, defaultFrameWidth);
  const requestedFrameHeight = clamp(photoHeight, 160, 520, defaultFrameHeight);
  const frameWidth = Math.min(Math.round(requestedFrameWidth * sizeScale), Math.max(1, shortEdge - 2 * pad));
  const frameHeight = Math.min(Math.round(requestedFrameHeight * sizeScale), Math.max(1, shortEdge - 2 * pad));
  const photoSlots = [];
  let width;
  let height;
  let brandX;
  let brandY;
  let captionY;
  let dateY;
  if (orientation === "vertical") {
    width = shortEdge;
    for (let index = 0; index < count; index += 1) {
      photoSlots.push({ x: pad, y: pad + index * (frameHeight + gap), width: frameWidth, height: frameHeight });
    }
    const photosBottom = pad + count * frameHeight + (count - 1) * gap;
    brandX = width / 2;
    brandY = photosBottom + 62 * sizeScale;
    captionY = brandY + 42 * sizeScale;
    dateY = captionY + (lineCount - 1) * 30 * sizeScale + 30 * sizeScale;
    height = Math.ceil(showDate ? dateY + 24 * sizeScale : captionY + (lineCount - 1) * 30 * sizeScale + 34 * sizeScale);
  } else {
    width = 2 * pad + count * frameWidth + (count - 1) * gap;
    for (let index = 0; index < count; index += 1) {
      photoSlots.push({ x: pad + index * (frameWidth + gap), y: pad, width: frameWidth, height: frameHeight });
    }
    const photosBottom = pad + frameHeight;
    brandX = width / 2;
    brandY = photosBottom + 60 * sizeScale;
    captionY = brandY + 34 * sizeScale;
    dateY = captionY + (lineCount - 1) * 24 * sizeScale + 26 * sizeScale;
    const lastCaptionBaseline = captionY + (lineCount - 1) * 24 * sizeScale;
    const footerBaseline = showDate ? dateY : lastCaptionBaseline;
    height = Math.ceil(footerBaseline + 16 * sizeScale + pad);
  }
  return {
    orientation,
    width: Math.ceil(width),
    height,
    shortEdge,
    pad,
    gap,
    sizeScale,
    imageScale,
    photoWidth: Math.round(frameWidth * imageScale),
    photoHeight: Math.round(frameHeight * imageScale),
    photoSlots,
    brandX,
    brandY,
    captionY,
    captionLineHeight: (orientation === "vertical" ? 30 : 24) * sizeScale,
    dateY,
    captionMaxWidth: orientation === "vertical" ? width - pad * 2 - 24 * sizeScale : width - pad * 2,
  };
}

export function formatCaptureDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date).toUpperCase();
}

export function loadPhotoImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A photo could not be loaded for the strip."));
    image.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}

function seededRandom(text) {
  let seed = Array.from(text).reduce((sum, character) => sum + character.charCodeAt(0), 0) || 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function drawPhotoToCanvas(ctx, image, target, edits = DEFAULT_PHOTO_EDITS, quality = "high", globalCrop = {}, globalFilter = null) {
  const sourceEdits = normalizePhotoEdits(edits);
  const normalized = globalFilter
    ? normalizePhotoEdits({ ...sourceEdits, ...normalizeGlobalFilter(globalFilter) })
    : sourceEdits;
  const globalX = clamp(globalCrop.cropX, 0, 100, 50);
  const globalY = clamp(globalCrop.cropY, 0, 100, 50);
  const cropX = clamp(50 + normalized.cropX - 50 + globalX - 50, 0, 100, 50);
  const cropY = clamp(50 + normalized.cropY - 50 + globalY - 50, 0, 100, 50);
  const crop = calculateCoverCrop(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    target.width,
    target.height,
    cropX,
    cropY,
    normalized.zoom,
  );
  const supportsFilters = "filter" in ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(target.x, target.y, target.width, target.height);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = quality;
  if (supportsFilters) ctx.filter = getPhotoFilterCss(normalized);
  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    target.x,
    target.y,
    target.width,
    target.height,
  );
  ctx.restore();
  return { supportsFilters, crop, filter: supportsFilters ? getPhotoFilterCss(normalized) : "none" };
}

export async function renderPhotoPreview(canvas, photo, { globalCrop = {}, globalFilter = null, quality = "high" } = {}) {
  const normalized = normalizePhoto(photo);
  const image = await loadPhotoImage(normalized.original);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas for the photo preview.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f3eadb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const result = drawPhotoToCanvas(
    ctx,
    image,
    { x: 0, y: 0, width: canvas.width, height: canvas.height },
    normalized.edits,
    quality,
    globalCrop,
    globalFilter,
  );
  ctx.strokeStyle = "rgba(255,255,255,.6)";
  ctx.lineWidth = Math.max(1, canvas.width / 420);
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  return result;
}

const MAX_EXPORT_EDGE = 8192;
const MAX_EXPORT_PIXELS = 20000000;
const EXPORT_QUALITIES = new Set(["low", "medium", "high"]);

export function calculateExportDimensions(layout, exportScale = 1) {
  const scale = Math.round(clamp(exportScale, 1, 3, 1));
  const width = Math.round(layout.width * scale);
  const height = Math.round(layout.height * scale);
  if (width > MAX_EXPORT_EDGE || height > MAX_EXPORT_EDGE || width * height > MAX_EXPORT_PIXELS) {
    throw new Error("This strip is too large to export safely. Choose a smaller strip or lower resolution.");
  }
  return { width, height, scale };
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      reject(new Error("PNG export is not supported by this browser."));
      return;
    }
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode this strip as a PNG."));
      }, "image/png");
    } catch (error) {
      reject(new Error(error.message || "The browser could not export this strip."));
    }
  });
}

export async function renderPhotoStrip({
  shots,
  frame: baseFrame,
  framePaper = null,
  caption = "",
  capturedAt = null,
  config = DEFAULT_STRIP_CONFIG,
  globalFilter = null,
}) {
  const photos = normalizePhotos(shots);
  if (!photos.length) return null;
  const inheritedTexture = baseFrame.grainStyle === "none" ? 0 : baseFrame.grainStyle === "fine" ? 70 : 35;
  const inheritedBorder = baseFrame.borderStyle === "minimal" ? "thin" : baseFrame.borderStyle ?? "classic";
  const paper = normalizeFramePaper(framePaper ?? {
    ...DEFAULT_FRAME_PAPER,
    texture: inheritedTexture,
    borderStyle: inheritedBorder,
  });
  const frame = resolveFramePaper(baseFrame, paper);
  const normalizedCaption = caption.slice(0, 48);
  const baseLayout = calculateStripLayout({ ...config, photoCount: photos.length });
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load("italic " + Math.round(54 * baseLayout.sizeScale) + 'px "Playfair Display"'),
      document.fonts.load(Math.round(22 * baseLayout.sizeScale) + 'px "DM Mono"'),
    ]);
  }

  const captionFont = Math.max(13, Math.round(22 * baseLayout.sizeScale)) + 'px "DM Mono", monospace';
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("Could not measure the photo strip caption.");
  measureContext.font = captionFont;
  const lines = wrapText(measureContext, normalizedCaption, baseLayout.captionMaxWidth);
  const layout = calculateStripLayout({
    ...config,
    photoCount: photos.length,
    captionLineCount: lines.length,
  });
  const dimensions = calculateExportDimensions(layout, config.exportScale);
  const smoothing = EXPORT_QUALITIES.has(config.exportQuality) ? config.exportQuality : "high";
  const images = await Promise.all(photos.map((photo) => loadPhotoImage(photo.original)));
  const canvas = document.createElement("canvas");

  try {
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create a canvas for this strip.");
    ctx.scale(dimensions.scale, dimensions.scale);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = smoothing;
    ctx.fillStyle = frame.bg;
    ctx.fillRect(0, 0, layout.width, layout.height);

    const random = seededRandom(frame.id + ":" + normalizedCaption + ":" + layout.orientation);
    const background = frame.bg || "#f3eadb";
    const channels = background.match(/[a-f0-9]{2}/gi)?.slice(0, 3).map((value) => parseInt(value, 16)) ?? [243, 234, 219];
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    const grainColor = frame.grainColor ?? (luminance < 90 ? "255,240,220" : "70,45,35");
    const grainCount = paper.texture === 0 ? 0 : Math.round(2600 * layout.sizeScale * layout.sizeScale);
    const grainStrength = 0.035 * paper.texture / 100;
    for (let index = 0; index < grainCount; index += 1) {
      ctx.fillStyle = "rgba(" + grainColor + "," + (random() * grainStrength) + ")";
      ctx.fillRect(random() * layout.width, random() * layout.height, 1, 1);
    }

    let supportsFilters = true;
    layout.photoSlots.forEach((slot, index) => {
      const image = images[index];
      const photo = photos[index];
      if (!image || !photo) return;
      const photoWidth = slot.width * layout.imageScale;
      const photoHeight = slot.height * layout.imageScale;
      const photoX = slot.x + (slot.width - photoWidth) / 2;
      const photoY = slot.y + (slot.height - photoHeight) / 2;
      const borderStyle = paper.borderStyle;
      const requestedBorder = (borderStyle === "none" ? 0 : borderStyle === "thin" ? 1 : borderStyle === "double" ? 5 : 3) * layout.sizeScale;
      const border = Math.min(requestedBorder, layout.pad, layout.gap / 2);
      if (border > 0) {
        ctx.fillStyle = frame.ink;
        ctx.fillRect(photoX - border, photoY - border, photoWidth + border * 2, photoHeight + border * 2);
      }
      const drawResult = drawPhotoToCanvas(
        ctx,
        image,
        { x: photoX, y: photoY, width: photoWidth, height: photoHeight },
        photo.edits,
        smoothing,
        config,
        globalFilter,
      );
      supportsFilters = supportsFilters && drawResult.supportsFilters;
      if (borderStyle !== "none") {
        ctx.strokeStyle = borderStyle === "thin" ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.45)";
        ctx.lineWidth = (borderStyle === "thin" ? 1 : 2) * layout.sizeScale;
        ctx.strokeRect(
          photoX + 5 * layout.sizeScale,
          photoY + 5 * layout.sizeScale,
          photoWidth - 10 * layout.sizeScale,
          photoHeight - 10 * layout.sizeScale,
        );
        if (borderStyle === "double") {
          ctx.strokeStyle = frame.accent;
          ctx.lineWidth = layout.sizeScale;
          ctx.strokeRect(photoX + 2 * layout.sizeScale, photoY + 2 * layout.sizeScale, photoWidth - 4 * layout.sizeScale, photoHeight - 4 * layout.sizeScale);
        }
      }
    });

    ctx.textAlign = "center";
    ctx.fillStyle = frame.ink;
    ctx.font = "italic " + Math.round(54 * layout.sizeScale) + 'px "Playfair Display", Georgia, serif';
    ctx.fillText("thePhoto's", layout.brandX, layout.brandY);
    ctx.fillStyle = frame.accent;
    ctx.font = captionFont;
    lines.forEach((line, index) => {
      ctx.fillText(line, layout.brandX, layout.captionY + index * layout.captionLineHeight, layout.captionMaxWidth);
    });

    const dateText = config.showDate && capturedAt ? formatCaptureDate(capturedAt) : "";
    if (dateText) {
      ctx.fillStyle = frame.ink;
      ctx.globalAlpha = 0.72;
      ctx.font = Math.max(10, Math.round(13 * layout.sizeScale)) + 'px "DM Mono", monospace';
      ctx.fillText(dateText, layout.brandX, layout.dateY, layout.captionMaxWidth);
      ctx.globalAlpha = 1;
    }

    const blob = await canvasToBlob(canvas);
    return { blob, supportsFilters };
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error("The browser ran out of memory while preparing the strip. Try a lower export resolution.");
    }
    throw error;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    measureCanvas.width = 0;
    measureCanvas.height = 0;
  }
}




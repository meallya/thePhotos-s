import test from "node:test";
import assert from "node:assert/strict";
import { calculateCoverCrop, calculateStripLayout, DEFAULT_STRIP_CONFIG, formatCaptureDate, PHOTO_COUNTS } from "../src/lib/photobooth.js";

test("classic vertical strip preserves the earlier 620 by 1762 dimensions", () => {
  const layout = calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, photoCount: 4, captionLineCount: 1 });
  assert.equal(layout.width, 620);
  assert.equal(layout.height, 1762);
  assert.deepEqual(layout.photoSlots[0], { x: 28, y: 28, width: 564, height: 390 });
});
test("horizontal layout arranges photos in a row", () => {
  const layout = calculateStripLayout({ layout: "horizontal", photoCount: 4 });
  assert.ok(layout.height < layout.shortEdge);
  assert.equal(layout.photoSlots.length, 4);
  assert.ok(layout.photoSlots[1].x > layout.photoSlots[0].x);
  assert.equal(layout.photoSlots[0].y, layout.photoSlots[3].y);
});

test("capture layout keeps the selected photo count and preserves the four-photo dimensions", () => {
  for (const photoCount of PHOTO_COUNTS) {
    const vertical = calculateStripLayout({ photoCount });
    assert.equal(vertical.photoSlots.length, photoCount);
    assert.equal(vertical.width, 620);
    if (photoCount === 4) assert.equal(vertical.height, 1762);
  }
});
test("spacing and photo scale change the layout", () => {
  const compact = calculateStripLayout({ spacing: 0, photoScale: 80 });
  const spacious = calculateStripLayout({ spacing: 28, photoScale: 100 });
  assert.ok(compact.gap < spacious.gap);
  assert.ok(compact.photoWidth < spacious.photoWidth);
});
test("date and extra caption lines reserve additional footer height", () => {
  const base = calculateStripLayout({ photoCount: 4, captionLineCount: 1 });
  const dated = calculateStripLayout({ showDate: true, photoCount: 4, captionLineCount: 2 });
  assert.ok(dated.height > base.height);
  assert.ok(dated.dateY > dated.captionY);
});
test("cover crop responds to horizontal positioning", () => {
  const left = calculateCoverCrop(1600, 900, 564, 390, 0, 50);
  const right = calculateCoverCrop(1600, 900, 564, 390, 100, 50);
  assert.equal(left.sy, right.sy);
  assert.ok(left.sx < right.sx);
  assert.equal(left.sWidth, right.sWidth);
});
test("capture date uses a readable stable format", () => {
  assert.equal(formatCaptureDate(new Date(2026, 10, 23)), "NOV 23, 2026");
  assert.equal(formatCaptureDate("not a date"), "");
});

test("export resolution scales output dimensions and blocks unsafe canvases", async () => {
  const { calculateExportDimensions } = await import("../src/lib/photobooth.js");
  const layout = calculateStripLayout({ photoCount: 4 });
  assert.deepEqual(calculateExportDimensions(layout, 2), { width: 1240, height: 3524, scale: 2 });
  assert.throws(() => calculateExportDimensions({ width: 10000, height: 10000 }, 1), /too large/i);
});

test("renderer returns a PNG Blob at the selected pixel dimensions", async () => {
  const previousDocument = globalThis.document;
  const previousImage = globalThis.Image;
  let exportSize = null;
  const context = {
    measureText: (text) => ({ width: text.length * 12 }),
    scale() {}, fillRect() {}, save() {}, beginPath() {}, rect() {}, clip() {},
    drawImage() {}, restore() {}, strokeRect() {}, fillText() {},
  };
  const createCanvas = () => ({
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob(callback, mimeType) {
      exportSize = { width: this.width, height: this.height };
      callback(new Blob(["mock-png"], { type: mimeType }));
    },
  });
  class MockImage {
    width = 1280;
    height = 960;
    set src(value) { queueMicrotask(() => this.onload()); }
  }
  globalThis.document = { createElement: createCanvas };
  globalThis.Image = MockImage;
  try {
    const { renderPhotoStrip } = await import("../src/lib/photobooth.js");
    const result = await renderPhotoStrip({
      shots: ["a", "b", "c", "d"],
      frame: { id: "cream", bg: "#f3eadb", ink: "#5b4036", accent: "#a44c4d" },
      caption: "a little piece of today",
      config: { ...DEFAULT_STRIP_CONFIG, exportScale: 2 },
    });
    assert.equal(result.blob.type, "image/png");
    assert.equal(result.supportsFilters, false);
    assert.deepEqual(exportSize, { width: 1240, height: 3524 });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("Spotify URL parsing preserves supported player destinations", async () => {
  const { spotifyEmbedUrl, parseSpotifyPlaylistId } = await import("../src/lib/photobooth.js");
  assert.equal(
    spotifyEmbedUrl("https://open.spotify.com/track/abc123"),
    "https://open.spotify.com/embed/track/abc123?utm_source=generator&theme=0",
  );
  assert.equal(spotifyEmbedUrl("https://example.com/track/abc123"), null);
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com/playlist/abc123?si=share"), "abc123");
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com/intl-id/playlist/abc123"), "abc123");
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com/embed/playlist/abc123"), "abc123");
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com/track/abc123"), null);
  assert.equal(parseSpotifyPlaylistId("https://open.spotify.com.evil.example/playlist/abc123"), null);
  assert.equal(parseSpotifyPlaylistId("not a Spotify URL"), null);
});

test("photo normalization preserves source photos and bounds all editing values", async () => {
  const { normalizePhoto, normalizePhotoEdits, DEFAULT_PHOTO_EDITS } = await import("../src/lib/photobooth.js");
  const legacy = normalizePhoto("data:image/jpeg;base64,original");
  assert.equal(legacy.original, "data:image/jpeg;base64,original");
  assert.deepEqual(legacy.edits, { ...DEFAULT_PHOTO_EDITS });
  assert.deepEqual(normalizePhotoEdits({
    filterId: "unknown", filterIntensity: -5, brightness: 400, contrast: 0,
    saturation: 240, warmth: -180, cropX: 130, cropY: -1, zoom: 260,
  }), {
    ...DEFAULT_PHOTO_EDITS, filterIntensity: 0, brightness: 150, contrast: 50,
    saturation: 200, warmth: -100, cropX: 100, cropY: 0, zoom: 200,
  });
});

test("individual photo adjustments are independent and keep each original unchanged", async () => {
  const { createPhotoModel, updatePhotoEdits } = await import("../src/lib/photobooth.js");
  const first = createPhotoModel("raw-one", "one", "warm");
  const second = createPhotoModel("raw-two", "two", "mono");
  const updated = updatePhotoEdits([first, second], "one", { brightness: 125, cropX: 18 });
  assert.equal(updated[0].original, "raw-one");
  assert.equal(updated[0].edits.brightness, 125);
  assert.equal(updated[1].original, "raw-two");
  assert.equal(updated[1].edits.brightness, 100);
  assert.notEqual(updated[0].edits, first.edits);
});

test("preset intensity scales and reset restores all photo defaults", async () => {
  const { createPhotoModel, getPhotoFilterCss, resetPhotoEdits, updatePhotoEdits, DEFAULT_PHOTO_EDITS } = await import("../src/lib/photobooth.js");
  const photo = createPhotoModel("raw", "reset", "warm");
  const edited = updatePhotoEdits([photo], photo.id, {
    filterIntensity: 25, brightness: 130, contrast: 80, saturation: 145,
    warmth: -40, cropX: 10, cropY: 90, zoom: 160,
  })[0];
  assert.notEqual(
    getPhotoFilterCss({ filterId: "warm", filterIntensity: 25 }),
    getPhotoFilterCss({ filterId: "warm", filterIntensity: 100 }),
  );
  const reset = resetPhotoEdits(edited);
  assert.equal(reset.original, "raw");
  assert.deepEqual(reset.edits, { ...DEFAULT_PHOTO_EDITS });
});

test("crop focal position and zoom adjust a bounded source rectangle", () => {
  const center = calculateCoverCrop(1600, 900, 564, 390, 50, 50, 100);
  const focal = calculateCoverCrop(1600, 900, 564, 390, 100, 0, 180);
  assert.ok(focal.sWidth < center.sWidth);
  assert.ok(focal.sHeight < center.sHeight);
  assert.ok(focal.sx >= 0 && focal.sx + focal.sWidth <= 1600);
  assert.ok(focal.sy >= 0 && focal.sy + focal.sHeight <= 900);
});

test("capture stores the unfiltered original with the selected starting preset", async () => {
  const previousDocument = globalThis.document;
  let drawFilter = null;
  const context = {
    filter: "none", translate() {}, scale() {},
    drawImage() { drawFilter = this.filter; },
  };
  globalThis.document = { createElement: () => ({
    width: 0, height: 0, getContext: () => context,
    toDataURL: () => "data:image/jpeg;base64,raw-frame",
  }) };
  try {
    const { capturePhoto, shotCount } = await import("../src/lib/photobooth.js");
    const photo = capturePhoto({ videoWidth: 1280, videoHeight: 960 }, "capture-1", "warm");
    assert.equal(shotCount, 4);
    assert.equal(photo.original, "data:image/jpeg;base64,raw-frame");
    assert.equal(photo.edits.filterId, "warm");
    assert.equal(photo.edits.filterIntensity, 100);
    assert.equal(drawFilter, "none");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("preview and strip renderer apply the same photo transform", async () => {
  const previousDocument = globalThis.document;
  const previousImage = globalThis.Image;
  const contexts = [];
  const makeContext = () => {
    const calls = [];
    const context = {
      filter: "none", globalAlpha: 1, calls,
      measureText: (text) => ({ width: text.length * 12 }),
      scale() {}, clearRect() {}, fillRect() {}, save() {}, beginPath() {}, rect() {}, clip() {},
      drawImage(...args) { calls.push({ args, filter: this.filter }); },
      restore() {}, strokeRect() {}, fillText() {},
    };
    contexts.push(context);
    return context;
  };
  const createCanvas = () => ({
    width: 0, height: 0, getContext: () => makeContext(),
    toBlob(callback, mimeType) { callback(new Blob(["mock"], { type: mimeType })); },
  });
  class MockImage {
    width = 1280;
    height = 960;
    set src(value) { queueMicrotask(() => this.onload()); }
  }
  globalThis.document = { createElement: createCanvas };
  globalThis.Image = MockImage;
  try {
    const { createPhotoModel, updatePhotoEdits, renderPhotoPreview, renderPhotoStrip } = await import("../src/lib/photobooth.js");
    const photo = updatePhotoEdits(
      [createPhotoModel("source", "compare", "soft")],
      "compare",
      { filterIntensity: 64, warmth: 28, brightness: 112, cropX: 22, cropY: 77, zoom: 145 },
    )[0];
    const globalCrop = { cropX: 68, cropY: 34 };
    await renderPhotoPreview({ width: 564, height: 390, getContext: () => makeContext() }, photo, { globalCrop });
    const rendered = await renderPhotoStrip({
      shots: [photo],
      frame: { id: "cream", bg: "#f3eadb", ink: "#5b4036", accent: "#a44c4d" },
      caption: "consistent edit",
      config: { ...DEFAULT_STRIP_CONFIG, cropX: globalCrop.cropX, cropY: globalCrop.cropY },
    });
    const previewDraw = contexts[0].calls[0];
    const stripDraw = contexts.at(-1).calls[0];
    assert.equal(previewDraw.filter, stripDraw.filter);
    assert.deepEqual(previewDraw.args.slice(1, 5), stripDraw.args.slice(1, 5));
    assert.equal(rendered.blob.type, "image/png");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("capture session preserves the four photo and countdown sequence", async () => {
  const { runCaptureSequence } = await import("../src/lib/photoboothSession.js");
  const capturedIndexes = [];
  const countdowns = [];
  const waits = [];
  const photos = [];
  const result = await runCaptureSequence({
    wait: async (duration) => { waits.push(duration); return true; },
    capture: (index) => { capturedIndexes.push(index); return { id: "photo-" + index }; },
    onCountdown: (value) => countdowns.push(value),
    onFlash: () => {},
    onPhoto: (value) => photos.push(value),
  });
  assert.equal(result.cancelled, false);
  assert.deepEqual(capturedIndexes, [0, 1, 2, 3]);
  assert.equal(result.captured.length, 4);
  assert.equal(countdowns.filter((value) => value === "SMILE").length, 4);
  assert.deepEqual(waits, [850, 850, 850, 160, 750, 850, 850, 850, 160, 750, 850, 850, 850, 160, 750, 850, 850, 850, 160]);
  assert.equal(photos.at(-1).length, 4);
});

test("cancelling a capture sequence stops before the next photo", async () => {
  const { runCaptureSequence } = await import("../src/lib/photoboothSession.js");
  let waitCount = 0;
  const captures = [];
  const result = await runCaptureSequence({
    wait: async () => ++waitCount < 5,
    capture: (index) => { captures.push(index); return { id: "photo-" + index }; },
    onCountdown: () => {},
    onFlash: () => {},
    onPhoto: () => {},
  });
  assert.equal(result.cancelled, true);
  assert.deepEqual(captures, [0]);
  assert.equal(result.captured.length, 1);
});


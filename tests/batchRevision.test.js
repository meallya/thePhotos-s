import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_FRAME_PAPER, DEFAULT_GLOBAL_FILTER, DEFAULT_PHOTO_EDITS, DEFAULT_STRIP_CONFIG, FRAME_BORDER_STYLES, FRAME_PAPER_COLORS, PHOTO_COUNTS, calculateExportDimensions, calculateStripLayout, createPhotoModel, filters, frames, getFramePaperColor, getPhotoFilterCss, normalizeFramePaper, normalizeGlobalFilter, normalizePhotoCount, renderPhotoPreview, renderPhotoStrip, resolveFramePaper, updatePhotoEdits } from "../src/lib/photobooth.js";
import { createCustomFramePaperPatch, normalizeCssColor } from "../src/lib/paperColor.js";
import { captureResultDialogReducer, INITIAL_CAPTURE_RESULT_DIALOG } from "../src/lib/resultDialog.js";
import { replaceCapturedPhoto, runCaptureSequence, runRetakeSequence } from "../src/lib/photoboothSession.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function installCanvasMocks() {
  const oldDocument = globalThis.document, oldImage = globalThis.Image;
  const contexts = [], encodes = [];
  const createCanvas = () => {
    const calls = [];
    const context = {
      calls, filter: "none", imageSmoothingEnabled: true, imageSmoothingQuality: "high", globalAlpha: 1,
      measureText: (text) => ({ width: text.length * 11 }), scale: (...args) => calls.push({ type: "scale", args }),
      clearRect() {}, save() {}, beginPath() {}, rect() {}, clip() {}, restore() {},
      fillRect(x, y, width, height) { calls.push({ type: "fillRect", x, y, width, height, fillStyle: this.fillStyle }); },
      drawImage(image, ...args) { calls.push({ type: "drawImage", source: image.source, args, filter: this.filter }); },
      strokeRect(x, y, width, height) { calls.push({ type: "strokeRect", x, y, width, height, strokeStyle: this.strokeStyle }); },
      fillText(text, x, y, maxWidth) { calls.push({ type: "fillText", text, x, y, maxWidth }); },
    };
    contexts.push(context);
    return { width: 0, height: 0, getContext: () => context, toBlob(callback, type) {
      encodes.push({ width: this.width, height: this.height }); callback(new Blob(["strip"], { type }));
    } };
  };
  class MockImage {
    width = 1280; height = 960; naturalWidth = 1280; naturalHeight = 960;
    set src(value) { this.source = value; if (String(value).includes("frame")) { this.width = this.naturalWidth = 1200; this.height = this.naturalHeight = 600; } queueMicrotask(() => this.onload?.()); }
  }
  globalThis.document = { createElement: createCanvas };
  globalThis.Image = MockImage;
  return { contexts, encodes, restore() {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
  } };
}

test("project source is valid UTF-8 and contains no common mojibake sequences", () => {
  const visit = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? visit(full) : /\.(jsx?|css|html)$/.test(entry.name) ? [full] : [];
  });
  const badSequences = ["\u00c3\u2014", "\u00c2\u00a9", "\u00e2\u0153\u201c", "\u00e2\u2122\u00aa", "\u00ef\u00bf\u00bd", "\ufffd"];
  for (const file of [...visit(path.join(root, "src")), path.join(root, "index.html"), path.join(root, "README.md")]) {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
    for (const marker of badSequences) assert.equal(content.includes(marker), false, path.relative(root, file));
  }
});

test("the four built-in filters are available for the global strip setting", () => {
  assert.deepEqual(filters.map(({ id }) => id), ["natural", "warm", "mono", "soft"]);
  assert.deepEqual(DEFAULT_GLOBAL_FILTER, { filterId: "natural", filterIntensity: 100 });
  assert.deepEqual(normalizeGlobalFilter({ filterId: "not-a-filter", filterIntensity: 140 }), { filterId: "natural", filterIntensity: 100 });
  assert.deepEqual(normalizeGlobalFilter({ filterId: "mono", filterIntensity: -20 }), { filterId: "mono", filterIntensity: 0 });
  const photos = filters.map((item, index) => createPhotoModel("source-" + index, "photo-" + index, item.id));
  const changed = updatePhotoEdits(photos, "photo-2", { brightness: 125 });
  assert.equal(changed[2].edits.brightness, 125);
  assert.deepEqual(changed.filter((photo) => photo.id !== "photo-2").map((photo) => photo.edits.brightness), [100, 100, 100]);
  assert.equal(changed[2].original, "source-2");
  assert.equal(DEFAULT_PHOTO_EDITS.brightness, 100);
});

test("orientation UI is limited to vertical and horizontal and obsolete studio navigation is absent", () => {
  const settings = fs.readFileSync(path.join(root, "src/components/StripSettings.jsx"), "utf8");
  assert.match(settings, /\[\["vertical","Vertical"\],\["horizontal","Horizontal"\]\]/);
  const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
  assert.doesNotMatch(app, /<TemplateStudio|workflow-nav|workflowStage|selectedTemplate|Change Template/i);
  for (const removedFile of ["src/components/TemplateStudio.jsx", "src/hooks/useTemplateLibrary.js", "src/lib/templates.js", "src/lib/workflow.js"]) assert.equal(fs.existsSync(path.join(root, removedFile)), false, removedFile);
  assert.ok(app.includes("©"));
  assert.doesNotMatch(app, /\bMood\s*→\s*Capture\s*→\s*Edit/i);
});

test("scrollbars are visually hidden while dialog and page content keep scroll overflow", () => {
  const css = fs.readFileSync(path.join(root, "src/styles/photobooth.css"), "utf8");
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.capture-result-dialog\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.capture-result-backdrop\s*\{[^}]*overflow-y:\s*auto/s);
  assert.doesNotMatch(css, /body\s*,\s*\*\s*\{[^}]*overflow:\s*hidden/s);
});

test("strip geometry keeps four-photo spacing and footer proportions across configurations", () => {
  for (const orientation of ["vertical", "horizontal"]) {
    for (const stripSize of [480, 620, 760]) for (const spacing of [0, 12, 36]) for (const padding of [12, 28, 64]) {
      for (const showDate of [false, true]) {
        const layout = calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout: orientation, stripSize, spacing, padding, showDate, photoCount: 4, captionLineCount: 3 });
        assert.equal(layout.photoSlots.length, 4);
        assert.ok(layout.photoSlots.every((slot) => slot.x >= layout.pad && slot.y >= layout.pad && slot.x + slot.width <= layout.width - layout.pad && slot.y + slot.height <= layout.height - layout.pad));
        if (orientation === "horizontal") {
          for (let index = 1; index < 4; index += 1) {
            assert.equal(layout.photoSlots[index].x - (layout.photoSlots[index - 1].x + layout.photoSlots[index - 1].width), layout.gap);
            assert.equal(layout.photoSlots[index].y, layout.photoSlots[0].y);
          }
        } else {
          for (let index = 1; index < 4; index += 1) {
            assert.equal(layout.photoSlots[index].y - (layout.photoSlots[index - 1].y + layout.photoSlots[index - 1].height), layout.gap);
          }
        }
        const photosBottom = Math.max(...layout.photoSlots.map((slot) => slot.y + slot.height));
        assert.ok(layout.brandY - photosBottom >= 54 * layout.sizeScale);
        assert.equal(layout.brandX, layout.width / 2);
        const lastCaption = layout.captionY + 2 * layout.captionLineHeight;
        if (orientation === "vertical") assert.ok(lastCaption + 30 * layout.sizeScale <= layout.height);
        else assert.ok(lastCaption < layout.height - layout.pad);
        if (showDate) {
          assert.ok(layout.dateY > lastCaption);
          if (orientation === "vertical") assert.ok(layout.dateY + 13 * layout.sizeScale < layout.height);
          else assert.ok(layout.dateY + 13 * layout.sizeScale <= layout.height - layout.pad);
        }
      }
    }
  }
  const vertical = calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout: "vertical", photoCount: 4, captionLineCount: 1 });
  assert.equal(vertical.width, 620);
  assert.equal(vertical.height, 1762);
  const horizontal = calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout: "horizontal", photoCount: 4, captionLineCount: 1 });
  assert.ok(horizontal.height < horizontal.shortEdge);
});

test("photo strip layouts create only the selected number of photo slots", () => {
  assert.deepEqual(PHOTO_COUNTS, [1, 2, 3, 4]);
  assert.equal(normalizePhotoCount(2), 2);
  assert.equal(normalizePhotoCount("3"), 3);
  assert.equal(normalizePhotoCount(0), 4);
  assert.equal(normalizePhotoCount(5), 4);
  for (const photoCount of PHOTO_COUNTS) {
    for (const layout of ["vertical", "horizontal"]) {
      assert.equal(
        calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout, photoCount }).photoSlots.length,
        photoCount,
      );
    }
  }
});

test("strip rendering exports only the captured photo count", async () => {
  const mock = installCanvasMocks();
  try {
    const photos = Array.from({ length: 4 }, (_, index) =>
      createPhotoModel("source-" + index, "photo-" + index),
    );
    const frame = { ...frames[0], grainStyle: "none", borderStyle: "none" };
    const config = { ...DEFAULT_STRIP_CONFIG, exportScale: 2 };
    for (const photoCount of PHOTO_COUNTS) {
      const result = await renderPhotoStrip({
        shots: photos.slice(0, photoCount),
        frame,
        caption: "A little moment",
        config,
      });
      assert.equal(result.blob.type, "image/png");
      assert.equal(
        mock.contexts.at(-1).calls.filter((call) => call.type === "drawImage").length,
        photoCount,
      );
      const layout = calculateStripLayout({ ...config, photoCount });
      assert.equal(mock.encodes.at(-1).width, layout.width * 2);
      assert.equal(mock.encodes.at(-1).height, layout.height * 2);
    }
  } finally {
    mock.restore();
  }
});

test("orientation layout calculation leaves original photos and per-photo adjustments unchanged", () => {
  const photos = Array.from({ length: 4 }, (_, index) => createPhotoModel("original-" + index, "photo-" + index));
  const edited = updatePhotoEdits(photos, "photo-0", { brightness: 120, cropX: 30 });
  const before = edited.map((photo) => ({ original: photo.original, edits: { ...photo.edits } }));
  for (const layout of ["vertical", "horizontal"]) {
    assert.equal(calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout, photoCount: 4 }).photoSlots.length, 4);
  }
  assert.deepEqual(edited.map((photo) => ({ original: photo.original, edits: photo.edits })), before);
  assert.deepEqual(edited.map((photo) => photo.original), ["original-0", "original-1", "original-2", "original-3"]);
});

test("export dimensions keep 1x, 2x, and 3x safe in both orientations", () => {
  for (const layoutName of ["vertical", "horizontal"]) {
    const layout = calculateStripLayout({ ...DEFAULT_STRIP_CONFIG, layout: layoutName, photoCount: 4 });
    for (const scale of [1, 2, 3]) {
      const dimensions = calculateExportDimensions(layout, scale);
      assert.equal(dimensions.width, layout.width * scale);
      assert.equal(dimensions.height, layout.height * scale);
      assert.ok(dimensions.width <= 8192 && dimensions.height <= 8192);
    }
  }
});

test("global filter renders identically across all photos, preview, and PNG export", async () => {
  const mock = installCanvasMocks();
  try {
    const photos = Array.from({ length: 4 }, (_, index) => createPhotoModel("photo-source-" + index, "photo-" + index, filters[index].id));
    const filter = { filterId: "warm", filterIntensity: 42 };
    const expectedFilter = getPhotoFilterCss(filter);
    const previewCalls = [];
    const previewContext = {
      filter: "none", imageSmoothingEnabled: true, imageSmoothingQuality: "high", globalAlpha: 1,
      clearRect() {}, fillRect() {}, save() {}, beginPath() {}, rect() {}, clip() {}, restore() {}, strokeRect() {},
      drawImage(image, ...args) { previewCalls.push({ source: image.source, args, filter: this.filter }); },
    };
    await renderPhotoPreview({ width: 560, height: 390, getContext: () => previewContext }, photos[0], { globalFilter: filter });
    assert.equal(previewCalls[0].filter, expectedFilter);

    for (const orientation of ["vertical", "horizontal"]) for (const stripSize of [480, 620, 760]) for (const spacing of [0, 12, 36]) for (const photoScale of [70, 100]) for (const scale of [1, 2, 3]) {
      const config = { ...DEFAULT_STRIP_CONFIG, layout: orientation, stripSize, spacing, photoScale, exportScale: scale, exportQuality: "high", showDate: true };
      const result = await renderPhotoStrip({ shots: photos, frame: { ...frames[0], grainStyle: "none", borderStyle: "double" }, caption: "Print", capturedAt: new Date("2026-06-01T12:00:00Z"), config, globalFilter: filter });
      assert.equal(result.blob.type, "image/png");
      const context = mock.contexts.at(-1);
      const draws = context.calls.filter((call) => call.type === "drawImage");
      assert.equal(draws.length, 4);
      assert.deepEqual(draws.map((draw) => draw.source), photos.map((photo) => photo.original));
      assert.deepEqual(draws.map((draw) => draw.filter), Array(4).fill(expectedFilter));
      const layout = calculateStripLayout({ ...config, photoCount: 4 });
      const frameBorders = context.calls.filter((call) => call.type === "fillRect" && call.fillStyle === frames[0].ink);
      const expectedBorderCount = Math.min(5 * layout.sizeScale, layout.pad, layout.gap / 2) > 0 ? 4 : 0;
      assert.equal(frameBorders.length, expectedBorderCount);
      for (let index = 1; index < frameBorders.length; index += 1) {
        const previous = frameBorders[index - 1];
        const current = frameBorders[index];
        const previousEnd = orientation === "horizontal" ? previous.x + previous.width : previous.y + previous.height;
        const currentStart = orientation === "horizontal" ? current.x : current.y;
        assert.ok(currentStart - previousEnd >= 0, "frame borders must not overlap across the configured gap");
      }
      assert.equal(mock.encodes.at(-1).width, calculateStripLayout({ ...config, photoCount: 4 }).width * scale);
      assert.equal(mock.encodes.at(-1).height, layout.height * scale);
    }
    assert.equal(photos[0].edits.filterId, "natural");
    assert.equal(photos[0].original, "photo-source-0");
  } finally { mock.restore(); }
});

test("frame paper settings normalize, reset, and resolve neutral colors without touching photo settings", () => {
  assert.deepEqual(DEFAULT_FRAME_PAPER, { paperColor: "palette", texture: 35, borderStyle: "classic", customColor: "#f3eadb" });
  assert.deepEqual(FRAME_PAPER_COLORS.map(({ id }) => id), ["palette", "white", "cream", "warm-white", "soft-gray", "retro-red", "darkroom-brown", "darkroom-black", "sage-green", "dusty-blue", "blush-pink", "custom"]);
  const requestedColors = {
    white: "#fffdf9", cream: "#f3eadb", "warm-white": "#faf6ed", "soft-gray": "#e8e6e2",
    "retro-red": "#A63D40", "darkroom-brown": "#49352A", "darkroom-black": "#242424",
    "sage-green": "#879B82", "dusty-blue": "#718DA5", "blush-pink": "#D9A6A6",
  };
  for (const [id, color] of Object.entries(requestedColors)) assert.equal(FRAME_PAPER_COLORS.find((option) => option.id === id)?.color, color);
  assert.deepEqual(FRAME_BORDER_STYLES.map(({ id }) => id), ["classic", "thin", "double", "none"]);
  assert.deepEqual(normalizeFramePaper({ paperColor: "invalid", texture: 140, borderStyle: "broken" }), { ...DEFAULT_FRAME_PAPER, texture: 100 });
  assert.deepEqual(normalizeFramePaper({ paperColor: "white", texture: -8, borderStyle: "thin" }), { paperColor: "white", texture: 0, borderStyle: "thin", customColor: "#f3eadb" });
  assert.deepEqual(resolveFramePaper(frames[2], { paperColor: "soft-gray", texture: 35, borderStyle: "classic" }), {
    ...frames[2], bg: "#e8e6e2", ink: "#4c4945", accent: "#8e5652",
  });
  assert.deepEqual(normalizeFramePaper(DEFAULT_FRAME_PAPER), { ...DEFAULT_FRAME_PAPER });
  for (const option of FRAME_PAPER_COLORS.filter((item) => item.color)) {
    const settings = { ...DEFAULT_FRAME_PAPER, paperColor: option.id };
    const expectedColor = option.color.toLowerCase();
    assert.equal(getFramePaperColor(frames[0], settings), expectedColor);
    assert.equal(resolveFramePaper(frames[0], settings).bg, expectedColor);
  }
  assert.equal(getFramePaperColor(frames[0], { ...DEFAULT_FRAME_PAPER, paperColor: "custom", customColor: "#a63d40" }), "#a63d40");
});

test("CSS paper colors accept HEX, RGB, and named colors while rejecting invalid input", () => {
  assert.equal(normalizeCssColor(" #A63D40 "), "#a63d40");
  assert.equal(normalizeCssColor("rgb(166, 61, 64)"), "#a63d40");
  assert.equal(normalizeCssColor("rgba(166, 61, 64, 1)"), "#a63d40");
  assert.equal(normalizeCssColor("rgba(166, 61, 64, 0.5)"), null);
  const oldDocument = globalThis.document;
  let fillStyle = "#000000";
  const namedColors = { salmon: "#fa8072", tomato: "#ff6347", rebeccapurple: "#663399" };
  const colorContext = {};
  Object.defineProperty(colorContext, "fillStyle", {
    get: () => fillStyle,
    set: (value) => {
      const normalized = namedColors[String(value).toLowerCase()] ?? (/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value).toLowerCase() : null);
      if (normalized) fillStyle = normalized;
    },
  });
  const mockDocument = { createElement: () => ({ getContext: () => colorContext }) };
  try {
    assert.equal(normalizeCssColor("salmon", mockDocument), "#fa8072");
    assert.equal(normalizeCssColor("tomato", mockDocument), "#ff6347");
    assert.equal(normalizeCssColor("rebeccapurple", mockDocument), "#663399");
    assert.equal(normalizeCssColor("not-a-color", mockDocument), null);
    globalThis.document = mockDocument;
    assert.deepEqual(createCustomFramePaperPatch("rgb(166, 61, 64)"), { paperColor: "custom", customColor: "#a63d40" });
    assert.deepEqual(createCustomFramePaperPatch("tomato"), { paperColor: "custom", customColor: "#ff6347" });
    assert.equal(createCustomFramePaperPatch("unfinished-color"), null);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test("frame paper color, texture, and border render identically in preview and PNG export", async () => {
  const mock = installCanvasMocks();
  try {
    const shots = Array.from({ length: 4 }, (_, index) => createPhotoModel("paper-photo-" + index, "paper-" + index));
    for (const orientation of ["vertical", "horizontal"]) {
      for (const option of FRAME_PAPER_COLORS.filter((item) => item.color)) {
        const colorPaper = { paperColor: option.id, texture: 0, borderStyle: "classic" };
        const colorConfig = { ...DEFAULT_STRIP_CONFIG, layout: orientation, exportScale: 1 };
        const colorBase = { shots, frame: frames[0], framePaper: colorPaper, caption: "preset paper", config: colorConfig };
        await renderPhotoStrip(colorBase);
        const colorPreview = mock.contexts.at(-1);
        assert.equal(colorPreview.calls.find((call) => call.type === "fillRect" && call.x === 0 && call.y === 0).fillStyle, option.color.toLowerCase());
        const colorPreviewOps = colorPreview.calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));
        await renderPhotoStrip({ ...colorBase, config: { ...colorConfig, exportScale: 3 } });
        const colorExportOps = mock.contexts.at(-1).calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));
        assert.deepEqual(colorExportOps, colorPreviewOps);
      }

      for (const borderStyle of FRAME_BORDER_STYLES.map((option) => option.id)) {
        const framePaper = { paperColor: "soft-gray", texture: 0, borderStyle };
        const base = {
          shots, frame: frames[2], framePaper, caption: "paper test", config: { ...DEFAULT_STRIP_CONFIG, layout: orientation, exportScale: 1 },
        };
        await renderPhotoStrip(base);
        const preview = mock.contexts.at(-1);
        const background = preview.calls.find((call) => call.type === "fillRect" && call.x === 0 && call.y === 0);
        assert.equal(background.fillStyle, "#e8e6e2");
        assert.equal(preview.calls.filter((call) => call.type === "strokeRect").length, borderStyle === "none" ? 0 : borderStyle === "double" ? 8 : 4);
        assert.equal(preview.calls.filter((call) => call.type === "fillRect" && String(call.fillStyle).startsWith("rgba(")).length, 0);
        const previewOps = preview.calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));

        await renderPhotoStrip({ ...base, config: { ...base.config, exportScale: 3 } });
        const exported = mock.contexts.at(-1);
        const exportOps = exported.calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));
        assert.deepEqual(exportOps, previewOps);
        assert.deepEqual(mock.encodes.at(-1), {
          width: calculateStripLayout({ ...base.config, photoCount: 4 }).width * 3,
          height: calculateStripLayout({ ...base.config, photoCount: 4 }).height * 3,
        });
      }

      const customPaper = { paperColor: "custom", customColor: "#a63d40", texture: 70, borderStyle: "double" };
      const customConfig = { ...DEFAULT_STRIP_CONFIG, layout: orientation, exportScale: 1 };
      const customBase = { shots, frame: frames[0], framePaper: customPaper, caption: "custom grain", config: customConfig };
      await renderPhotoStrip(customBase);
      const context = mock.contexts.at(-1);
      assert.ok(context.calls.some((call) => call.type === "fillRect" && call.fillStyle === "#a63d40"));
      const grainMarks = context.calls.filter((call) => call.type === "fillRect" && String(call.fillStyle).startsWith("rgba("));
      assert.equal(grainMarks.length, 2600);
      assert.ok(grainMarks.every((call) => Number(call.fillStyle.match(/,([\d.]+)\)$/)?.[1]) <= 0.025));
      assert.equal(context.calls.filter((call) => call.type === "drawImage").length, 4);
      assert.equal(context.calls.filter((call) => call.type === "strokeRect").length, 8);
      const previewOps = context.calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));
      await renderPhotoStrip({ ...customBase, config: { ...customConfig, exportScale: 3 } });
      const exportOps = mock.contexts.at(-1).calls.filter((call) => ["fillRect", "strokeRect", "drawImage", "fillText"].includes(call.type));
      assert.deepEqual(exportOps, previewOps);
    }
    assert.deepEqual(shots.map((photo) => photo.original), ["paper-photo-0", "paper-photo-1", "paper-photo-2", "paper-photo-3"]);
  } finally { mock.restore(); }
});

test("two-page workflow keeps soundtrack shared and places capture and customization controls on their respective pages", () => {
  const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
  const photoboothPage = fs.readFileSync(path.join(root, "src/components/PhotoboothPage.jsx"), "utf8");
  const customizationPage = fs.readFileSync(path.join(root, "src/components/PhotoCustomizationPage.jsx"), "utf8");
  const soundtrackPanel = fs.readFileSync(path.join(root, "src/components/SoundtrackPanel.jsx"), "utf8");
  const styleSheet = fs.readFileSync(path.join(root, "src/styles/photobooth.css"), "utf8");
  assert.match(app, /const \[page, setPage\] = useState\("photobooth"\)/);
  assert.match(app, /setPage\("customize"\)/);
  assert.match(app, /onBack=\{\(\) => setPage\("photobooth"\)\}/);
  assert.match(app, /<SoundtrackPanel/);
  assert.match(app, /<PhotoboothPage/);
  assert.match(app, /<PhotoCustomizationPage/);
  assert.equal((soundtrackPanel.match(/<audio\b/g) ?? []).length, 1);
  assert.match(soundtrackPanel, /<VinylPlayer isPlaying=\{isPlaying\} \/>/);
  assert.ok(app.indexOf("<SoundtrackPanel />") < app.indexOf("<PhotoboothPage"));
  assert.ok(app.indexOf("<PhotoboothPage") < app.indexOf("<PhotoCustomizationPage"));
  assert.match(app, /key="shared-soundtrack"/);
  assert.match(app, /page === "photobooth" \? " is-studio-split" : " is-customizing"/);
  assert.match(styleSheet, /\.shared-soundtrack\.is-customizing \{ display: none; \}/);
  assert.match(soundtrackPanel, /audioRef\.current\?\.pause\(\)/);
  assert.doesNotMatch(app, /spotifyInput|spotifyEmbed|setSpotifyPlayback/);
  assert.doesNotMatch(photoboothPage, /<GlobalFilterControls/);
  assert.doesNotMatch(photoboothPage, /filter-stage|Choose your look/);
  assert.match(app, /filterStyle="none"/);
  assert.match(photoboothPage, /onCameraAction/);
  assert.match(app, /useState\(shotCount\)/);
  assert.match(app, /runPhotoSession\(\s*videoRef\.current,\s*selectedPhotoCount,?\s*\)/);
  assert.match(photoboothPage, /PHOTO_COUNTS\.map/);
  assert.match(photoboothPage, /const photoCountLocked = busy \|\| shots\.length > 0/);
  assert.match(photoboothPage, /Array\.from\(\{ length: photoCount \}/);
  assert.match(customizationPage, /<GlobalFilterControls/);
  assert.ok(customizationPage.indexOf("<GlobalFilterControls") < customizationPage.indexOf("<FramePaperSettings"));
  assert.match(customizationPage, /01 \/ THE FRAME/);
  assert.match(customizationPage, /02 \/ THE FILM/);
  assert.match(customizationPage, /aria-label=\{"Retake photo " \+ \(index \+ 1\)\}/);
  assert.match(app, /runPhotoRetake\(videoRef\.current, targetId\)/);
  assert.match(app, /if \(retakeTargetRef\.current !== targetId \|\| !completed\) return/);
  assert.match(photoboothPage, /CONTINUE TO CUSTOMIZATION/);
  assert.match(photoboothPage, /START A NEW SESSION/);
  assert.match(customizationPage, /<PhotoEditor/);
  assert.match(customizationPage, /<FramePaperSettings/);
  assert.match(customizationPage, /const photoCount = shots\.length/);
  assert.match(customizationPage, /photoCount === 4[\s\S]*?YOUR FOUR MOMENTS/);
  assert.match(customizationPage, /repeat\(\$\{photoCount\}, minmax\(0, 1fr\)\)/);
  assert.match(customizationPage, /<PhotoStripPreview/);
  assert.match(customizationPage, /<StripSettings/);
  assert.match(customizationPage, /DOWNLOAD PHOTO STRIP/);
  const filterControls = fs.readFileSync(path.join(root, "src/components/GlobalFilterControls.jsx"), "utf8");
  const photoEditor = fs.readFileSync(path.join(root, "src/components/PhotoEditor.jsx"), "utf8");
  assert.match(filterControls, /className="filter-card-content"[\s\S]*?filter-thumbnail[\s\S]*?className="filter-label"/);
  assert.match(filterControls, /className="filter-card-content"[\s\S]*?\{filter\.id === item\.id && <span className="filter-check"/);
  assert.match(filterControls, /filters\.map\(\(item\) => \(/);
  assert.match(filterControls, /onClick=\{\(\) => onChange\(\{ filterId: item\.id \}\)\}/);
  assert.doesNotMatch(filterControls, /type="range"|RESET FILTER|custom filter/i);
  assert.doesNotMatch(photoEditor, /GlobalFilterControls|filterIntensity/);
  assert.match(styleSheet, /\.global-filter-controls \.filter-card \{[^}]*justify-content:\s*flex-start/s);
  assert.match(styleSheet, /\.global-filter-controls \.filter-card-content \{[^}]*gap:\s*12px;[^}]*flex:\s*0 0 auto/s);
  assert.match(styleSheet, /\.global-filter-controls \.filter-check \{[^}]*margin-left:\s*auto/);
  assert.doesNotMatch(styleSheet, /\.filter-card\.selected[^}]*justify-content/);
  assert.match(filterControls, /className=\{\"filter-option filter-card \" \+/);
  assert.match(customizationPage, /globalFilter=\{globalFilter\}/);
  assert.match(app, /filterIntensity: 100/);
  assert.match(styleSheet, /@media\(max-width:850px\)[\s\S]*?\.shared-soundtrack\.is-studio-split \{ grid-template-columns: minmax\(0,1fr\);/);
  const framePaperSettings = fs.readFileSync(path.join(root, "src/components/FramePaperSettings.jsx"), "utf8");
  assert.match(framePaperSettings, /style=\{\{ backgroundColor: color \}\}/);
  assert.match(framePaperSettings, /getFramePaperColor\(currentFrame, \{ \.\.\.framePaper, paperColor: option\.id \}\)/);
  assert.match(framePaperSettings, /onChange\(\{ paperColor: option\.id \}\)/);
  assert.match(framePaperSettings, /type="color" value=\{activeColor\}/);
  assert.match(framePaperSettings, /value=\{colorInput\}/);
  assert.match(framePaperSettings, /if \(!patch\) \{/);
  assert.match(framePaperSettings, /setColorError\("Enter a valid CSS color/);
  assert.match(app, /setFramePaper\(\{ \.\.\.DEFAULT_FRAME_PAPER \}\)/);
  assert.doesNotMatch(app, /history-panel|Undo2|Redo2|handleUndo|handleRedo|studioHistory|historyRef|handleHistoryShortcut/);
  assert.equal(fs.existsSync(path.join(root, "src/lib/studioHistory.js")), false);
  assert.equal(fs.existsSync(path.join(root, "tests/phase4c.test.js")), false);
  assert.doesNotMatch(app, /CaptureResultDialog|captureResultDialog/);
  assert.doesNotMatch(app + photoboothPage + customizationPage, /CustomFrameStudio|customFrame|Custom Frame|Change Template/i);
  for (const removedFile of ["src/components/CustomFrameStudio.jsx", "src/lib/customFrame.js"]) assert.equal(fs.existsSync(path.join(root, removedFile)), false, removedFile);
});

test("capture result opens once after completion, can be reopened after close, and resets for a new session", () => {
  let state = INITIAL_CAPTURE_RESULT_DIALOG;
  state = captureResultDialogReducer(state, { type: "session-completed", completed: false, sessionId: 1 });
  assert.deepEqual(state, INITIAL_CAPTURE_RESULT_DIALOG);
  state = captureResultDialogReducer(state, { type: "session-completed", completed: true, sessionId: 1 });
  assert.deepEqual(state, { open: true, sessionId: 1 });
  state = captureResultDialogReducer(state, { type: "close" });
  assert.deepEqual(state, { open: false, sessionId: 1 });
  assert.equal(captureResultDialogReducer(state, { type: "session-completed", completed: true, sessionId: 1 }), state);
  state = captureResultDialogReducer(state, { type: "reopen" });
  assert.deepEqual(state, { open: true, sessionId: 1 });
  assert.deepEqual(captureResultDialogReducer(state, { type: "reset" }), INITIAL_CAPTURE_RESULT_DIALOG);
});
test("camera permissions and stream ownership stay in the camera hook with cleanup paths", () => {
  const cameraHook = fs.readFileSync(path.join(root, "src/hooks/useCamera.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
  assert.match(cameraHook, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(cameraHook, /NotAllowedError/);
  assert.match(cameraHook, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(cameraHook, /return\s*\(\)\s*=>\s*\{/);
  assert.doesNotMatch(app, /getUserMedia/);
});

test("capture sequence takes four shots after countdown and stops promptly on cancellation", async () => {
  const photos = [], countdown = [];
  const complete = await runCaptureSequence({
    capture: (index) => ({ index }), wait: async () => true,
    onCountdown: (value) => countdown.push(value), onFlash() {}, onPhoto: (next) => photos.splice(0, photos.length, ...next),
  });
  assert.equal(complete.cancelled, false);
  assert.deepEqual(complete.captured.map((photo) => photo.index), [0, 1, 2, 3]);
  assert.deepEqual(photos, complete.captured);
  assert.equal(countdown.filter((value) => value === 3).length, 4);

  let waits = 0, captured = 0;
  const cancelled = await runCaptureSequence({
    capture: () => { captured += 1; return {}; }, wait: async () => ++waits < 2,
    onCountdown() {}, onFlash() {}, onPhoto() {},
  });
  assert.equal(cancelled.cancelled, true);
  assert.equal(captured, 0);
});

test("capture sequence uses the selected count and emits only valid photo slots", async () => {
  for (const photoCount of PHOTO_COUNTS) {
    const photoUpdates = [];
    const result = await runCaptureSequence({
      photoCount,
      capture: (index) => ({ index }),
      wait: async () => true,
      onCountdown() {},
      onFlash() {},
      onPhoto: (photos) => photoUpdates.push(photos.length),
    });
    assert.equal(result.cancelled, false);
    assert.equal(result.captured.length, photoCount);
    assert.deepEqual(result.captured.map((photo) => photo.index), Array.from({ length: photoCount }, (_, index) => index));
    assert.deepEqual(photoUpdates, Array.from({ length: photoCount }, (_, index) => index + 1));
  }
});

test("retake countdown captures one replacement and preserves the other photo slots", async () => {
  const shots = [
    createPhotoModel("one", "photo-1"),
    updatePhotoEdits(
      [createPhotoModel("old-two", "photo-2", "warm")],
      "photo-2",
      { brightness: 125, cropX: 18 },
    )[0],
    createPhotoModel("three", "photo-3"),
    createPhotoModel("four", "photo-4"),
  ];
  const countdown = [], flashes = [], waits = [];
  let captures = 0;
  const result = await runRetakeSequence({
    capture: () => { captures += 1; return { id: "photo-2", original: "new-two" }; },
    wait: async (duration) => { waits.push(duration); return true; },
    onCountdown: (value) => countdown.push(value),
    onFlash: (value) => flashes.push(value),
  });
  const replaced = replaceCapturedPhoto(shots, "photo-2", result.photo);

  assert.equal(result.cancelled, false);
  assert.equal(captures, 1);
  assert.deepEqual(waits, [850, 850, 850, 160]);
  assert.deepEqual(countdown, [3, 2, 1, "SMILE", null]);
  assert.deepEqual(flashes, [true, false]);
  assert.equal(replaced.length, 4);
  assert.deepEqual(replaced.map((photo) => photo.id), shots.map((photo) => photo.id));
  assert.equal(replaced[1].original, "new-two");
  assert.deepEqual(replaced[1].edits, shots[1].edits);
  assert.equal(replaced[0], shots[0]);
  assert.equal(replaced[2], shots[2]);
  assert.equal(replaced[3], shots[3]);
  assert.equal(shots[1].original, "old-two");
});

test("cancelled retake never replaces the existing photo", async () => {
  const shots = [{ id: "photo-1", original: "old" }];
  let waits = 0, captures = 0;
  const result = await runRetakeSequence({
    capture: () => { captures += 1; return { id: "photo-1", original: "new" }; },
    wait: async () => ++waits < 2,
    onCountdown() {},
    onFlash() {},
  });

  assert.equal(result.cancelled, true);
  assert.equal(captures, 0);
  assert.equal(shots[0].original, "old");
});
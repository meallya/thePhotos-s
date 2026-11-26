import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { capturePhoto, captureSnapshot, FRAME_PAPER_COLORS } from "../src/lib/photobooth.js";
import { runCaptureSequence, runRetakeSequence } from "../src/lib/photoboothSession.js";
import { isTorchSupported, setStreamTorch } from "../src/hooks/useCamera.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("captureSnapshot mirrors front camera when mirrored=true and keeps rear camera unmirrored when mirrored=false", () => {
  const oldDocument = globalThis.document;
  const calls = [];
  const context = {
    translate(x, y) { calls.push(["translate", x, y]); },
    scale(x, y) { calls.push(["scale", x, y]); },
    drawImage() { calls.push(["drawImage"]); },
  };
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toDataURL: () => "data:image/jpeg;base64,test",
    }),
  };

  try {
    const video = { videoWidth: 1280, videoHeight: 960 };
    captureSnapshot(video, { mirrored: true });
    assert.deepEqual(calls, [["translate", 1280, 0], ["scale", -1, 1], ["drawImage"]]);

    calls.length = 0;
    const rearPhoto = capturePhoto(video, "rear-1", "natural", { mirrored: false });
    assert.equal(rearPhoto.id, "rear-1");
    assert.deepEqual(calls, [["drawImage"]]);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test("torch helpers inspect getCapabilities and handle applyConstraints safely", async () => {
  assert.equal(isTorchSupported(null), false);
  assert.equal(isTorchSupported({ getVideoTracks: () => [{}] }), false);
  assert.equal(
    isTorchSupported({ getVideoTracks: () => [{ getCapabilities: () => ({ torch: false }) }] }),
    false,
  );
  assert.equal(
    isTorchSupported({ getVideoTracks: () => [{ getCapabilities: () => ({ torch: true }) }] }),
    true,
  );

  const constraintsApplied = [];
  const supportedStream = {
    getVideoTracks: () => [{
      getCapabilities: () => ({ torch: true }),
      applyConstraints: async (constraints) => { constraintsApplied.push(constraints); },
    }],
  };
  assert.equal(await setStreamTorch(supportedStream, true), true);
  assert.equal(await setStreamTorch(supportedStream, false), true);
  assert.deepEqual(constraintsApplied, [
    { advanced: [{ torch: true }] },
    { advanced: [{ torch: false }] },
  ]);

  const failingStream = {
    getVideoTracks: () => [{
      getCapabilities: () => ({ torch: true }),
      applyConstraints: async () => { throw new Error("Torch busy"); },
    }],
  };
  assert.equal(await setStreamTorch(failingStream, true), false);

  const unsupportedStream = {
    getVideoTracks: () => [{
      getCapabilities: () => ({}),
      applyConstraints: async () => { throw new Error("Should not be called"); },
    }],
  };
  assert.equal(await setStreamTorch(unsupportedStream, true), false);
});

test("screen flash runs before capture when flashEnabled is true and stays off when flashEnabled is false", async () => {
  const events = [];
  const activeResult = await runRetakeSequence({
    flashEnabled: true,
    useScreenFlash: true,
    wait: async (duration) => { events.push(["wait", duration]); return true; },
    capture: () => { events.push(["capture"]); return { id: "photo-1" }; },
    onCountdown: (value) => events.push(["countdown", value]),
    onFlash: (value) => events.push(["flash", value]),
    onScreenFlash: (value) => events.push(["screenFlash", value]),
    onShutter: (value) => events.push(["shutter", value]),
  });

  assert.equal(activeResult.cancelled, false);
  const screenOnIdx = events.findIndex(([k, v]) => k === "screenFlash" && v === true);
  const screenOffIdx = events.findIndex(([k, v]) => k === "screenFlash" && v === false);
  const captureIdx = events.findIndex(([k]) => k === "capture");
  assert.ok(screenOnIdx >= 0 && screenOffIdx > screenOnIdx && captureIdx > screenOffIdx);

  const offEvents = [];
  const offResult = await runCaptureSequence({
    photoCount: 2,
    flashEnabled: false,
    useScreenFlash: false,
    wait: async () => true,
    capture: (index) => { offEvents.push(["capture", index]); return { id: "p-" + index }; },
    onCountdown: (value) => offEvents.push(["countdown", value]),
    onFlash: (value) => offEvents.push(["flash", value]),
    onScreenFlash: (value) => offEvents.push(["screenFlash", value]),
    onShutter: (value) => offEvents.push(["shutter", value]),
    onPhoto: () => {},
  });

  assert.equal(offResult.cancelled, false);
  assert.equal(offEvents.some(([k, v]) => k === "screenFlash" && v === true), false);
  assert.equal(offEvents.some(([k, v]) => k === "flash" && v === true), false);
  assert.equal(offEvents.filter(([k]) => k === "capture").length, 2);
});

test("camera modal implements flip button, D-pad flash button, mirroring rules, and numeric status display", () => {
  const useCamera = read("src/hooks/useCamera.js");
  const retroCamera = read("src/components/RetroCamera.jsx");
  const retroCss = read("src/styles/retroCamera.css");
  const page = read("src/components/PhotoboothPage.jsx");
  const pageCss = read("src/styles/photobooth.css");
  const app = read("src/App.jsx");

  assert.match(useCamera, /facingModeRef = useRef\("user"\)/);
  assert.match(useCamera, /flipCamera = useCallback/);
  assert.match(useCamera, /releaseStream\(previousStream\)/);
  assert.match(useCamera, /OverconstrainedError/);
  assert.match(useCamera, /applyConstraints\(\{ advanced: \[\{ torch: Boolean\(enabled\) \}\] \}\)/);

  assert.match(retroCamera, /className=\{\s*"retro-camera-flip-button"/);
  assert.match(retroCamera, /className=\{\s*"retro-camera-dpad-flash"/);
  assert.doesNotMatch(retroCamera, /retro-camera-flash-icon/);
  assert.match(retroCss, /\.retro-camera-video\s*\{[^}]*transform:\s*scaleX\(-1\)/s);
  assert.match(retroCss, /\.retro-camera\.is-environment \.retro-camera-video\s*\{[^}]*transform:\s*scaleX\(1\)/s);
  assert.match(retroCss, /\.retro-camera-flip-button\s*\{/);
  assert.match(retroCss, /\.retro-camera-dpad-flash\s*\{/);

  assert.match(app, /const \[flashEnabled, setFlashEnabled\] = useState\(false\)/);
  assert.match(app, /syncTorch\(cameraOn && flashEnabled\)/);

  assert.match(page, /function CameraStatusNumber/);
  assert.match(page, /className="camera-popup-controls"[\s\S]*?<CameraStatusNumber/);
  assert.doesNotMatch(page, /✳/);
  assert.match(page, /className=\{[\s\S]*?"camera-screen-flash"/);
  assert.match(pageCss, /\.camera-status-number\s*\{/);
  assert.match(pageCss, /\.camera-screen-flash\s*\{/);
});

test("filter section provides 12 paper colors, responsive 3-col mobile grid, non-overlapping badge, and rectangular 44px color picker", () => {
  const pageCss = read("src/styles/photobooth.css");
  const stylesCss = read("src/styles.css");

  assert.equal(FRAME_PAPER_COLORS.length, 12);
  assert.doesNotMatch(stylesCss, /\.app-shell \.paper-color-option/);

  const baseGridIndex = pageCss.indexOf(".paper-color-options { display: grid; grid-template-columns: repeat(5");
  const afterBaseBlock = pageCss.slice(baseGridIndex);
  assert.ok(baseGridIndex !== -1);
  assert.match(afterBaseBlock, /@media\(max-width:650px\)\s*\{[^}]*\.paper-color-options\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(afterBaseBlock, /@media\(max-width:650px\)\s*\{[\s\S]*?\.frame-paper-custom-color\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  assert.match(pageCss, /\.paper-color-option\s*\{[^}]*padding:\s*24px\s+6px\s+10px;[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(pageCss, /\.paper-color-option\.selected::after\s*\{[^}]*position:\s*absolute;\s*top:\s*4px;\s*right:\s*4px;\s*width:\s*16px;\s*height:\s*16px;/s);

  assert.match(pageCss, /\.frame-paper-color-picker input\s*\{[^}]*width:\s*100%;\s*height:\s*44px;[^}]*border-radius:\s*6px;[^}]*-webkit-appearance:\s*none;\s*appearance:\s*none;\s*box-sizing:\s*border-box/s);
  assert.match(pageCss, /\.frame-paper-color-picker input::-webkit-color-swatch-wrapper\s*\{[^}]*padding:\s*0;\s*border:\s*none;\s*border-radius:\s*6px/s);
  assert.match(pageCss, /\.frame-paper-color-picker input::-webkit-color-swatch\s*\{[^}]*border:\s*none;\s*border-radius:\s*4px/s);
});

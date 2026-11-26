import {
  normalizePhotoCount,
  normalizePhotoEdits,
  shotCount,
} from "./photobooth.js";

export const countdownValues = Object.freeze([3, 2, 1]);

async function executeShutterAndCapture({
  wait,
  capture,
  photoIndex,
  flashEnabled,
  useScreenFlash = false,
  onCountdown,
  onFlash,
  onScreenFlash,
  onShutter,
}) {
  onCountdown("SMILE");

  const resolvedFlash = typeof flashEnabled === "function" ? flashEnabled() : flashEnabled;
  const resolvedScreenFlash = typeof useScreenFlash === "function" ? useScreenFlash() : useScreenFlash;

  if (resolvedFlash === undefined) {
    onFlash(true);
    if (!(await wait(160))) {
      onFlash(false);
      onCountdown(null);
      return { photo: null, cancelled: true };
    }
    const photo = capture(photoIndex);
    onFlash(false);
    onCountdown(null);
    return { photo, cancelled: false };
  }

  if (resolvedFlash) {
    if (resolvedScreenFlash) {
      onScreenFlash?.(true);
      if (!(await wait(220))) {
        onScreenFlash?.(false);
        onFlash(false);
        onCountdown(null);
        return { photo: null, cancelled: true };
      }
      onScreenFlash?.(false);
      if (!(await wait(110))) {
        onFlash(false);
        onCountdown(null);
        return { photo: null, cancelled: true };
      }
    }

    onFlash(true);
    if (!(await wait(160))) {
      onFlash(false);
      onCountdown(null);
      return { photo: null, cancelled: true };
    }

    const photo = capture(photoIndex);
    onFlash(false);
    onCountdown(null);
    return { photo, cancelled: false };
  }

  onScreenFlash?.(false);
  onFlash(false);
  onShutter?.(true);
  if (!(await wait(160))) {
    onShutter?.(false);
    onCountdown(null);
    return { photo: null, cancelled: true };
  }

  const photo = capture(photoIndex);
  onShutter?.(false);
  onCountdown(null);
  return { photo, cancelled: false };
}

export async function runRetakeSequence({
  capture,
  wait,
  onCountdown,
  onFlash,
  flashEnabled,
  useScreenFlash = false,
  onScreenFlash,
  onShutter,
}) {
  for (const number of countdownValues) {
    onCountdown(number);
    if (!(await wait(850))) return { photo: null, cancelled: true };
  }

  return executeShutterAndCapture({
    wait,
    capture,
    photoIndex: 0,
    flashEnabled,
    useScreenFlash,
    onCountdown,
    onFlash,
    onScreenFlash,
    onShutter,
  });
}

export function replaceCapturedPhoto(shots, photoId, replacement) {
  return shots.map((photo) =>
    photo.id === photoId
      ? { ...replacement, edits: normalizePhotoEdits(photo.edits) }
      : photo,
  );
}

export async function runCaptureSequence({
  photoCount = shotCount,
  capture,
  wait,
  onCountdown,
  onFlash,
  onPhoto,
  flashEnabled,
  useScreenFlash = false,
  onScreenFlash,
  onShutter,
}) {
  const captured = [];
  const requestedPhotoCount = normalizePhotoCount(photoCount);

  for (let photoIndex = 0; photoIndex < requestedPhotoCount; photoIndex += 1) {
    for (const number of countdownValues) {
      onCountdown(number);
      if (!(await wait(850))) return { captured, cancelled: true };
    }

    const result = await executeShutterAndCapture({
      wait,
      capture,
      photoIndex,
      flashEnabled,
      useScreenFlash,
      onCountdown,
      onFlash,
      onScreenFlash,
      onShutter,
    });
    if (result.cancelled) return { captured, cancelled: true };

    if (result.photo) captured.push(result.photo);
    onPhoto(captured.slice());

    if (photoIndex < requestedPhotoCount - 1 && !(await wait(750))) return { captured, cancelled: true };
  }

  return { captured, cancelled: false };
}



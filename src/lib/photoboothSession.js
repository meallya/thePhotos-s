import {
  normalizePhotoCount,
  normalizePhotoEdits,
  shotCount,
} from "./photobooth.js";

export const countdownValues = Object.freeze([3, 2, 1]);

export async function runRetakeSequence({ capture, wait, onCountdown, onFlash }) {
  for (const number of countdownValues) {
    onCountdown(number);
    if (!(await wait(850))) return { photo: null, cancelled: true };
  }

  onCountdown("SMILE");
  onFlash(true);
  if (!(await wait(160))) {
    onFlash(false);
    onCountdown(null);
    return { photo: null, cancelled: true };
  }

  const photo = capture();
  onFlash(false);
  onCountdown(null);
  return { photo, cancelled: false };
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
}) {
  const captured = [];
  const requestedPhotoCount = normalizePhotoCount(photoCount);

  for (let photoIndex = 0; photoIndex < requestedPhotoCount; photoIndex += 1) {
    for (const number of countdownValues) {
      onCountdown(number);
      if (!(await wait(850))) return { captured, cancelled: true };
    }

    onCountdown("SMILE");
    onFlash(true);
    if (!(await wait(160))) return { captured, cancelled: true };

    const photo = capture(photoIndex);
    if (photo) captured.push(photo);
    onPhoto(captured.slice());
    onFlash(false);
    onCountdown(null);

    if (photoIndex < requestedPhotoCount - 1 && !(await wait(750))) return { captured, cancelled: true };
  }

  return { captured, cancelled: false };
}



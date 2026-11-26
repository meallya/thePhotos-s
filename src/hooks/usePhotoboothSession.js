import { useCallback, useEffect, useRef, useState } from "react";
import {
  capturePhoto,
  normalizePhotoCount,
  normalizePhotoEdits,
  resetPhotoEdits as resetPhotoEditModel,
  shotCount,
  updatePhotoEdits as applyPhotoEdits,
} from "../lib/photobooth.js";
import {
  replaceCapturedPhoto as replaceShot,
  runCaptureSequence,
  runRetakeSequence,
} from "../lib/photoboothSession.js";

export default function usePhotoboothSession({
  mirrored = true,
  flashEnabled = false,
  torchActive = false,
} = {}) {
  const [shots, setShots] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [taking, setTaking] = useState(false);
  const [developing, setDeveloping] = useState(false);
  const [flash, setFlash] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [shutter, setShutter] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [capturedAt, setCapturedAt] = useState(null);
  const sessionRef = useRef(0);
  const takingRef = useRef(false);
  const timersRef = useRef(new Set());
  const optionsRef = useRef({ mirrored, flashEnabled, torchActive });

  useEffect(() => {
    optionsRef.current = { mirrored, flashEnabled, torchActive };
  }, [mirrored, flashEnabled, torchActive]);

  const cancelPendingWaits = useCallback(() => {
    for (const entry of timersRef.current) {
      clearTimeout(entry.timer);
      entry.resolve(false);
    }
    timersRef.current.clear();
  }, []);

  const wait = useCallback((duration, sessionId) => new Promise((resolve) => {
    const entry = { timer: null, resolve };
    entry.timer = setTimeout(() => {
      timersRef.current.delete(entry);
      resolve(sessionRef.current === sessionId);
    }, duration);
    timersRef.current.add(entry);
  }), []);

  const cancelSession = useCallback(() => {
    sessionRef.current += 1;
    takingRef.current = false;
    cancelPendingWaits();
    setTaking(false);
    setCountdown(null);
    setFlash(false);
    setScreenFlash(false);
    setShutter(false);
    setDeveloping(false);
    setShowResult(false);
    setSessionError("");
    setCapturedAt(null);
  }, [cancelPendingWaits]);

  const resetSession = useCallback(() => {
    cancelSession();
    setShots([]);
  }, [cancelSession]);

  const updateShotEdits = useCallback((photoId, patch) => {
    setShots((current) => applyPhotoEdits(current, photoId, patch));
  }, []);

  const resetShotEdits = useCallback((photoId) => {
    setShots((current) => current.map((photo) =>
      photo.id === photoId ? resetPhotoEditModel(photo) : photo,
    ));
  }, []);

  const restoreShotEdits = useCallback((photoEdits) => {
    const editsById = new Map(photoEdits.map((entry) => [entry.id, entry.edits]));
    setShots((current) => current.map((photo) => {
      const edits = editsById.get(photo.id);
      return edits ? { ...photo, edits: normalizePhotoEdits(edits) } : photo;
    }));
  }, []);

  const runSession = useCallback(async (video, photoCount = shotCount) => {
    if (!video || takingRef.current) return false;

    const requestedPhotoCount = normalizePhotoCount(photoCount);
    const sessionId = ++sessionRef.current;
    takingRef.current = true;
    setShots([]);
    setSessionError("");
    setShowResult(false);
    setCapturedAt(new Date());
    setTaking(true);

    try {
      const { captured, cancelled } = await runCaptureSequence({
        photoCount: requestedPhotoCount,
        wait: (duration) => wait(duration, sessionId),
        capture: (photoIndex) =>
          capturePhoto(video, "photo-" + sessionId + "-" + (photoIndex + 1), "natural", {
            mirrored: optionsRef.current.mirrored,
          }),
        onCountdown: setCountdown,
        onFlash: setFlash,
        onScreenFlash: setScreenFlash,
        onShutter: setShutter,
        flashEnabled: () => optionsRef.current.flashEnabled,
        useScreenFlash: () => optionsRef.current.flashEnabled && !optionsRef.current.torchActive,
        onPhoto: setShots,
      });
      if (cancelled) return false;

      if (!captured.length) {
        setSessionError("The camera did not provide a frame. Please try again.");
        return false;
      }
      if (captured.length < requestedPhotoCount) {
        setSessionError("Some photos could not be captured. The strip will use the photos that succeeded.");
      }

      setDeveloping(true);
      if (!(await wait(2400, sessionId))) return false;
      setShowResult(true);
      return true;
    } catch (error) {
      if (sessionRef.current === sessionId) {
        setSessionError(error.message || "The photo session could not be completed.");
      }
      return false;
    } finally {
      if (sessionRef.current === sessionId) {
        takingRef.current = false;
        setTaking(false);
        setCountdown(null);
        setFlash(false);
        setScreenFlash(false);
        setShutter(false);
        setDeveloping(false);
      }
    }
  }, [wait]);

  const runRetake = useCallback(async (video, photoId) => {
    if (!video || !photoId || takingRef.current) return false;

    const sessionId = ++sessionRef.current;
    takingRef.current = true;
    setSessionError("");
    setTaking(true);

    try {
      const { photo, cancelled } = await runRetakeSequence({
        wait: (duration) => wait(duration, sessionId),
        capture: () =>
          capturePhoto(video, photoId, "natural", {
            mirrored: optionsRef.current.mirrored,
          }),
        onCountdown: setCountdown,
        onFlash: setFlash,
        onScreenFlash: setScreenFlash,
        onShutter: setShutter,
        flashEnabled: () => optionsRef.current.flashEnabled,
        useScreenFlash: () => optionsRef.current.flashEnabled && !optionsRef.current.torchActive,
      });
      if (cancelled) return false;
      if (!photo) {
        setSessionError("The camera did not provide a frame. Please try again.");
        return false;
      }

      setShots((current) => replaceShot(current, photoId, photo));
      return true;
    } catch (error) {
      if (sessionRef.current === sessionId) {
        setSessionError(error.message || "The photo could not be retaken.");
      }
      return false;
    } finally {
      if (sessionRef.current === sessionId) {
        takingRef.current = false;
        setTaking(false);
        setCountdown(null);
        setFlash(false);
        setScreenFlash(false);
        setShutter(false);
      }
    }
  }, [wait]);

  const cancelRetake = useCallback(() => {
    sessionRef.current += 1;
    takingRef.current = false;
    cancelPendingWaits();
    setTaking(false);
    setCountdown(null);
    setFlash(false);
    setScreenFlash(false);
    setShutter(false);
    setSessionError("");
  }, [cancelPendingWaits]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      takingRef.current = false;
      cancelPendingWaits();
    };
  }, [cancelPendingWaits]);

  return {
    shots,
    countdown,
    taking,
    developing,
    flash,
    screenFlash,
    shutter,
    showResult,
    sessionError,
    capturedAt,
    runSession,
    runRetake,
    cancelSession,
    cancelRetake,
    resetSession,
    updateShotEdits,
    resetShotEdits,
    restoreShotEdits,
  };
}

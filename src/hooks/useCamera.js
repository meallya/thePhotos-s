import { useCallback, useEffect, useRef, useState } from "react";

export function isTorchSupported(stream) {
  const track = stream?.getVideoTracks?.()?.[0];
  if (!track || typeof track.getCapabilities !== "function") return false;
  try {
    const capabilities = track.getCapabilities();
    return Boolean(capabilities?.torch);
  } catch {
    return false;
  }
}

export async function setStreamTorch(stream, enabled) {
  const track = stream?.getVideoTracks?.()?.[0];
  if (!track || typeof track.applyConstraints !== "function") return false;
  if (!isTorchSupported(stream)) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    return true;
  } catch {
    return false;
  }
}

function buildVideoConstraints(facingMode, exact = false) {
  return {
    video: {
      facingMode: exact ? { exact: facingMode } : facingMode,
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
    audio: false,
  };
}

function getCameraErrorMessage(error, { isFlip = false, targetFacingMode = "user" } = {}) {
  if (error?.name === "NotAllowedError") {
    return "Camera permission was blocked. Allow camera access in your browser settings.";
  }
  if (isFlip && (error?.name === "OverconstrainedError" || error?.name === "NotFoundError")) {
    return targetFacingMode === "environment"
      ? "Back camera is not available on this device."
      : "Front camera is not available on this device.";
  }
  if (isFlip) {
    return "Could not switch camera. Check that it is available and not being used by another app.";
  }
  return "Could not open the camera. Check that it is connected and not being used by another app.";
}

export default function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);
  const openingRef = useRef(false);
  const mountedRef = useRef(false);
  const facingModeRef = useRef("user");
  const torchActiveRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("user");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchActive, setTorchActive] = useState(false);

  const releaseStream = useCallback((stream) => {
    if (!stream) return;
    if (torchActiveRef.current) {
      torchActiveRef.current = false;
      if (mountedRef.current) setTorchActive(false);
      void setStreamTorch(stream, false);
    }
    stream.getTracks().forEach((track) => track.stop());

    const video = videoRef.current;
    if (video && video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    openingRef.current = false;
    const stream = streamRef.current;
    streamRef.current = null;
    releaseStream(stream);
    setCameraOn(false);
    setCameraOpening(false);
    setTorchSupported(false);
    setTorchActive(false);
    torchActiveRef.current = false;
  }, [releaseStream]);

  const openStream = useCallback(async (targetFacingMode, { exact = false, preserveError = false } = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!preserveError && mountedRef.current) {
        setCameraError("Camera access needs HTTPS or localhost, and a supported browser.");
      }
      return { ok: false, error: null };
    }

    const requestId = ++requestRef.current;
    const video = videoRef.current;
    openingRef.current = true;
    setCameraOpening(true);
    if (!preserveError) setCameraError("");
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(
        buildVideoConstraints(targetFacingMode, exact),
      );

      if (!mountedRef.current || requestId !== requestRef.current || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return { ok: false, error: null };
      }

      streamRef.current = stream;
      const handleTrackEnded = () => {
        if (streamRef.current !== stream) return;
        requestRef.current += 1;
        openingRef.current = false;
        torchActiveRef.current = false;
        if (mountedRef.current) {
          setCameraOpening(false);
          setTorchSupported(false);
          setTorchActive(false);
        }
        streamRef.current = null;
        stream.getTracks().forEach((track) => {
          if (track.readyState === "live") track.stop();
        });
        if (video.srcObject === stream) {
          video.pause();
          video.srcObject = null;
        }
        if (mountedRef.current) {
          setCameraOn(false);
          setCameraError("The camera disconnected. Check the device and reopen the camera.");
        }
      };

      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", handleTrackEnded, { once: true });
      });

      video.srcObject = stream;
      await video.play();
      if (!mountedRef.current || requestId !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject === stream) video.srcObject = null;
        if (streamRef.current === stream) streamRef.current = null;
        return { ok: false, error: null };
      }

      facingModeRef.current = targetFacingMode;
      setFacingMode(targetFacingMode);
      setTorchSupported(isTorchSupported(stream));
      setTorchActive(false);
      torchActiveRef.current = false;
      setCameraOn(true);
      return { ok: true, error: null };
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (video?.srcObject === stream) video.srcObject = null;
      return { ok: false, error };
    } finally {
      if (requestId === requestRef.current) {
        openingRef.current = false;
        if (mountedRef.current) setCameraOpening(false);
      }
    }
  }, []);

  const startCamera = useCallback(async (requestedFacingMode = facingModeRef.current) => {
    if (openingRef.current || streamRef.current) return Boolean(streamRef.current);
    const targetMode = requestedFacingMode === "environment" ? "environment" : "user";
    const result = await openStream(targetMode, { exact: targetMode === "environment" });
    if (!result.ok && result.error && mountedRef.current) {
      setCameraError(getCameraErrorMessage(result.error, { isFlip: false, targetFacingMode: targetMode }));
    }
    return result.ok;
  }, [openStream]);

  const flipCamera = useCallback(async () => {
    if (openingRef.current) return false;

    const previousFacingMode = facingModeRef.current;
    const nextFacingMode = previousFacingMode === "user" ? "environment" : "user";

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera switching is not supported in this browser.");
      return false;
    }

    if (!streamRef.current) {
      facingModeRef.current = nextFacingMode;
      setFacingMode(nextFacingMode);
      setCameraError("");
      return true;
    }

    const previousStream = streamRef.current;
    streamRef.current = null;
    releaseStream(previousStream);
    setCameraOn(false);
    setTorchSupported(false);

    const switchResult = await openStream(nextFacingMode, { exact: true });
    if (switchResult.ok) return true;

    const errorMessage = getCameraErrorMessage(switchResult.error, {
      isFlip: true,
      targetFacingMode: nextFacingMode,
    });
    if (mountedRef.current) setCameraError(errorMessage);

    const recovered = await openStream(previousFacingMode, {
      exact: previousFacingMode === "environment",
      preserveError: true,
    });
    if (!recovered.ok && previousFacingMode === "environment") {
      await openStream("user", { exact: false, preserveError: true });
    }
    return false;
  }, [openStream, releaseStream]);

  const syncTorch = useCallback(async (enabled) => {
    const stream = streamRef.current;
    if (!stream) {
      torchActiveRef.current = false;
      if (mountedRef.current) setTorchActive(false);
      return false;
    }

    if (!enabled) {
      if (!torchActiveRef.current) return false;
      torchActiveRef.current = false;
      if (mountedRef.current) setTorchActive(false);
      await setStreamTorch(stream, false);
      return false;
    }

    if (!isTorchSupported(stream)) {
      torchActiveRef.current = false;
      if (mountedRef.current) setTorchActive(false);
      return false;
    }

    const applied = await setStreamTorch(stream, true);
    torchActiveRef.current = applied;
    if (mountedRef.current) setTorchActive(applied);
    return applied;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      const stream = streamRef.current;
      streamRef.current = null;
      if (torchActiveRef.current) {
        torchActiveRef.current = false;
        void setStreamTorch(stream, false);
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
    };
  }, []);

  return {
    videoRef,
    cameraOn,
    cameraOpening,
    cameraError,
    facingMode,
    torchSupported,
    torchActive,
    startCamera,
    stopCamera,
    flipCamera,
    syncTorch,
  };
}

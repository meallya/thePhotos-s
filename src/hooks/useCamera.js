import { useCallback, useEffect, useRef, useState } from "react";

export default function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);
  const openingRef = useRef(false);
  const mountedRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    openingRef.current = false;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());

    const video = videoRef.current;
    if (video && video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
    setCameraOn(false);
    setCameraOpening(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (openingRef.current || streamRef.current) return Boolean(streamRef.current);
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access needs HTTPS or localhost, and a supported browser.");
      return false;
    }

    const requestId = ++requestRef.current;
    const video = videoRef.current;
    openingRef.current = true;
    setCameraOpening(true);
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      if (!mountedRef.current || requestId !== requestRef.current || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      streamRef.current = stream;
      const handleTrackEnded = () => {
        if (streamRef.current !== stream) return;
        requestRef.current += 1;
        openingRef.current = false;
        if (mountedRef.current) setCameraOpening(false);
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
        return false;
      }

      setCameraOn(true);
      return true;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (video?.srcObject === stream) video.srcObject = null;
      if (mountedRef.current) {
        setCameraError(
          error.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access in your browser settings."
            : "Could not open the camera. Check that it is connected and not being used by another app.",
        );
      }
      return false;
    } finally {
      if (requestId === requestRef.current) {
        openingRef.current = false;
        if (mountedRef.current) setCameraOpening(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      const stream = streamRef.current;
      streamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
    };
  }, []);

  return { videoRef, cameraOn, cameraOpening, cameraError, startCamera, stopCamera };
}
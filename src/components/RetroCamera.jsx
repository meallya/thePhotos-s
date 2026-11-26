import { useEffect, useState } from "react";
import cameraFrame from "../assets/camera-frame.png";
import { shotCount } from "../lib/photobooth.js";

export default function RetroCamera({ videoRef, cameraOn, cameraOpening = false, countdown, taking, flash, shots, photoCount = shotCount, filterStyle, retakeIndex = null }) {
  const latestPhoto = shots.at(-1) ?? null;
  const [briefPreview, setBriefPreview] = useState(null);

  useEffect(() => {
    if (!taking || !latestPhoto) {
      setBriefPreview(null);
      return undefined;
    }

    setBriefPreview(latestPhoto);
    const timer = window.setTimeout(() => setBriefPreview(null), 620);
    return () => window.clearTimeout(timer);
  }, [latestPhoto?.id, taking]);

  const capturedPreview = !cameraOn ? latestPhoto : briefPreview;

  return (
    <div className={"retro-camera " + (flash ? "is-flashing " : "") + (cameraOn ? "is-camera-on " : "") + (cameraOpening ? "is-opening" : "")} role="region" aria-label="Retro camera viewfinder">
      <div className="retro-camera-screen">
        <video ref={videoRef} autoPlay playsInline muted aria-label="Live mirrored camera preview"
          aria-hidden={!cameraOn || Boolean(capturedPreview)} className={"retro-camera-video " + (cameraOn && !capturedPreview ? "is-visible" : "")}
          style={{ filter: filterStyle }} />
        {capturedPreview && <img className="retro-camera-captured" src={capturedPreview.original}
          alt="Most recently captured photo" style={{ filter: filterStyle }} />}
        {!cameraOn && !capturedPreview && (
          <div className="retro-camera-placeholder">
            <span>YOUR MOMENT GOES HERE</span>
            <small>Find a little light. We'll take it from here.</small>
          </div>
        )}
        {cameraOpening && (
          <div className="retro-camera-startup" role="status" aria-live="polite">
            POWERING ON
          </div>
        )}
        <div className="retro-camera-hud retro-camera-hud-top" aria-hidden="true">
          <span>TP - 001</span><span><i /> REC <b>HD</b></span>
        </div>
        {countdown !== null && <div className="retro-camera-countdown" role="status" aria-live="assertive" aria-atomic="true">{countdown}</div>}
        {taking && countdown === null && <div className="retro-camera-progress" role="status" aria-live="polite">PHOTO {retakeIndex ?? shots.length + 1} / {photoCount}</div>}
        <div className="retro-camera-hud retro-camera-hud-bottom" aria-hidden="true">
          <span>AUTO</span><span>KEEP THIS ONE</span><span>ISO 400</span>
        </div>
      </div>
      <img className="retro-camera-overlay" src={cameraFrame} alt="" aria-hidden="true" draggable="false" />
    </div>
  );
}

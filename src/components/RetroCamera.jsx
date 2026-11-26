import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import cameraFrame from "../assets/camera-frame.png";
import { shotCount } from "../lib/photobooth.js";

export default function RetroCamera({
  videoRef,
  cameraOn,
  cameraOpening = false,
  facingMode = "user",
  flashEnabled = false,
  torchActive = false,
  countdown,
  taking,
  flash,
  shutter = false,
  shots,
  photoCount = shotCount,
  filterStyle,
  retakeIndex = null,
  onFlipCamera = () => {},
  onToggleFlash = () => {},
  cameraFlipDisabled = false,
  flashDisabled = false,
}) {
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
  const isEnvironment = facingMode === "environment";
  const showFlash = Boolean(flash && flashEnabled);
  const showShutter = Boolean(shutter && !showFlash);

  return (
    <div
      className={
        "retro-camera " +
        (isEnvironment ? "is-environment " : "is-user ") +
        (showFlash ? "is-flashing " : "") +
        (showShutter ? "is-shuttering " : "") +
        (cameraOn ? "is-camera-on " : "") +
        (cameraOpening ? "is-opening" : "")
      }
      role="region"
      aria-label="Retro camera viewfinder"
    >
      <div className="retro-camera-screen">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={
            isEnvironment
              ? "Live rear camera preview"
              : "Live mirrored front camera preview"
          }
          aria-hidden={!cameraOn || Boolean(capturedPreview)}
          className={
            "retro-camera-video " +
            (cameraOn && !capturedPreview ? "is-visible" : "")
          }
          style={{ filter: filterStyle }}
        />
        {capturedPreview && (
          <img
            className="retro-camera-captured"
            src={capturedPreview.original}
            alt="Most recently captured photo"
            style={{ filter: filterStyle }}
          />
        )}
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
          <span>TP - 001</span>
          {flashEnabled && (
            <span className="retro-camera-hud-flash">
              <Zap size={9} fill="currentColor" />
              {torchActive ? "TORCH" : "FLASH ON"}
            </span>
          )}
          <span>
            <i /> REC <b>HD</b>
          </span>
        </div>
        {countdown !== null && (
          <div
            className="retro-camera-countdown"
            role="status"
            aria-live="assertive"
            aria-atomic="true"
          >
            {countdown}
          </div>
        )}
        {taking && countdown === null && (
          <div className="retro-camera-progress" role="status" aria-live="polite">
            PHOTO {retakeIndex ?? shots.length + 1} / {photoCount}
          </div>
        )}
        <div className="retro-camera-hud retro-camera-hud-bottom" aria-hidden="true">
          <span>{isEnvironment ? "REAR" : "FRONT"}</span>
          <span>KEEP THIS ONE</span>
          <span>ISO 400</span>
        </div>
      </div>

      <img
        className="retro-camera-overlay"
        src={cameraFrame}
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      <button
        type="button"
        className={
          "retro-camera-flip-button" + (isEnvironment ? " is-rear" : "")
        }
        onClick={onFlipCamera}
        disabled={cameraFlipDisabled}
        aria-pressed={isEnvironment}
        aria-label={
          isEnvironment
            ? "Switch to front camera"
            : "Switch to back camera"
        }
        title={
          isEnvironment
            ? "Back camera active — tap to switch to front"
            : "Front camera active — tap to switch to back"
        }
      >
        <span className="retro-camera-flip-lamp" aria-hidden="true">
          <RefreshCw size={10} strokeWidth={2.4} />
        </span>
      </button>

      <button
        type="button"
        className={
          "retro-camera-dpad-flash" + (flashEnabled ? " is-flash-on" : "")
        }
        onClick={onToggleFlash}
        disabled={flashDisabled}
        aria-pressed={flashEnabled}
        aria-label={flashEnabled ? "Turn flash off" : "Turn flash on"}
        title={
          flashEnabled
            ? "Flash On — tap to turn off"
            : "Flash Off — tap to turn on"
        }
      >
        <span className="retro-camera-dpad-flash-led" aria-hidden="true">
          <Zap size={9} fill={flashEnabled ? "currentColor" : "none"} />
        </span>
      </button>
    </div>
  );
}

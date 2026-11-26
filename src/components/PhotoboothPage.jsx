import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";
import { createPortal } from "react-dom";
import { PHOTO_COUNTS } from "../lib/photobooth.js";
import RetroCamera from "./RetroCamera.jsx";

function ShotCounter({ shots, photoCount }) {
  return (
    <div
      className="shot-counter"
      aria-label={shots.length + " of " + photoCount + " photos captured"}
    >
      {Array.from({ length: photoCount }, (_, index) => (
        <span key={index} className={index < shots.length ? "filled" : ""}>
          {index < shots.length ? "✳" : "0" + (index + 1)}
        </span>
      ))}
    </div>
  );
}

export default function PhotoboothPage({
  videoRef,
  cameraOn,
  cameraOpening,
  cameraError,
  countdown,
  taking,
  developing,
  flash,
  shots,
  photoCount,
  onPhotoCountChange,
  sessionError,
  filterStyle,
  retakeIndex,
  onCameraAction,
  onStopCamera,
  onCancelRetake,
  onCustomize,
  onNewSession,
  showResult,
}) {
  const busy = taking || developing || cameraOpening;
  const completedResultsVisible = showResult && !busy && retakeIndex === null;
  const photoCountLocked = busy || shots.length > 0;
  const [cameraPopupOpen, setCameraPopupOpen] = useState(false);
  const openCameraButtonRef = useRef(null);
  const closeCameraButtonRef = useRef(null);
  const closeCameraHandlerRef = useRef(null);

  const handleOpenCamera = () => {
    if (busy) return;
    setCameraPopupOpen(true);
    onCameraAction();
  };

  const handleCloseCamera = () => {
    setCameraPopupOpen(false);
    if (retakeIndex !== null) onCancelRetake();
    else onStopCamera();
  };

  closeCameraHandlerRef.current = handleCloseCamera;

  useEffect(() => {
    if (retakeIndex !== null) setCameraPopupOpen(true);
  }, [retakeIndex]);

  useEffect(() => {
    if (!cameraPopupOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeCameraButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCameraHandlerRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, [cameraPopupOpen]);

  return (
    <section className="photobooth-page" aria-label="Photobooth camera workflow">
      <div className="photobooth-layout">
        <section className="camera-panel" aria-labelledby="camera-panel-title">
          <div className="camera-heading">
            <div>
              <div className="section-kicker">STEP UP TO THE LENS</div>
              <h2 id="camera-panel-title" className="panel-title">
                Your little studio
              </h2>
            </div>
            <span className={"live-tag" + (cameraOn ? " is-live" : "")}>
              <i />
              {cameraOpening
                ? "PREPARING CAMERA"
                : cameraOn
                  ? "CAMERA READY"
                  : "STANDBY"}
            </span>
          </div>
          <div className="photo-count-selector">
            <label htmlFor="photo-count">PHOTOS PER SESSION</label>
            <select
              id="photo-count"
              value={photoCount}
              onChange={(event) =>
                onPhotoCountChange(Number(event.target.value))
              }
              disabled={photoCountLocked}
            >
              {PHOTO_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "photo" : "photos"}
                </option>
              ))}
            </select>
            {photoCountLocked && (
              <small>Start a new session to change the photo count.</small>
            )}
          </div>
          <div
            className="camera-idle-viewfinder"
            aria-hidden={cameraPopupOpen}
          >
            <div className="camera-idle-screen">
              <div>
                <span>YOUR MOMENT GOES HERE</span>
                <small>Open the camera when you're ready.</small>
              </div>
            </div>
          </div>
          {!cameraPopupOpen && (
            <div className="camera-controls">
              <ShotCounter shots={shots} photoCount={photoCount} />
              <button
                ref={openCameraButtonRef}
                type="button"
                className="capture-button"
                onClick={handleOpenCamera}
                disabled={busy}
              >
                <span className="capture-inner">
                  <Camera size={19} />
                </span>
                <span>OPEN CAMERA</span>
              </button>
            </div>
          )}

          {!cameraPopupOpen && (cameraError || sessionError) && (
            <p className="error-message camera-error" role="alert">
              {cameraError || sessionError}
            </p>
          )}
          {!cameraPopupOpen && !cameraOn && !cameraOpening && !cameraError && (
            <p className="permission-note">
              Your camera stays off until you open it. Photos are processed in
              your browser.
            </p>
          )}

          {completedResultsVisible && shots.length > 0 && (
            <div
              className="captured-row"
              aria-label="Captured photo previews"
              style={{
                gridTemplateColumns: `repeat(${shots.length}, minmax(0, 1fr))`,
              }}
            >
              {shots.map((photo, index) => (
                <img
                  key={photo.id}
                  src={photo.original}
                  alt={"Captured photo " + (index + 1)}
                />
              ))}
            </div>
          )}

          {shots.length > 0 &&
            !showResult &&
            retakeIndex === null &&
            !busy && (
              <button
                type="button"
                className="text-button start-new-session-button"
                onClick={onNewSession}
              >
                <RotateCcw size={14} /> START A NEW SESSION
              </button>
            )}

          {completedResultsVisible && (
            <div className="photobooth-return-actions">
              <button
                type="button"
                className="primary-button"
                onClick={onCustomize}
              >
                CONTINUE TO CUSTOMIZATION
              </button>
              <button
                type="button"
                className="text-button"
                onClick={onNewSession}
              >
                <RotateCcw size={14} /> START A NEW SESSION
              </button>
            </div>
          )}

          {createPortal(<div className="camera-popup-backdrop" hidden={!cameraPopupOpen}>
            <section
              className="camera-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="camera-popup-title"
            >
              <header className="camera-popup-heading">
                <div>
                  <div className="section-kicker">STEP INTO THE FRAME</div>
                  <h2 id="camera-popup-title">Your little photo booth</h2>
                  <p>
                    {retakeIndex !== null
                      ? "Let's give this moment another try."
                      : "The camera is only on while this window is open."}
                  </p>
                </div>
                <button
                  ref={closeCameraButtonRef}
                  type="button"
                  className="camera-popup-close"
                  onClick={handleCloseCamera}
                  aria-label={
                    retakeIndex !== null
                      ? "Cancel retake and close camera"
                      : "Close camera"
                  }
                >
                  <X size={19} />
                </button>
              </header>

              <RetroCamera
                videoRef={videoRef}
                cameraOn={cameraOn}
                cameraOpening={cameraOpening}
                countdown={countdown}
                taking={taking}
                flash={flash}
                shots={shots}
                photoCount={photoCount}
                filterStyle={filterStyle}
                retakeIndex={retakeIndex}
              />

              {retakeIndex !== null && (
                <p className="retake-note">
                  Retaking photo {String(retakeIndex).padStart(2, "0")} of{" "}
                  {String(photoCount).padStart(2, "0")}. Your other moments will
                  stay just as they are.
                </p>
              )}
              {(cameraError || sessionError) && (
                <p className="error-message camera-error" role="alert">
                  {cameraError || sessionError}
                </p>
              )}

              <div className="camera-popup-controls">
                <ShotCounter shots={shots} photoCount={photoCount} />
                <button
                  type="button"
                  className="capture-button"
                  onClick={onCameraAction}
                  disabled={busy || (cameraOn && retakeIndex !== null)}
                >
                  <span className="capture-inner">
                    {taking ? <span className="loader" /> : <Camera size={19} />}
                  </span>
                  <span>
                    {cameraOpening
                      ? "OPENING CAMERA"
                      : !cameraOn
                        ? "OPEN CAMERA"
                        : retakeIndex !== null
                          ? "PREPARING RETAKE"
                          : busy
                            ? "CAPTURING YOUR MOMENTS"
                            : "TAKE " +
                              photoCount +
                              (photoCount === 1 ? " PHOTO" : " PHOTOS")}
                  </span>
                </button>
              </div>
            </section>
          </div>, document.body)}
        </section>
      </div>
    </section>
  );
}

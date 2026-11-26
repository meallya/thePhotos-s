import { useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import DevelopingOverlay from "./components/DevelopingOverlay.jsx";
import PhotoCustomizationPage from "./components/PhotoCustomizationPage.jsx";
import PhotoboothHero from "./components/PhotoboothHero.jsx";
import PhotoboothPage from "./components/PhotoboothPage.jsx";
import SoundtrackPanel from "./components/SoundtrackPanel.jsx";
import UserTutorial from "./components/UserTutorial.jsx";
import useCamera from "./hooks/useCamera.js";
import usePhotoboothSession from "./hooks/usePhotoboothSession.js";
import {
  DEFAULT_FRAME_PAPER,
  DEFAULT_GLOBAL_FILTER,
  DEFAULT_STRIP_CONFIG,
  filters,
  frames,
  normalizeFramePaper,
  normalizeGlobalFilter,
  renderPhotoStrip,
  shotCount,
} from "./lib/photobooth.js";
import {
  isTutorialComplete,
  markTutorialComplete,
} from "./lib/tutorialStorage.js";

export default function App() {
  const tutorialTriggerRef = useRef(null);
  const {
    videoRef,
    cameraOn,
    cameraError,
    cameraOpening,
    facingMode,
    torchActive,
    startCamera,
    stopCamera,
    flipCamera,
    syncTorch,
  } = useCamera();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [page, setPage] = useState("photobooth");
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    try {
      return !isTutorialComplete(window.localStorage);
    } catch (error) {
      console.warn(
        "Could not read the tutorial preference from localStorage.",
        error,
      );
      return true;
    }
  });
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(shotCount);
  const [retakeTargetId, setRetakeTargetId] = useState(null);
  const retakeTargetRef = useRef(null);
  const retakeCameraRequestRef = useRef(false);
  const retakeRunningRef = useRef(false);
  const [frame, setFrame] = useState(frames[0]);
  const [framePaper, setFramePaper] = useState({ ...DEFAULT_FRAME_PAPER });
  const [globalFilter, setGlobalFilter] = useState({
    ...DEFAULT_GLOBAL_FILTER,
  });
  const filter =
    filters.find((item) => item.id === globalFilter.filterId) ?? filters[0];
  const [caption, setCaption] = useState("a little piece of today");
  const [stripConfig, setStripConfig] = useState({ ...DEFAULT_STRIP_CONFIG });
  const [selectedPhotoId, setSelectedPhotoId] = useState("");

  const finishTutorial = useCallback(() => {
    try {
      markTutorialComplete(window.localStorage);
    } catch (error) {
      console.warn(
        "Could not save the tutorial preference to localStorage.",
        error,
      );
    }
    setTutorialOpen(false);
  }, []);

  const {
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
    runSession: runPhotoSession,
    runRetake: runPhotoRetake,
    cancelSession,
    cancelRetake,
    resetSession,
    updateShotEdits,
    resetShotEdits,
  } = usePhotoboothSession({
    mirrored: facingMode !== "environment",
    flashEnabled,
    torchActive,
  });

  useEffect(() => {
    void syncTorch(cameraOn && flashEnabled);
  }, [cameraOn, facingMode, flashEnabled, syncTorch]);

  useEffect(() => {
    if (!shots.length) {
      setSelectedPhotoId("");
      return;
    }
    setSelectedPhotoId((current) =>
      shots.some((photo) => photo.id === current) ? current : shots[0].id,
    );
  }, [shots]);

  const [stripUrl, setStripUrl] = useState("");
  const [stripLoading, setStripLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedBlob, setExportedBlob] = useState(null);
  const [exportedFileName, setExportedFileName] = useState("");
  const [exportedPreviewUrl, setExportedPreviewUrl] = useState("");
  const [stripError, setStripError] = useState("");
  const stripRequestRef = useRef(0);
  const stripObjectUrlsRef = useRef(new Set());

  useEffect(() => {
    if (!exportedBlob) {
      setExportedPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(exportedBlob);
    setExportedPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [exportedBlob]);

  const invalidateStrip = useCallback(() => {
    stripRequestRef.current += 1;
    setStripUrl("");
    setStripLoading(false);
    setStripError("");
    setExportedBlob(null);
    setExportedFileName("");
  }, []);

  const renderStripBlob = useCallback(
    (scale) =>
      renderPhotoStrip({
        shots,
        frame,
        framePaper,
        caption: stripConfig.captionVisible === false ? "" : caption,
        capturedAt,
        config: { ...stripConfig, exportScale: scale },
        globalFilter,
      }),
    [shots, frame, framePaper, caption, capturedAt, stripConfig, globalFilter],
  );

  const makeStrip = useCallback(async () => {
    if (!shots.length) return null;
    const requestId = ++stripRequestRef.current;
    setStripLoading(true);
    setStripError("");
    try {
      const result = await renderStripBlob(1);
      if (requestId !== stripRequestRef.current) return null;
      const url = URL.createObjectURL(result.blob);
      stripObjectUrlsRef.current.add(url);
      setStripUrl(url);
      return url;
    } catch (error) {
      if (requestId === stripRequestRef.current) {
        setStripError(error.message || "Could not prepare the photo strip.");
      }
      return null;
    } finally {
      if (requestId === stripRequestRef.current) setStripLoading(false);
    }
  }, [shots.length, renderStripBlob]);

  useEffect(() => {
    if (!showResult || !shots.length) return undefined;
    const timer = window.setTimeout(() => void makeStrip(), 120);
    return () => window.clearTimeout(timer);
  }, [showResult, shots.length, makeStrip]);

  useEffect(
    () => () => {
      stripRequestRef.current += 1;
      stripObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      stripObjectUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    stripObjectUrlsRef.current.forEach((url) => {
      if (url !== stripUrl) {
        URL.revokeObjectURL(url);
        stripObjectUrlsRef.current.delete(url);
      }
    });
  }, [stripUrl]);

  useEffect(() => {
    if (!cameraOn && taking) {
      if (retakeTargetId) cancelRetake();
      else cancelSession();
    }
  }, [cameraOn, taking, retakeTargetId, cancelRetake, cancelSession]);

  useEffect(() => {
    if (page !== "photobooth" || !retakeTargetId) return;

    if (cameraOn) {
      retakeCameraRequestRef.current = false;
      if (retakeRunningRef.current) return;
      retakeRunningRef.current = true;
      const targetId = retakeTargetId;
      void runPhotoRetake(videoRef.current, targetId).then((completed) => {
        retakeRunningRef.current = false;
        if (retakeTargetRef.current !== targetId || !completed) return;
        retakeTargetRef.current = null;
        setRetakeTargetId(null);
        invalidateStrip();
        stopCamera();
        setPage("customize");
      });
      return;
    }

    if (cameraOpening || !retakeCameraRequestRef.current) return;
    retakeCameraRequestRef.current = false;
    void startCamera();
  }, [
    page,
    retakeTargetId,
    cameraOn,
    cameraOpening,
    runPhotoRetake,
    startCamera,
    stopCamera,
    invalidateStrip,
  ]);

  const updateFrame = (nextFrame) => {
    setFrame(nextFrame);
    setFramePaper((current) =>
      normalizeFramePaper({ ...current, paperColor: "palette" }),
    );
    invalidateStrip();
  };

  const updateFramePaper = (patch) => {
    setFramePaper((current) => normalizeFramePaper({ ...current, ...patch }));
    invalidateStrip();
  };

  const resetFramePaper = () => {
    setFramePaper({ ...DEFAULT_FRAME_PAPER });
    invalidateStrip();
  };

  const updateCaption = (nextCaption) => {
    setCaption(nextCaption);
    invalidateStrip();
  };

  const updateStripConfiguration = (nextConfig) => {
    setStripConfig(nextConfig);
    invalidateStrip();
  };

  const updatePhotoEdit = (photoId, patch) => {
    updateShotEdits(photoId, patch);
    invalidateStrip();
  };

  const handleResetShotEdits = (photoId) => {
    resetShotEdits(photoId);
    invalidateStrip();
  };

  const updateGlobalFilter = (patch) => {
    setGlobalFilter(
      normalizeGlobalFilter({
        filterId: patch.filterId,
        filterIntensity: 100,
      }),
    );
    invalidateStrip();
  };

  const runSession = async () => {
    if (cameraOpening || taking || developing) return;
    if (retakeTargetId) {
      if (!cameraOn) await startCamera();
      return;
    }
    if (!cameraOn) {
      await startCamera();
      return;
    }
    invalidateStrip();
    const completed = await runPhotoSession(
      videoRef.current,
      selectedPhotoCount,
    );
    if (completed) {
      stopCamera();
      setPage("customize");
    }
  };

  const handleStopCamera = () => {
    if (taking || developing) cancelSession();
    stopCamera();
  };

  const handleRetake = (photoId) => {
    if (taking || developing || !shots.some((photo) => photo.id === photoId))
      return;
    retakeTargetRef.current = photoId;
    retakeCameraRequestRef.current = true;
    setRetakeTargetId(photoId);
    setPage("photobooth");
  };

  const handleCancelRetake = () => {
    cancelRetake();
    retakeRunningRef.current = false;
    retakeCameraRequestRef.current = false;
    retakeTargetRef.current = null;
    setRetakeTargetId(null);
    stopCamera();
    setPage("customize");
  };

  const handleNewSession = () => {
    if (cameraOn || cameraOpening) stopCamera();
    if (retakeTargetId) cancelRetake();
    retakeTargetRef.current = null;
    retakeRunningRef.current = false;
    retakeCameraRequestRef.current = false;
    setRetakeTargetId(null);
    resetSession();
    invalidateStrip();
    setPage("photobooth");
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const saveStrip = async () => {
    if (exporting || stripLoading || !shots.length) return;
    if (exportedBlob) {
      setStripError("");
      try {
        downloadBlob(exportedBlob, exportedFileName);
      } catch (error) {
        setStripError(error.message || "Could not download the photo strip.");
      }
      return;
    }

    setExporting(true);
    setStripError("");
    try {
      const result = await renderStripBlob(stripConfig.exportScale);
      const fileName = "thephotos-" + Date.now() + ".png";
      downloadBlob(result.blob, fileName);
      setExportedBlob(result.blob);
      setExportedFileName(fileName);
    } catch (error) {
      setStripError(error.message || "Could not download the photo strip.");
    } finally {
      setExporting(false);
    }
  };

  const retakeIndex = retakeTargetId
    ? shots.findIndex((photo) => photo.id === retakeTargetId) + 1
    : null;

  return (
    <main id="top" className="app-shell">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <a className="wordmark" href="#top">
          <span className="wordmark-star" aria-hidden="true" /> thePhoto's
        </a>
        <div className="top-note">
          A LITTLE PHOTOBOOTH EXPERIENCE <span></span>
        </div>
        <div className="top-right">
          <span>MADE FOR YOUR MEMORIES</span>
          <button
            ref={tutorialTriggerRef}
            type="button"
            className="tutorial-trigger"
            onClick={() => setTutorialOpen(true)}
          >
            HOW TO USE
          </button>
        </div>
      </header>

      <UserTutorial
        open={tutorialOpen}
        onFinish={finishTutorial}
        returnFocusRef={tutorialTriggerRef}
      />

      {page === "photobooth" && <PhotoboothHero />}

      <div
        key="shared-soundtrack"
        className={
          "shared-soundtrack" +
          (page === "photobooth" ? " is-studio-split" : " is-customizing")
        }
      >
        <SoundtrackPanel />
        {page === "photobooth" && (
          <PhotoboothPage
            videoRef={videoRef}
            cameraOn={cameraOn}
            cameraOpening={cameraOpening}
            cameraError={cameraError}
            facingMode={facingMode}
            flashEnabled={flashEnabled}
            torchActive={torchActive}
            countdown={countdown}
            taking={taking}
            developing={developing}
            flash={flash}
            screenFlash={screenFlash}
            shutter={shutter}
            shots={shots}
            photoCount={selectedPhotoCount}
            onPhotoCountChange={setSelectedPhotoCount}
            sessionError={sessionError}
            filterStyle="none"
            retakeIndex={retakeIndex > 0 ? retakeIndex : null}
            onCameraAction={runSession}
            onFlipCamera={flipCamera}
            onToggleFlash={() => setFlashEnabled((current) => !current)}
            onStopCamera={handleStopCamera}
            onCancelRetake={handleCancelRetake}
            onCustomize={() => setPage("customize")}
            onNewSession={handleNewSession}
            showResult={showResult}
          />
        )}
      </div>

      {page === "customize" && (
        <PhotoCustomizationPage
          shots={shots}
          frame={frame}
          frames={frames}
          framePaper={framePaper}
          caption={caption}
          stripConfig={stripConfig}
          stripUrl={stripUrl}
          exportedPreviewUrl={exportedPreviewUrl}
          stripLoading={stripLoading}
          stripError={stripError}
          exporting={exporting}
          exportReady={Boolean(exportedBlob)}
          filter={filter}
          globalFilter={globalFilter}
          selectedPhotoId={selectedPhotoId}
          onBack={() => setPage("photobooth")}
          onNewSession={handleNewSession}
          onRetake={handleRetake}
          onFrameChange={updateFrame}
          onFramePaperChange={updateFramePaper}
          onFramePaperReset={resetFramePaper}
          onCaptionChange={updateCaption}
          onStripConfigChange={updateStripConfiguration}
          onFilterChange={updateGlobalFilter}
          onPhotoSelect={setSelectedPhotoId}
          onPhotoEdit={updatePhotoEdit}
          onPhotoReset={handleResetShotEdits}
          onRetryPreview={makeStrip}
          onExport={saveStrip}
        />
      )}

      {(developing || exporting) && (
        <DevelopingOverlay isExporting={exporting} />
      )}

      <footer className="footer">
        <span>thePhoto's © 2026</span>
        <span>
          MADE WITH LOVE <Heart size={11} fill="currentColor" />
        </span>
        <span>KEEP A COPY. KEEP A MEMORY.</span>
      </footer>
    </main>
  );
}

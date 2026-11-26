import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Download,
  Mail,
  MessageCircle,
  RotateCcw,
  X,
} from "lucide-react";
import FramePaperSettings from "./FramePaperSettings.jsx";
import GlobalFilterControls from "./GlobalFilterControls.jsx";
import PhotoEditor from "./PhotoEditor.jsx";
import PhotoStripPreview from "./PhotoStripPreview.jsx";
import StripSettings from "./StripSettings.jsx";

export default function PhotoCustomizationPage({
  shots,
  frame,
  frames,
  framePaper,
  caption,
  stripConfig,
  stripUrl,
  exportedPreviewUrl,
  stripLoading,
  stripError,
  exporting,
  exportReady,
  filter,
  globalFilter,
  selectedPhotoId,
  onBack,
  onNewSession,
  onRetake,
  onFrameChange,
  onFramePaperChange,
  onFramePaperReset,
  onCaptionChange,
  onStripConfigChange,
  onFilterChange,
  onPhotoSelect,
  onPhotoEdit,
  onPhotoReset,
  onRetryPreview,
  onExport,
}) {
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoPreviewDialogRef = useRef(null);
  const photoPreviewCloseRef = useRef(null);
  const viewPhotoButtonRef = useRef(null);
  const photoCount = shots.length;
  const momentsLabel =
    photoCount === 4
      ? "YOUR FOUR MOMENTS"
      : "YOUR " +
        photoCount +
        (photoCount === 1 ? " MOMENT" : " MOMENTS");

  useEffect(() => {
    if (!photoPreviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPhotoPreviewOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = photoPreviewDialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    photoPreviewCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      viewPhotoButtonRef.current?.focus();
    };
  }, [photoPreviewOpen]);

  return (
    <section className="customization-page" aria-labelledby="customization-title">
      <header className="customization-heading">
        <div>
          <div className="section-kicker">STEP 2 / MAKE IT YOURS</div>
          <h1 id="customization-title">Your little photo keepsake</h1>
          <p>
            Choose your frame, fine-tune each moment, and save your finished
            strip.
          </p>
        </div>
        <div className="customization-navigation">
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={15} /> BACK TO PHOTOBOOTH
          </button>
          <button type="button" className="text-button" onClick={onNewSession}>
            <RotateCcw size={14} /> START A NEW SESSION
          </button>
        </div>
      </header>

      <section className="photo-contact-sheet" aria-labelledby="captured-photos-title">
        <div className="section-kicker" id="captured-photos-title">
          {momentsLabel}
        </div>
        <div
          className="photo-contact-sheet-grid"
          style={{
            gridTemplateColumns:
              photoCount === 1
                ? "minmax(0, 320px)"
                : `repeat(${photoCount}, minmax(0, 1fr))`,
            justifyContent: photoCount === 1 ? "center" : undefined,
          }}
        >
          {shots.map((photo, index) => (
            <figure key={photo.id}>
              <img src={photo.original} alt={"Captured photo " + (index + 1)} />
              <figcaption>PHOTO {String(index + 1).padStart(2, "0")}</figcaption>
              <button
                type="button"
                className="retake-photo-button"
                onClick={() => onRetake(photo.id)}
                aria-label={"Retake photo " + (index + 1)}
              >
                <RotateCcw size={13} /> RETAKE
              </button>
            </figure>
          ))}
        </div>
      </section>

      <div className="customization-layout">
        <aside className="customization-controls" aria-label="Photo strip design">
          <section aria-labelledby="frame-picker-title">
            <div className="section-kicker">01 / THE FRAME</div>
            <h2 id="frame-picker-title" className="panel-title">
              Pick your paper
            </h2>
            <div className="frame-options" role="group" aria-label="Photo strip frame">
              {frames.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={frame.id === item.id}
                  onClick={() => onFrameChange(item)}
                  className={
                    "frame-option " + (frame.id === item.id ? "selected" : "")
                  }
                  style={{ "--swatch": item.bg, "--ink": item.ink }}
                >
                  <span className="swatch" aria-hidden="true" />
                  <span>{item.name}</span>
                  {frame.id === item.id && (
                    <span className="frame-selected-mark" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="filter-picker-title">
            <div className="section-kicker">02 / THE FILM</div>
            <h2 id="filter-picker-title" className="panel-title">
              Choose a filter
            </h2>
            <GlobalFilterControls filter={filter} onChange={onFilterChange} />
          </section>

          <details className="customization-disclosure">
            <summary>Paper color, texture & border</summary>
            <FramePaperSettings
              framePaper={framePaper}
              currentFrame={frame}
              onChange={onFramePaperChange}
              onReset={onFramePaperReset}
            />
          </details>

          <label className="caption-label" htmlFor="strip-caption">
            03 / A NOTE AT THE BOTTOM
          </label>
          <input
            id="strip-caption"
            className="caption-input"
            value={caption}
            maxLength={48}
            onChange={(event) => onCaptionChange(event.target.value)}
          />
          <StripSettings config={stripConfig} onChange={onStripConfigChange} />
        </aside>

        <section className="final-strip-panel" aria-labelledby="final-strip-title">
          <div className="section-kicker">04 / FINAL PREVIEW</div>
          <h2 id="final-strip-title" className="panel-title">
            Your photo strip
          </h2>
          <div className="final-strip-preview">
            <PhotoStripPreview
              src={stripUrl}
              loading={stripLoading}
              orientation={stripConfig.layout}
            />
          </div>
          <button
            ref={viewPhotoButtonRef}
            type="button"
            className="secondary-button view-photo-button"
            onClick={() => setPhotoPreviewOpen(true)}
            disabled={stripLoading || !stripUrl}
            aria-haspopup="dialog"
          >
            VIEW PHOTO
          </button>
          {stripError && (
            <div className="final-strip-error">
              <p className="error-message" role="alert">
                {stripError}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={onRetryPreview}
                disabled={stripLoading}
              >
                TRY AGAIN
              </button>
            </div>
          )}
          <div className="customization-export">
            <div className="section-kicker">05 / EXPORT</div>
            <h3>Save your strip</h3>
            <div className="export-settings" role="group" aria-label="PNG export settings">
              <label>
                <span>PNG resolution</span>
                <select
                  value={stripConfig.exportScale}
                  onChange={(event) =>
                    onStripConfigChange({
                      ...stripConfig,
                      exportScale: Number(event.target.value),
                    })
                  }
                >
                  <option value="1">Standard · 1×</option>
                  <option value="2">Print · 2×</option>
                  <option value="3">High resolution · 3×</option>
                </select>
              </label>
              <label>
                <span>Resampling quality</span>
                <select
                  value={stripConfig.exportQuality}
                  onChange={(event) =>
                    onStripConfigChange({
                      ...stripConfig,
                      exportQuality: event.target.value,
                    })
                  }
                >
                  <option value="low">Fast</option>
                  <option value="medium">Balanced</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={onExport}
              disabled={stripLoading || exporting || !stripUrl}
              aria-busy={exporting}
            >
              <Download size={16} />
              {exporting
                ? "PREPARING PNG..."
                : exportReady
                  ? "DOWNLOAD AGAIN"
                  : "DOWNLOAD PHOTO STRIP"}
            </button>
            {exportReady && (
              <div className="export-success">
                <div className="export-success-copy">
                  <div className="section-kicker">READY TO DOWNLOAD</div>
                  <h4>Your photo strip is ready.</h4>
                  <p>
                    Your final PNG is ready. More ways to share your keepsake
                    are coming soon.
                  </p>
                </div>
                <div
                  className="export-delivery-coming-soon"
                  aria-label="More sharing options"
                >
                  <div className="export-delivery-option">
                    <MessageCircle size={15} />
                    <span>WHATSAPP</span>
                    <strong>COMING SOON</strong>
                  </div>
                  <div className="export-delivery-option">
                    <Mail size={15} />
                    <span>EMAIL</span>
                    <strong>COMING SOON</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {photoPreviewOpen &&
        createPortal(
          <div
            className="photo-preview-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPhotoPreviewOpen(false);
              }
            }}
          >
            <section
              ref={photoPreviewDialogRef}
              className="photo-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="final-photo-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="photo-preview-heading">
                <div>
                  <div className="section-kicker">FINAL REVIEW</div>
                  <h2 id="final-photo-preview-title">Your photo strip</h2>
                </div>
                <button
                  ref={photoPreviewCloseRef}
                  type="button"
                  className="capture-result-close"
                  aria-label="Close photo preview"
                  onClick={() => setPhotoPreviewOpen(false)}
                >
                  <X size={20} />
                </button>
              </header>
              <div className="photo-preview-lightbox-content">
                <PhotoStripPreview
                  src={exportedPreviewUrl || stripUrl}
                  loading={false}
                  orientation={stripConfig.layout}
                />
              </div>
              <div className="photo-preview-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPhotoPreviewOpen(false)}
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onExport}
                  disabled={exporting || stripLoading}
                >
                  <Download size={15} />
                  {exporting ? "PREPARING PNG..." : "DOWNLOAD PHOTO"}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}

      <section className="customization-editor" aria-labelledby="customization-editor-title">
        <div>
          <div className="section-kicker">06 / A LITTLE RETOUCH</div>
          <h2 id="customization-editor-title" className="panel-title">
            Fine-tune your photos
          </h2>
        </div>
        <PhotoEditor
          photos={shots}
          selectedPhotoId={selectedPhotoId}
          globalCrop={{ cropX: stripConfig.cropX, cropY: stripConfig.cropY }}
          globalFilter={globalFilter}
          slotWidth={
            stripConfig.photoWidth ??
            (stripConfig.layout === "vertical" ? 564 : 390)
          }
          slotHeight={
            stripConfig.photoHeight ??
            (stripConfig.layout === "vertical" ? 390 : 270)
          }
          onSelect={onPhotoSelect}
          onChange={onPhotoEdit}
          onReset={onPhotoReset}
        />
      </section>
    </section>
  );
}

import { useEffect, useRef } from "react";
import { Download, RotateCcw, X } from "lucide-react";
import PhotoStripPreview from "./PhotoStripPreview.jsx";

export default function CaptureResultDialog({
  open,
  src,
  loading,
  error,
  exporting,
  orientation,
  exportScale,
  exportQuality,
  onExportScaleChange,
  onExportQualityChange,
  onRetry,
  onSave,
  onClose,
  onNewSession,
  returnFocusRef,
  children,
}) {
  const dialogRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll(
        "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])",
      )).filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === focusable[0] || document.activeElement === dialog)) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => {
        if (!openRef.current) {
          (returnFocusRef?.current || document.querySelector(".capture-button"))?.focus();
        }
      });
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return (
    <div className="capture-result-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="capture-result-dialog" role="dialog" aria-modal="true"
        aria-labelledby="capture-result-title" aria-describedby="capture-result-description" tabIndex={-1}>
        <header className="capture-result-heading">
          <div>
            <div className="section-kicker">YOUR PHOTOBOOTH KEEPSAKE</div>
            <h2 id="capture-result-title">Your photos are ready.</h2>
            <p id="capture-result-description">Edit your photos or save your strip.</p>
          </div>
          <button type="button" className="capture-result-close" onClick={onClose} aria-label="Close photo results">
            <X size={18} />
          </button>
        </header>

        <div className="capture-result-preview">
          <PhotoStripPreview src={src} loading={loading} orientation={orientation} />
        </div>
        {error && <div className="capture-result-error"><p className="error-message" role="alert">{error}</p>
          <button type="button" className="secondary-button" onClick={onRetry} disabled={loading}>TRY AGAIN</button>
        </div>}

        <div className="capture-result-tools">{children}</div>

        <section className="capture-export-panel" aria-labelledby="capture-export-title">
          <div className="section-kicker">REVIEW & EXPORT</div>
          <h3 id="capture-export-title">Save your strip</h3>
          <div className="export-settings" role="group" aria-label="PNG export settings">
            <label><span>PNG resolution</span>
              <select value={exportScale} onChange={(event) => onExportScaleChange(Number(event.target.value))}>
                <option value="1">Standard · 1×</option>
                <option value="2">Print · 2×</option>
                <option value="3">High resolution · 3×</option>
              </select>
            </label>
            <label><span>Resampling quality</span>
              <select value={exportQuality} onChange={(event) => onExportQualityChange(event.target.value)}>
                <option value="low">Fast</option>
                <option value="medium">Balanced</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <button type="button" className="primary-button" onClick={onSave}
            disabled={loading || exporting} aria-busy={exporting}>
            <Download size={16} /> {exporting ? "PREPARING PNG..." : "SAVE PHOTO STRIP"}
          </button>
        </section>

        <footer className="capture-result-footer">
          <button type="button" className="secondary-button" onClick={onClose}>CLOSE RESULTS</button>
          <button type="button" className="capture-result-retake" onClick={onNewSession}>
            <RotateCcw size={14} /> START A NEW SESSION
          </button>
        </footer>
      </section>
    </div>
  );
}
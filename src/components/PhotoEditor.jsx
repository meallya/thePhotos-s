import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  drawPhotoToCanvas,
  loadPhotoImage,
  supportsCanvasFilters,
} from "../lib/photobooth.js";

function PhotoPreviewCanvas({ photo, globalCrop, globalFilter, slotWidth = 564, slotHeight = 390 }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [sourceVersion, setSourceVersion] = useState(0);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let active = true;
    imageRef.current = null;
    setPreviewError("");
    loadPhotoImage(photo.original)
      .then((image) => {
        if (!active) return;
        imageRef.current = { id: photo.id, image };
        setSourceVersion((version) => version + 1);
      })
      .catch((error) => {
        if (active) setPreviewError(error.message || "Could not load this photo preview.");
      });
    return () => {
      active = false;
      imageRef.current = null;
    };
  }, [photo.id, photo.original]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const loaded = imageRef.current;
    if (!canvas || !loaded || loaded.id !== photo.id) return undefined;

    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const width = Math.round(560 * pixelRatio);
    const height = Math.round(width * slotHeight / slotWidth);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setPreviewError("Photo editing preview is unavailable in this browser.");
      return undefined;
    }

    context.fillStyle = "#f3eadb";
    context.fillRect(0, 0, width, height);
    drawPhotoToCanvas(
      context,
      loaded.image,
      { x: 0, y: 0, width, height },
      photo.edits,
      "high",
      globalCrop,
      globalFilter,
    );
    context.strokeStyle = "rgba(255,255,255,.6)";
    context.lineWidth = Math.max(1, pixelRatio);
    context.strokeRect(4, 4, width - 8, height - 8);
    setPreviewError("");
    return () => {
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [photo, globalCrop, globalFilter, sourceVersion, slotWidth, slotHeight]);

  return (
    <div className="photo-edit-preview">
      {previewError ? <div className="photo-edit-preview-error" role="status">{previewError}</div> : null}
      <canvas ref={canvasRef} aria-label="Edited preview for selected photo" role="img" />
    </div>
  );
}

function EditSlider({ label, value, min, max, suffix = "", onChange }) {
  return (
    <label className="photo-edit-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={String(value) + suffix}
      />
      <output>{value}{suffix}</output>
    </label>
  );
}

export default function PhotoEditor({
  photos,
  selectedPhotoId,
  globalCrop,
  globalFilter,
  onSelect,
  onChange,
  onReset,
  slotWidth = 564,
  slotHeight = 390,
}) {
  const photo = photos.find((item) => item.id === selectedPhotoId) || photos[0];
  const [filterSupport] = useState(() => supportsCanvasFilters());
  if (!photo) return null;

  const selectedIndex = photos.findIndex((item) => item.id === photo.id);
  const update = (patch) => onChange(photo.id, patch);

  return (
    <section className="photo-editor-panel" aria-labelledby="photo-editor-title">
      <div className="photo-editor-heading">
        <div>
          <div className="section-kicker">06 / A LITTLE RETOUCH</div>
          <h3 id="photo-editor-title">Edit each moment</h3>
        </div>
        <span className="photo-editor-selected">PHOTO {String(selectedIndex + 1).padStart(2, "0")} SELECTED</span>
      </div>

      <div className="photo-editor-thumbnails" role="group" aria-label="Choose a photo for individual adjustments">
        {photos.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={"photo-editor-thumbnail " + (item.id === photo.id ? "selected" : "")}
            aria-pressed={item.id === photo.id}
            aria-label={"Select photo " + (index + 1) + " to edit"}
            onClick={() => onSelect(item.id)}
          >
            <img src={item.original} alt="" />
            <span>PHOTO {String(index + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>

      <div className="photo-editor-workspace">
        <PhotoPreviewCanvas photo={photo} globalCrop={globalCrop} globalFilter={globalFilter} slotWidth={slotWidth} slotHeight={slotHeight} />
        <div className="photo-edit-controls">
          <div className="photo-edit-controls-heading">
            <span>PHOTO {String(selectedIndex + 1).padStart(2, "0")} SETTINGS</span>
            <button type="button" className="photo-edit-reset" onClick={() => onReset(photo.id)}>
              <RotateCcw size={13} /> RESET
            </button>
          </div>
          <div className="photo-edit-sliders">
            <EditSlider label="Brightness" value={photo.edits.brightness} min={50} max={150} suffix="%" onChange={(value) => update({ brightness: value })} />
            <EditSlider label="Contrast" value={photo.edits.contrast} min={50} max={150} suffix="%" onChange={(value) => update({ contrast: value })} />
            <EditSlider label="Saturation" value={photo.edits.saturation} min={0} max={200} suffix="%" onChange={(value) => update({ saturation: value })} />
            <EditSlider label="Warmth" value={photo.edits.warmth} min={-100} max={100} onChange={(value) => update({ warmth: value })} />
            <EditSlider label="Focal position · horizontal" value={photo.edits.cropX} min={0} max={100} suffix="%" onChange={(value) => update({ cropX: value })} />
            <EditSlider label="Focal position · vertical" value={photo.edits.cropY} min={0} max={100} suffix="%" onChange={(value) => update({ cropY: value })} />
            <EditSlider label="Crop zoom" value={photo.edits.zoom} min={100} max={200} suffix="%" onChange={(value) => update({ zoom: value })} />
          </div>

          {!filterSupport && (
            <p className="photo-editor-support-note" role="status">
              This browser can crop photos, but advanced color filters are unavailable. Your original photos are preserved.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}



import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FRAME_BORDER_STYLES, FRAME_PAPER_COLORS, getFramePaperColor } from "../lib/photobooth.js";
import { createCustomFramePaperPatch } from "../lib/paperColor.js";

export default function FramePaperSettings({ framePaper, currentFrame, onChange, onReset }) {
  const activeColor = getFramePaperColor(currentFrame, framePaper);
  const [colorInput, setColorInput] = useState(activeColor);
  const [colorError, setColorError] = useState("");

  useEffect(() => {
    setColorInput(activeColor);
    setColorError("");
  }, [activeColor, framePaper.paperColor]);

  const handleTextColorChange = (value) => {
    setColorInput(value);
    const patch = createCustomFramePaperPatch(value);
    if (!patch) {
      setColorError("Enter a valid CSS color, such as #A63D40 or rgb(166, 61, 64).");
      return;
    }
    setColorError("");
    onChange(patch);
  };

  const handlePickerChange = (value) => {
    const patch = createCustomFramePaperPatch(value);
    if (!patch) return;
    setColorInput(patch.customColor);
    setColorError("");
    onChange(patch);
  };

  const selectColor = (option) => {
    setColorError("");
    onChange({ paperColor: option.id });
  };

  return (
    <div className="frame-paper-controls">
      <fieldset className="frame-paper-control">
        <legend>Paper color</legend>
        <div className="paper-color-options" role="group" aria-label="Photo strip paper color">
          {FRAME_PAPER_COLORS.map((option) => {
            const isSelected = framePaper.paperColor === option.id;
            const color = getFramePaperColor(currentFrame, { ...framePaper, paperColor: option.id });
            return (
              <button key={option.id} type="button" className={"paper-color-option " + (isSelected ? "selected" : "")}
                aria-pressed={isSelected} onClick={() => selectColor(option)}>
                <span className="paper-color-swatch" style={{ backgroundColor: color }} aria-hidden="true" />
                <span>{option.id === "palette" ? currentFrame.name : option.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="frame-paper-custom-color">
        <label className="frame-paper-color-picker">
          <span>Custom Color</span>
          <input type="color" value={activeColor} aria-label="Choose a custom paper color"
            onChange={(event) => handlePickerChange(event.target.value)} />
        </label>
        <label className="frame-paper-color-text">
          <span>CSS color</span>
          <input type="text" value={colorInput} maxLength={64} spellCheck="false" autoComplete="off"
            aria-label="Enter a CSS paper color" aria-invalid={Boolean(colorError)}
            aria-describedby={colorError ? "frame-paper-color-error" : undefined}
            onChange={(event) => handleTextColorChange(event.target.value)} />
        </label>
        {colorError && <p id="frame-paper-color-error" className="frame-paper-color-error" role="alert">{colorError}</p>}
      </div>

      <label className="frame-paper-texture">
        <span>Paper texture <output>{framePaper.texture}%</output></span>
        <input type="range" min="0" max="100" step="1" value={framePaper.texture}
          aria-label="Paper texture intensity" aria-valuetext={framePaper.texture + "%"}
          onChange={(event) => onChange({ texture: Number(event.target.value) })} />
        <small>Set to 0% for smooth paper.</small>
      </label>

      <fieldset className="frame-paper-control">
        <legend>Border style</legend>
        <div className="frame-border-options" role="group" aria-label="Photo border style">
          {FRAME_BORDER_STYLES.map((option) => (
            <button key={option.id} type="button" className={"frame-border-option " + (framePaper.borderStyle === option.id ? "selected" : "")}
              aria-pressed={framePaper.borderStyle === option.id} onClick={() => onChange({ borderStyle: option.id })}>
              {option.name}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" className="frame-paper-reset" onClick={onReset}>
        <RotateCcw size={13} /> RESET PAPER SETTINGS
      </button>
    </div>
  );
}

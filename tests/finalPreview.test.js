import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("final review lightbox reuses the rendered preview and exported PNG", () => {
  const app = read("src/App.jsx");
  const page = read("src/components/PhotoCustomizationPage.jsx");
  const styles = read("src/styles/photobooth.css");

  assert.match(app, /URL\.createObjectURL\(exportedBlob\)/);
  assert.match(app, /exportedPreviewUrl=\{exportedPreviewUrl\}/);
  assert.match(page, /VIEW PHOTO/);
  assert.match(page, /createPortal\([\s\S]*?document\.body/);
  assert.match(page, /className="photo-preview-backdrop"[\s\S]*?onClick=/);
  assert.match(page, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(page, /role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(page, /src=\{exportedPreviewUrl \|\| stripUrl\}/);
  assert.match(page, /onClick=\{onExport\}/);
  assert.match(page, /event\.key === "Escape"/);
  assert.doesNotMatch(page, /onTouchStart=|onPointerDown=/);
  assert.match(styles, /\.photo-preview-backdrop \{[^}]*position: fixed[^}]*z-index: 1000/);
  assert.match(styles, /\.photo-preview-lightbox-content \.photo-strip-preview img \{[^}]*max-height/);
  assert.match(styles, /object-fit: contain/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});

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
  assert.match(page, /role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(page, /src=\{exportedPreviewUrl \|\| stripUrl\}/);
  assert.match(page, /onClick=\{onExport\}/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(styles, /\.photo-preview-lightbox-content \.photo-strip-preview img \{[^}]*max-height/);
  assert.match(styles, /object-fit: contain/);
});

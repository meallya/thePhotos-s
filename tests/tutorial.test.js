import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isTutorialComplete,
  markTutorialComplete,
  TUTORIAL_COMPLETED_KEY,
} from "../src/lib/tutorialStorage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("tutorial completion persists through the provided localStorage interface", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(TUTORIAL_COMPLETED_KEY, "thephotos:tutorial-completed:v1");
  assert.equal(isTutorialComplete(storage), false);
  markTutorialComplete(storage);
  assert.equal(isTutorialComplete(storage), true);
});

test("tutorial presents all seven steps, navigation controls, and an accessible dialog", () => {
  const tutorial = read("src/components/UserTutorial.jsx");
  const app = read("src/App.jsx");

  for (const title of [
    "Welcome to ThePhoto's.",
    "Choose Your Photo Session.",
    "Set Your Music.",
    "Open Your Camera.",
    "Capture Your Moments.",
    "Customize Your Photo Strip.",
    "Review & Download Your Photos.",
  ]) {
    assert.ok(tutorial.includes(title), `missing tutorial step: ${title}`);
  }
  for (const control of ["NEXT", "BACK", "SKIP", "GET STARTED"]) {
    assert.ok(tutorial.includes(control), `missing tutorial control: ${control}`);
  }
  assert.match(tutorial, /role="dialog"/);
  assert.match(tutorial, /aria-modal="true"/);
  assert.match(tutorial, /event\.key === "Escape"/);
  assert.match(tutorial, /role="progressbar"/);
  assert.match(app, /isTutorialComplete\(window\.localStorage\)/);
  assert.match(app, /markTutorialComplete\(window\.localStorage\)/);
  assert.match(app, /HOW TO USE/);
});

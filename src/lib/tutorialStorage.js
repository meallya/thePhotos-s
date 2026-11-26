export const TUTORIAL_COMPLETED_KEY = "thephotos:tutorial-completed:v1";

export function isTutorialComplete(storage) {
  return storage.getItem(TUTORIAL_COMPLETED_KEY) === "true";
}

export function markTutorialComplete(storage) {
  storage.setItem(TUTORIAL_COMPLETED_KEY, "true");
}

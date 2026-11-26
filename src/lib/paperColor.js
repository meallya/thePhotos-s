function normalizeHex(value) {
  const match = value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (!match) return null;
  const digits = match[1];
  if (digits.length === 4 && digits[3].toLowerCase() !== "f") return null;
  if (digits.length === 8 && digits.slice(6).toLowerCase() !== "ff") return null;
  const opaque = digits.length === 4 ? digits.slice(0, 3) : digits.length === 8 ? digits.slice(0, 6) : digits;
  const expanded = opaque.length === 3 ? [...opaque].map((part) => part + part).join("") : opaque;
  return "#" + expanded.toLowerCase();
}

function normalizeRgb(value) {
  const match = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!match || (match[4] !== undefined && Number(match[4]) !== 1)) return null;
  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return "#" + channels.map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

export function normalizeCssColor(value, documentRef = globalThis.document) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 64) return null;
  const hex = normalizeHex(candidate);
  if (hex) return hex;
  const rgb = normalizeRgb(candidate);
  if (rgb) return rgb;

  try {
    const context = documentRef?.createElement?.("canvas")?.getContext?.("2d");
    if (!context) return null;
    const sentinel = "#010203";
    context.fillStyle = sentinel;
    context.fillStyle = candidate;
    const normalized = String(context.fillStyle).toLowerCase();
    if (normalized === sentinel) return null;
    return normalizeHex(normalized) ?? normalizeRgb(normalized);
  } catch {
    return null;
  }
}

export function createCustomFramePaperPatch(value) {
  const customColor = normalizeCssColor(value);
  return customColor ? { paperColor: "custom", customColor } : null;
}

export function normalizeWhatsAppNumber(value) {
  if (typeof value !== "string") return "";
  const recipient = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(recipient) ? recipient : "";
}

export function normalizeEmailAddress(value) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    /[\r\n]/.test(value)
  ) {
    return "";
  }

  const recipient = value.trim();
  return recipient.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    ? recipient
    : "";
}

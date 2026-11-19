export function normalizeTypingAnswer(value) {
  return String(value || '')
    .trim()
    .replace(/[.,!?;:]+$/, '')
    .toLowerCase();
}

// Utilities to sanitize payloads before sending to AI providers.

export function sanitizeTextForAI(text: string): string {
  // Minimal stub: strip emails and obvious phone numbers. Extend with NLP/PII masking later.
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "[email]")
    .replace(/\\+?\\d[\\d\\s().-]{6,}/g, "[phone]");
}

export function buildSafePrompt(parts: string[]) {
  return parts.map((p) => sanitizeTextForAI(p)).join("\\n");
}

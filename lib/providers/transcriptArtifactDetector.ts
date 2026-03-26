import type { TranscriptSpeakerLine } from "@/lib/types";

const suspiciousPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brubbed in\b/i, reason: "possible ASR artifact" },
  { pattern: /\bget this all\b/i, reason: "possible ASR artifact" },
  { pattern: /\band then ask you questions\b/i, reason: "possible truncated / repetitive phrasing" },
  { pattern: /\btry to get this\b/i, reason: "possible ASR artifact" },
];

function detectSuspicion(text: string) {
  for (const candidate of suspiciousPatterns) {
    if (candidate.pattern.test(text)) return candidate.reason;
  }

  if (/\b([a-z]+)\s+\1\b/i.test(text)) return "possible repeated word artifact";
  if (text.length > 180 && /\b(and then)\b/i.test(text) && /\b(and then)\b/i.test(text.replace(/\b(and then)\b/i, ""))) {
    return "possible run-on / merged segment";
  }

  return undefined;
}

export function flagSuspiciousSpeakerLines(lines: TranscriptSpeakerLine[]) {
  return lines.map((line) => {
    const suspiciousReason = detectSuspicion(line.text || "");
    return suspiciousReason
      ? { ...line, suspicious: true, suspiciousReason }
      : { ...line, suspicious: false, suspiciousReason: undefined };
  });
}

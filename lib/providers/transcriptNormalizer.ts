// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

const conservativeReplacements: Array<[RegExp, string]> = [
  [/\bfast\s+a\s*f\b/gi, "fast AF"],
  [/\bafib\b/gi, "AF"],
  [/\ba\s*f\b/gi, "AF"],
  [/\bh\s*f\b/gi, "HF"],
  [/\bn\s*stemi\b/gi, "NSTEMI"],
  [/\bv\s*t\b/gi, "VT"],
  [/\bv\s*f\b/gi, "VF"],
  [/\be\s*c\s*g\b/gi, "ECG"],
  [/\be\s*f\b/gi, "EF"],
  [/\bs\s*o\s*b\b/gi, "SOB"],
  [/\btrops\b/gi, "troponins"],
  [/\btr oponins\b/gi, "troponins"],
  [/\becho\b/gi, "echo"],
  [/\bmetoprolol\b/gi, "metoprolol"],
  [/\bamiodarone\b/gi, "amiodarone"],
  [/\bapixaban\b/gi, "apixaban"],
  [/\bfurosemide\b/gi, "furosemide"],
  [/\bchest pain free\b/gi, "chest pain free"],
  [/\bfluid overloaded\b/gi, "fluid overloaded"],
];

function normalizeEfPercent(text: string) {
  return text
    .replace(/\bEF\s+forty\b/gi, "EF 40%")
    .replace(/\bEF\s+thirty[-\s]?five\b/gi, "EF 35%")
    .replace(/\bEF\s+fifty\b/gi, "EF 50%")
    .replace(/\bEF\s+(\d{1,2})(?:\s*percent)?\b/gi, (_, value: string) => `EF ${value}%`);
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export class TranscriptNormalizer {
  normalize(transcript: string) {
    let next = transcript;

    for (const [pattern, replacement] of conservativeReplacements) {
      next = next.replace(pattern, replacement);
    }

    next = normalizeEfPercent(next);
    next = normalizeWhitespace(next);

    return next;
  }
}

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
  [/\bd\s*o\s*e\b/gi, "DOE"],
  [/\bp\s*n\s*d\b/gi, "PND"],
  [/\bc\s*x\s*r\b/gi, "CXR"],
  [/\bt\s*t\s*e\b/gi, "TTE"],
  [/\bu\s*&\s*e\b/gi, "U&E"],
  [/\bu\s+and\s+e\b/gi, "U&E"],
  [/\btrops\b/gi, "troponins"],
  [/\btr oponins\b/gi, "troponins"],
  [/\borthopn(?:oe|ea)a\b/gi, "orthopnoea"],
  [/\bparoxysmal nocturnal dyspn(?:oe|ea)a\b/gi, "PND"],
  [/\bshortness of breath\b/gi, "SOB"],
  [/\bbreathlessness\b/gi, "SOB"],
  [/\bdyspn(?:oe|ea)a\b/gi, "SOB"],
  [/\becho\b/gi, "echo"],
  [/\bmetoprolol\b/gi, "metoprolol"],
  [/\bamiodarone\b/gi, "amiodarone"],
  [/\bapixaban\b/gi, "apixaban"],
  [/\bfurosemide\b/gi, "furosemide"],
  [/\bchest pain free\b/gi, "CP free"],
  [/\bno chest pain\b/gi, "nil CP"],
  [/\bno shortness of breath\b/gi, "nil SOB"],
  [/\bfluid overloaded\b/gi, "fluid overloaded"],
  [/\beuvolemic\b/gi, "euvolaemic"],
  [/\beuvolemia\b/gi, "euvolaemia"],
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

import fs from "node:fs/promises";

const baseUrl = process.env.AILSA_BASE_URL || "http://127.0.0.1:3000";
const fixturePath = new URL("../fixtures/style-eval-cases.json", import.meta.url);
const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));

const BEAUTIFYING_PATTERNS = [
  /favou?rable response/gi,
  /doing well/gi,
  /clinically stable/gi,
  /pleasant patient/gi,
  /reassuringly/gi,
  /in the setting of/gi,
  /with improvement in/gi,
];

function flattenStructured(structured) {
  if (!structured || typeof structured !== "object") return "";
  const parts = [];
  const walk = (value) => {
    if (value == null) return;
    if (typeof value === "string") {
      if (value.trim()) parts.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  walk(structured);
  return parts.join("\n");
}

function countBeautifying(text) {
  return BEAUTIFYING_PATTERNS.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
}

function getDistinctPlanItems(structured) {
  const plans = Array.isArray(structured?.planToday) ? structured.planToday : [];
  return new Set(plans.map((item) => String(item).trim().toLowerCase()).filter(Boolean)).size;
}

function getMaxLineLength(text) {
  return Math.max(...text.split(/\n+/).map((line) => line.trim().length), 0);
}

function countMatches(text, values) {
  const lower = text.toLowerCase();
  return values.filter((value) => lower.includes(String(value).toLowerCase())).length;
}

let failures = 0;
let warnings = 0;
const summaries = [];

for (const fixture of fixtures) {
  const response = await fetch(`${baseUrl}/api/generate-note`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      transcript: fixture.transcript,
      encounterType: fixture.encounterType,
    }),
  });

  if (!response.ok) {
    failures += 1;
    console.error(`FAIL ${fixture.name}: HTTP ${response.status}`);
    continue;
  }

  const data = await response.json();
  const structured = data?.structured;
  const documentType = structured?.documentType;
  if (documentType !== fixture.targetDocumentType) {
    failures += 1;
    console.error(`FAIL ${fixture.name}: expected ${fixture.targetDocumentType}, got ${documentType}`);
    continue;
  }

  const fullText = flattenStructured(structured);
  const beautifyHits = countBeautifying(fullText);
  const includeHits = countMatches(fullText, fixture.expect.mustIncludeAny || []);
  const avoidHits = countMatches(fullText, fixture.expect.mustAvoid || []);
  const maxLineLength = getMaxLineLength(fullText);
  const distinctPlanItems = getDistinctPlanItems(structured);

  let score = 100;
  score += includeHits * 4;
  score -= beautifyHits * 8;
  score -= avoidHits * 8;
  if (maxLineLength > fixture.expect.maxLineLength) score -= Math.min(15, maxLineLength - fixture.expect.maxLineLength);
  if (distinctPlanItems < fixture.expect.minDistinctPlanItems) score -= 10;

  const notes = [];
  if (includeHits === 0) notes.push("missing preferred cardiology shorthand");
  if (beautifyHits > 0) notes.push(`beautifying phrases x${beautifyHits}`);
  if (avoidHits > 0) notes.push(`contains discouraged phrases x${avoidHits}`);
  if (maxLineLength > fixture.expect.maxLineLength) notes.push(`long lines (${maxLineLength})`);
  if (distinctPlanItems < fixture.expect.minDistinctPlanItems) notes.push(`weak plan diversity (${distinctPlanItems})`);

  const fail = beautifyHits > 0 || avoidHits > 0;
  const warn = !fail && (maxLineLength > fixture.expect.maxLineLength + 10 || distinctPlanItems < fixture.expect.minDistinctPlanItems || includeHits === 0);
  if (fail) failures += 1;
  if (warn) warnings += 1;

  summaries.push({
    name: fixture.name,
    score,
    includeHits,
    beautifyHits,
    avoidHits,
    maxLineLength,
    distinctPlanItems,
    fail,
    warn,
    notes: notes.join(", ") || "ok",
  });
}

for (const summary of summaries) {
  const badge = summary.fail ? "FAIL" : summary.warn ? "WARN" : "PASS";
  console.log(`${badge} ${summary.name}: score=${summary.score} include=${summary.includeHits} beautify=${summary.beautifyHits} avoid=${summary.avoidHits} maxLine=${summary.maxLineLength} plans=${summary.distinctPlanItems} :: ${summary.notes}`);
}

const average = summaries.length ? Math.round(summaries.reduce((sum, item) => sum + item.score, 0) / summaries.length) : 0;
console.log(`\nStyle eval average score: ${average}`);

if (failures > 0) {
  console.error(`Style eval failed with ${failures} hard fail case(s). Warnings: ${warnings}.`);
  process.exit(1);
}

if (warnings > 0) {
  console.log(`Style eval passed with ${warnings} warning case(s).`);
} else {
  console.log("Style eval passed.");
}

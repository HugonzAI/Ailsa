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

function countPresentSections(text, sections) {
  const lower = text.toLowerCase();
  return sections.filter((section) => lower.includes(String(section).toLowerCase())).length;
}

function hasSectionOrder(text, orderedSections) {
  const lower = text.toLowerCase();
  let cursor = -1;
  for (const section of orderedSections) {
    const index = lower.indexOf(String(section).toLowerCase(), cursor + 1);
    if (index === -1 || index < cursor) return false;
    cursor = index;
  }
  return true;
}

function getCodingFriendlySignals(structured) {
  if (!structured || typeof structured !== "object") {
    return {
      diagnosisCount: 0,
      medicationChangeCount: 0,
      pendingCount: 0,
      followUpCount: 0,
      consultantProblemCount: 0,
    };
  }

  if (structured.documentType === "cardiac_discharge_summary") {
    return {
      diagnosisCount: Array.isArray(structured.dischargeDiagnoses) ? structured.dischargeDiagnoses.filter(Boolean).length : 0,
      medicationChangeCount: Array.isArray(structured.medicationChanges) ? structured.medicationChanges.filter(Boolean).length : 0,
      pendingCount: Array.isArray(structured.pendingResults) ? structured.pendingResults.filter(Boolean).length : 0,
      followUpCount: Array.isArray(structured.followUpPlans) ? structured.followUpPlans.filter(Boolean).length : 0,
      consultantProblemCount: 0,
    };
  }

  if (structured.documentType === "cardiology_consultant_letter") {
    return {
      diagnosisCount: 0,
      medicationChangeCount: 0,
      pendingCount: 0,
      followUpCount: structured.followUp ? 1 : 0,
      consultantProblemCount: Array.isArray(structured.assessmentPlan) ? structured.assessmentPlan.filter((item) => item?.problem).length : 0,
    };
  }

  return {
    diagnosisCount: Array.isArray(structured.activeProblems) ? structured.activeProblems.filter(Boolean).length : 0,
    medicationChangeCount: 0,
    pendingCount: 0,
    followUpCount: structured.nextReview ? 1 : 0,
    consultantProblemCount: 0,
  };
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

  const renderedText = String(data?.soapNote || "").trim();
  const beautifyHits = countBeautifying(renderedText);
  const includeHits = countMatches(renderedText, fixture.expect.mustIncludeAny || []);
  const avoidHits = countMatches(renderedText, fixture.expect.mustAvoid || []);
  const maxLineLength = getMaxLineLength(renderedText);
  const distinctPlanItems = getDistinctPlanItems(structured);
  const requiredSectionHits = countPresentSections(renderedText, fixture.expect.mustIncludeSections || []);
  const sectionOrderOk = fixture.expect.sectionOrder ? hasSectionOrder(renderedText, fixture.expect.sectionOrder) : true;
  const codingSignals = getCodingFriendlySignals(structured);

  let score = 100;
  score += includeHits * 4;
  score -= beautifyHits * 8;
  score -= avoidHits * 8;
  score += requiredSectionHits * 3;
  if (!sectionOrderOk) score -= 12;
  if ((fixture.expect.minDiagnosisCount || 0) > codingSignals.diagnosisCount) score -= 10;
  if ((fixture.expect.minMedicationChangeCount || 0) > codingSignals.medicationChangeCount) score -= 8;
  if ((fixture.expect.minFollowUpCount || 0) > codingSignals.followUpCount) score -= 8;
  if ((fixture.expect.maxPendingCount ?? Infinity) < codingSignals.pendingCount) score -= 8;
  if ((fixture.expect.minConsultantProblemCount || 0) > codingSignals.consultantProblemCount) score -= 8;
  if (maxLineLength > fixture.expect.maxLineLength) score -= Math.min(15, maxLineLength - fixture.expect.maxLineLength);
  if (distinctPlanItems < fixture.expect.minDistinctPlanItems) score -= 10;

  const notes = [];
  if (includeHits === 0) notes.push("missing preferred cardiology shorthand");
  if (beautifyHits > 0) notes.push(`beautifying phrases x${beautifyHits}`);
  if (avoidHits > 0) notes.push(`contains discouraged phrases x${avoidHits}`);
  if (requiredSectionHits < (fixture.expect.mustIncludeSections || []).length) notes.push(`missing sections (${requiredSectionHits}/${(fixture.expect.mustIncludeSections || []).length})`);
  if (!sectionOrderOk) notes.push("section order off");
  if ((fixture.expect.minDiagnosisCount || 0) > codingSignals.diagnosisCount) notes.push(`weak diagnosis explicitness (${codingSignals.diagnosisCount})`);
  if ((fixture.expect.minMedicationChangeCount || 0) > codingSignals.medicationChangeCount) notes.push(`weak medication-change explicitness (${codingSignals.medicationChangeCount})`);
  if ((fixture.expect.minFollowUpCount || 0) > codingSignals.followUpCount) notes.push(`weak follow-up explicitness (${codingSignals.followUpCount})`);
  if ((fixture.expect.maxPendingCount ?? Infinity) < codingSignals.pendingCount) notes.push(`too many pending items (${codingSignals.pendingCount})`);
  if ((fixture.expect.minConsultantProblemCount || 0) > codingSignals.consultantProblemCount) notes.push(`weak consultant problem structure (${codingSignals.consultantProblemCount})`);
  if (maxLineLength > fixture.expect.maxLineLength) notes.push(`long lines (${maxLineLength})`);
  if (distinctPlanItems < fixture.expect.minDistinctPlanItems) notes.push(`weak plan diversity (${distinctPlanItems})`);

  const fail = beautifyHits > 0 || avoidHits > 0;
  const warn = !fail && (
    maxLineLength > fixture.expect.maxLineLength + 10 ||
    distinctPlanItems < fixture.expect.minDistinctPlanItems ||
    includeHits === 0 ||
    requiredSectionHits < (fixture.expect.mustIncludeSections || []).length ||
    !sectionOrderOk ||
    (fixture.expect.minDiagnosisCount || 0) > codingSignals.diagnosisCount ||
    (fixture.expect.minMedicationChangeCount || 0) > codingSignals.medicationChangeCount ||
    (fixture.expect.minFollowUpCount || 0) > codingSignals.followUpCount ||
    (fixture.expect.maxPendingCount ?? Infinity) < codingSignals.pendingCount ||
    (fixture.expect.minConsultantProblemCount || 0) > codingSignals.consultantProblemCount
  );
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
    requiredSectionHits,
    sectionOrderOk,
    codingSignals,
    fail,
    warn,
    notes: notes.join(", ") || "ok",
  });
}

for (const summary of summaries) {
  const badge = summary.fail ? "FAIL" : summary.warn ? "WARN" : "PASS";
  console.log(`${badge} ${summary.name}: score=${summary.score} include=${summary.includeHits} sections=${summary.requiredSectionHits} order=${summary.sectionOrderOk ? "ok" : "off"} dx=${summary.codingSignals.diagnosisCount} medchg=${summary.codingSignals.medicationChangeCount} fup=${summary.codingSignals.followUpCount} pending=${summary.codingSignals.pendingCount} cprob=${summary.codingSignals.consultantProblemCount} beautify=${summary.beautifyHits} avoid=${summary.avoidHits} maxLine=${summary.maxLineLength} plans=${summary.distinctPlanItems} :: ${summary.notes}`);
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

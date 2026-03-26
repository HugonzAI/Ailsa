import fs from "node:fs/promises";

const fixturePath = new URL("../fixtures/transcript-eval-cases.json", import.meta.url);
const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_TRANSCRIPT_POSTPROCESS_MODEL || "gpt-4.1-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY is required for transcript-eval.");
  process.exit(1);
}

function buildPrompt(transcript) {
  return [
    "You are post-processing a clinical audio transcript for a NZ cardiology documentation tool.",
    "Your job is ONLY to segment by speaker and assign conservative labels.",
    "Default to generic labels such as Speaker 1 / Speaker 2 / Speaker 3 unless the role is very clear from the words themselves.",
    "Do not summarize, rewrite, beautify, explain, or add details that were not present.",
    "Keep the wording source-faithful and conservative.",
    "Output must stay in English.",
    "If a role is uncertain, use Unknown or Speaker 1 / Speaker 2 / Speaker 3 rather than guessing.",
    "Only use Doctor, Patient, Nurse, or Family when the wording is strongly and explicitly supportive.",
    "Do not infer Nurse from ordinary clinician questioning alone.",
    "Keep speaker continuity stable. Avoid unnecessary speaker changes for consecutive lines that sound like the same person continuing.",
    "Do not invent vital signs, diagnoses, medications, plans, or missing context.",
    'Return JSON only in the shape: { "lines": [{ "speaker": "Speaker 1", "text": "..." }] }',
    "Transcript:",
    transcript,
  ].join("\n\n");
}

function normalizeSpeakerLabel(label) {
  const cleaned = String(label || "").trim();
  if (["Doctor", "Patient", "Nurse", "Family", "Unknown", "Speaker 1", "Speaker 2", "Speaker 3"].includes(cleaned)) {
    return cleaned;
  }
  return "Unknown";
}

function scoreMatches(text, patterns) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

const genericSpeakers = new Set(["Unknown", "Speaker 1", "Speaker 2", "Speaker 3"]);

function inferRoleFromText(text, currentSpeaker) {
  if (!genericSpeakers.has(currentSpeaker)) return currentSpeaker;

  const normalized = text.toLowerCase();

  const explicitDoctorCues = [
    /\bi(?:'m| am) (?:a )?(?:doctor|dr|medical student|registrar|house officer)\b/,
    /\bworking with dr\.?\b/,
  ];

  const doctorCues = [
    /\bwhat brings you in\b/,
    /\bany chest pain\b/,
    /\bany shortness of breath\b/,
    /\bcontinue\b.*\b(furosemide|metoprolol|amiodarone|apixaban)\b/,
    /\bcheck\b.*\b(ecg|troponins?|echo|u&e|labs?)\b/,
    /\breview\b.*\b(tomorrow|later|today)\b/,
    /\bwe'?ll\b/,
    /\blet'?s\b/,
  ];

  const patientCues = [
    /\bi have\b/,
    /\bi'?ve been\b/,
    /\bi feel\b/,
    /\bi am\b/,
    /\bi'?m\b/,
    /\bmy chest\b/,
    /\bmy neck\b/,
    /\bi'?m short of breath\b/,
    /\bi still feel\b/,
    /\bno chest pain\b/,
    /\bno shortness of breath\b/,
  ];

  const explicitNurseCues = [
    /\bi(?:'m| am) (?:the )?nurse\b/,
    /\bthis is nursing handover\b/,
    /\bnursing staff\b/,
  ];

  if (scoreMatches(normalized, explicitDoctorCues) >= 1) return "Doctor";
  if (scoreMatches(normalized, explicitNurseCues) >= 1) return "Nurse";

  const doctorScore = scoreMatches(normalized, doctorCues);
  const patientScore = scoreMatches(normalized, patientCues);

  if (patientScore >= 2 && patientScore > doctorScore) return "Patient";
  if (doctorScore >= 3 && doctorScore > patientScore + 1) return "Doctor";

  return currentSpeaker;
}

function smoothSpeakerLines(lines) {
  const normalized = lines
    .map((line) => ({
      speaker: inferRoleFromText(String(line?.text || "").trim(), normalizeSpeakerLabel(line?.speaker)),
      text: String(line?.text || "").trim(),
    }))
    .filter((line) => line.text);

  for (let index = 1; index < normalized.length - 1; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const next = normalized[index + 1];

    if (genericSpeakers.has(current.speaker) && previous.speaker === next.speaker && !genericSpeakers.has(previous.speaker)) {
      current.speaker = previous.speaker;
    }
  }

  const merged = [];
  for (const line of normalized) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === line.speaker) {
      last.text = `${last.text} ${line.text}`.replace(/\s+/g, " ").trim();
    } else {
      merged.push({ ...line });
    }
  }

  return merged;
}

async function runPostProcess(transcript) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You only restructure transcripts into conservative speaker-labelled English lines. Default to generic speaker labels. Never add facts. If uncertain, keep labels generic.",
        },
        {
          role: "user",
          content: buildPrompt(transcript),
        },
      ],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${JSON.stringify(json)}`);
  }

  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  const parsed = JSON.parse(content);
  return smoothSpeakerLines(Array.isArray(parsed?.lines) ? parsed.lines : []);
}

function getLabelCounts(lines) {
  return lines.reduce((acc, line) => {
    acc[line.speaker] = (acc[line.speaker] || 0) + 1;
    return acc;
  }, {});
}

function summarize(lines) {
  const counts = getLabelCounts(lines);
  const roleLabels = ["Doctor", "Patient", "Nurse", "Family"].reduce((sum, label) => sum + (counts[label] || 0), 0);
  const genericLabels = ["Unknown", "Speaker 1", "Speaker 2", "Speaker 3"].reduce((sum, label) => sum + (counts[label] || 0), 0);
  return { counts, roleLabels, genericLabels };
}

let failures = 0;
let warnings = 0;
const summaries = [];

for (const fixture of fixtures) {
  try {
    const lines = await runPostProcess(fixture.transcript);
    const { counts, roleLabels, genericLabels } = summarize(lines);
    const expect = fixture.expect || {};
    const labelsPresent = Object.keys(counts);

    const notes = [];
    let fail = false;
    let warn = false;

    if ((expect.minLines || 0) > lines.length) {
      fail = true;
      notes.push(`too few lines (${lines.length})`);
    }
    if ((expect.maxNurseLabels ?? Infinity) < (counts.Nurse || 0)) {
      fail = true;
      notes.push(`too many Nurse labels (${counts.Nurse || 0})`);
    }
    if ((expect.maxFamilyLabels ?? Infinity) < (counts.Family || 0)) {
      fail = true;
      notes.push(`too many Family labels (${counts.Family || 0})`);
    }
    if ((expect.maxRoleLabels ?? Infinity) < roleLabels) {
      fail = true;
      notes.push(`too many role labels (${roleLabels})`);
    }
    if ((expect.minRoleLabels || 0) > roleLabels) {
      warn = true;
      notes.push(`fewer role labels than expected (${roleLabels})`);
    }
    if ((expect.minGenericLabels || 0) > genericLabels) {
      warn = true;
      notes.push(`too few generic labels (${genericLabels})`);
    }
    if (Array.isArray(expect.mustIncludeAnyLabels) && expect.mustIncludeAnyLabels.length > 0) {
      const hit = expect.mustIncludeAnyLabels.some((label) => labelsPresent.includes(label));
      if (!hit) {
        warn = true;
        notes.push(`missing expected labels (${expect.mustIncludeAnyLabels.join("|")})`);
      }
    }

    if (fail) failures += 1;
    else if (warn) warnings += 1;

    summaries.push({
      name: fixture.name,
      fail,
      warn,
      lineCount: lines.length,
      roleLabels,
      genericLabels,
      counts,
      preview: lines.map((line) => `${line.speaker}: ${line.text}`).join(" | "),
      notes: notes.join(", ") || "ok",
    });
  } catch (error) {
    failures += 1;
    summaries.push({
      name: fixture.name,
      fail: true,
      warn: false,
      lineCount: 0,
      roleLabels: 0,
      genericLabels: 0,
      counts: {},
      preview: "",
      notes: error instanceof Error ? error.message : String(error),
    });
  }
}

for (const summary of summaries) {
  const badge = summary.fail ? "FAIL" : summary.warn ? "WARN" : "PASS";
  console.log(`${badge} ${summary.name}: lines=${summary.lineCount} role=${summary.roleLabels} generic=${summary.genericLabels} labels=${JSON.stringify(summary.counts)} :: ${summary.notes}`);
  if (summary.preview) console.log(`  ${summary.preview}`);
}

console.log(`\nTranscript eval model: ${model}`);
console.log(`Failures: ${failures}  Warnings: ${warnings}`);

if (failures > 0) process.exit(1);

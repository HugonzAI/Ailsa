import fs from "node:fs/promises";

const baseUrl = process.env.AILSA_BASE_URL || "http://127.0.0.1:3000";
const fixturePath = new URL("../fixtures/regression-cases.json", import.meta.url);

const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));

let failures = 0;

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function isEmptyValue(value) {
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return value == null;
}

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
  const actualDocumentType = structured?.documentType;

  if (actualDocumentType !== fixture.expectedDocumentType) {
    failures += 1;
    console.error(`FAIL ${fixture.name}: expected ${fixture.expectedDocumentType}, got ${actualDocumentType}`);
    continue;
  }

  let fixtureFailed = false;

  for (const path of fixture.expectations?.nonEmpty || []) {
    const value = getByPath(structured, path);
    const ok = typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    if (!ok) {
      failures += 1;
      fixtureFailed = true;
      console.error(`FAIL ${fixture.name}: expected non-empty ${path}`);
    }
  }

  for (const path of fixture.expectations?.empty || []) {
    const value = getByPath(structured, path);
    if (!isEmptyValue(value)) {
      failures += 1;
      fixtureFailed = true;
      console.error(`FAIL ${fixture.name}: expected empty ${path}, got ${JSON.stringify(value)}`);
    }
  }

  for (const [path, min] of Object.entries(fixture.expectations?.minArrayLength || {})) {
    const value = getByPath(structured, path);
    const ok = Array.isArray(value) && value.length >= min;
    if (!ok) {
      failures += 1;
      fixtureFailed = true;
      console.error(`FAIL ${fixture.name}: expected ${path} length >= ${min}, got ${Array.isArray(value) ? value.length : 'non-array'}`);
    }
  }

  for (const [path, max] of Object.entries(fixture.expectations?.maxArrayLength || {})) {
    const value = getByPath(structured, path);
    const ok = Array.isArray(value) && value.length <= max;
    if (!ok) {
      failures += 1;
      fixtureFailed = true;
      console.error(`FAIL ${fixture.name}: expected ${path} length <= ${max}, got ${Array.isArray(value) ? value.length : 'non-array'}`);
    }
  }

  if (!fixtureFailed) {
    console.log(`PASS ${fixture.name}: ${actualDocumentType}`);
  }
}

if (failures > 0) {
  console.error(`\nRegression failed: ${failures} assertion(s)`);
  process.exit(1);
}

console.log("\nAll regression fixtures passed.");

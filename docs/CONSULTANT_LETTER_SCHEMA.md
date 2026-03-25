# Ailsa Consultant Letter Schema v1

This file defines the planned schema for a cardiology consultant letter / specialist assessment letter mode.

This is **not** the same as the inpatient cardiac ward note schema.

---

## Goal

Support a structured draft for:
- cardiology consultant review letter
- new patient cardiac assessment letter
- referral response letter
- specialist follow-up letter

Audience:
- GP / referrer
- other clinicians
- clinic documentation workflows

Tone:
- formal
- clear
- specialty letter style
- more complete than ward shorthand

---

## Top-level structure

```json
{
  "documentType": "cardiology_consultant_letter",
  "referralContext": {},
  "cardiacRiskFactors": [],
  "cardiacHistory": [],
  "otherMedicalHistory": [],
  "currentMedications": {},
  "allergies": [],
  "socialHistory": [],
  "presentingHistory": "",
  "physicalExamination": "",
  "investigations": [],
  "summary": "",
  "assessmentPlan": [],
  "followUp": "",
  "closing": ""
}
```

---

## 1. referralContext

```json
{
  "referrer": "",
  "reasonForReferral": "",
  "visitType": "",
  "openingLine": ""
}
```

### Notes
- `openingLine` supports letter-style openings such as:
  - "I had the pleasure of seeing this patient today..."
- This should be optional and stylistic, not required for core medical content.

---

## 2. cardiacRiskFactors

Array of short strings.

Examples:
- hypertension
- pre-diabetes
- ex-smoker
- family history of premature coronary artery disease
- dyslipidaemia

### Rule
Only include risk factors explicitly stated or clearly documented in transcript/context.

---

## 3. cardiacHistory

Array of short strings.

Examples:
- no known prior cardiac history
- prior PCI
- atrial fibrillation
- HFrEF
- valvular heart disease

---

## 4. otherMedicalHistory

Array of short strings.

Examples:
- GERD
- chronic low back pain
- diabetes
- CKD

---

## 5. currentMedications

```json
{
  "antithrombotics": [],
  "antihypertensives": [],
  "heartFailureMedications": [],
  "lipidLoweringAgents": [],
  "otherMedications": []
}
```

### Notes
This is deliberately category-based because consultant letters often summarise medication classes clearly.

---

## 6. allergies

Array of short strings.

Examples:
- none known
- penicillin rash
- aspirin intolerance

---

## 7. socialHistory

Array of short strings.

Examples:
- sedentary desk job
- ex-smoker
- limited exercise tolerance
- family / living context if relevant

---

## 8. presentingHistory

Type:
- string

This should contain the main referral story / symptom narrative in normal letter prose.

Unlike ward-round notes, consultant letters can tolerate fuller narrative here.

---

## 9. physicalExamination

Type:
- string

May be brief if examination was limited.

Examples:
- examination performed
- cardiovascular and respiratory examination as above
- no overt signs of decompensated heart failure

---

## 10. investigations

Array of short strings.

Examples:
- ECG ordered
- blood work ordered
- stress test pending
- no prior investigations available
- echo with EF 35%

---

## 11. summary

Type:
- string

This is a consultant-style summary/impression block.

Examples:
- symptoms consistent with suspected angina in the context of multiple cardiovascular risk factors
- presentation concerning for exertional ischaemia

---

## 12. assessmentPlan

Array of objects:

```json
[
  {
    "problem": "",
    "assessment": "",
    "plan": ""
  }
]
```

### Notes
This should support numbered problem lists, for example:
- #1 Suspected angina
- #2 Hypertension
- #3 Cardiovascular risk factor optimisation

---

## 13. followUp

Type:
- string

Examples:
- follow up after stress test results
- review in clinic in 6 weeks
- earlier review if symptoms worsen

---

## 14. closing

Type:
- string

Optional closing for specialist letter style.

Examples:
- thank you for the referral
- feel free to contact me if needed

### Important
This is lower priority than medical content and should not be forced.

---

## Differences from inpatient schema

Consultant letter mode should differ from inpatient mode in these ways:

### Inpatient mode
- short
- ward shorthand
- problem/action focused
- daily workflow oriented

### Consultant letter mode
- more formal
- referrer-facing
- more complete background capture
- more narrative presenting history
- letter-style summary and follow-up

---

## Implementation guidance

Before building this mode in code:

1. keep it separate from ward-round prompts
2. do not reuse inpatient wording blindly
3. allow fuller prose in `presentingHistory`
4. keep `assessmentPlan` structured
5. keep hallucination rules as strict as inpatient mode

---

## Suggested next code steps

1. add `documentType` / mode selector support
2. add consultant-letter prompt builder
3. add consultant schema coercion + sanitization
4. add consultant letter UI mode
5. compare consultant output against Heidi-style specialist templates

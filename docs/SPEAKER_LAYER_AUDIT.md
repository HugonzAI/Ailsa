# Speaker Layer Audit v1

This audit records the current conclusions about Ailsa's speaker-aware transcript layer.

Scope:
- transcript segmentation
- role labels (`Doctor`, `Patient`, `Nurse`, `Family`)
- generic speaker labels (`Unknown`, `Speaker 1`, `Speaker 2`, `Speaker 3`)
- review burden created by speaker-aware UI

---

## 1. Main conclusion

Ailsa's speaker-aware layer is useful for **segmenting and reviewing transcripts**, but it should remain conservative about **role assignment**.

The current safe default is:
- preserve speaker segmentation where possible
- prefer generic speaker labels by default
- only promote to `Doctor` / `Patient` / `Nurse` when the wording is strongly supportive

---

## 2. What real testing showed

Using a real transcription pass on a standardized-patient audio sample:
- Whisper transcription itself looked broadly usable
- the higher-risk failure appeared in the speaker-role layer
- generic labels were safer than confident-but-wrong role labels

Most importantly:
- ordinary clinician questioning could be over-labelled as `Nurse`
- this created unnecessary review burden and misleading certainty

That means the main current problem is **not ASR itself**, but **role-labelling confidence**.

---

## 3. Product interpretation

Speaker awareness still has value because it can:
- separate turns in messy dialogue
- help clinicians review uncertain sections faster
- reduce transcript wall-of-text fatigue

But role assignment should not become a pseudo-diarization system that pretends to know more than it does.

### Safe product stance
Good:
- `Speaker 1`
- `Speaker 2`
- `Unknown`
- conservative segmentation

High-risk if overused:
- `Doctor`
- `Nurse`
- `Patient`
without strong textual support

---

## 4. Current design rule

### Keep
- speaker segmentation
- speaker-aware transcript visibility
- uncertain / generic labels
- clinician ability to relabel when helpful

### Avoid
- aggressive role guessing
- treating generic labels as errors
- forcing every line into a clinician-role taxonomy
- making speaker review the centre of the workflow

---

## 5. UI rule

The UI should reinforce the conservative model:
- generic labels are normal
- review should focus on uncertain segments first
- users should only promote labels when clearly supported
- speaker review should remain secondary to the transcript itself

This is why the UI should prefer:
- `Unknown`, `Speaker 1`, `Speaker 2`, `Speaker 3`
above
- `Doctor`, `Patient`, `Nurse`, `Family`

---

## 6. Complexity-budget judgement

### Worth keeping
- segmented transcript view
- generic speaker labels
- conservative speaker review controls

### Worth questioning if they grow further
- high-confidence role inference logic
- line-by-line role micromanagement
- making speaker review feel mandatory for every transcript

---

## 7. Practical target

Ailsa's target is not:
- perfect diarization
- autonomous role classification

Ailsa's target is:
- enough segmentation to reduce clinician review burden
- enough conservatism to avoid misleading role confidence

That is the correct trade-off for this product stage.

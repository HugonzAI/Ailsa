import { formatAuditTimestamp } from "@/components/note-studio/constants";
import { Section } from "@/components/note-studio/ui";
import type { AuditEntry, ReviewStatus } from "@/components/note-studio/constants";
import type { StructuredOutput } from "@/lib/types";

type DraftWorkspaceProps = {
  structured: StructuredOutput;
  encounterType: string;
  status: string;
  output: string;
  hasStructuredContent: boolean;
  patientContextText: string;
  consultantMedicationText: string;
  showEvidence: boolean;
  reviewStatus: ReviewStatus | null;
  auditLog: AuditEntry[];
  editableOutput: boolean;
  loading: boolean;
  transcriptNeedsConfirmation: boolean;
  onAccept: (editable?: boolean) => void;
  onReject: () => void;
  onOutputChange: (next: string) => void;
  onCopy: () => void;
  onGenerate: () => void;
};

export function DraftWorkspace({
  structured,
  encounterType,
  status,
  output,
  hasStructuredContent,
  patientContextText,
  consultantMedicationText,
  showEvidence,
  reviewStatus,
  auditLog,
  editableOutput,
  loading,
  transcriptNeedsConfirmation,
  onAccept,
  onReject,
  onOutputChange,
  onCopy,
  onGenerate,
}: DraftWorkspaceProps) {
  const lastAuditEntry = auditLog[auditLog.length - 1] ?? null;
  const acceptedEntry = [...auditLog].reverse().find((entry) => entry.action === "accepted") ?? null;

  return (
    <section className="draftWorkspace">
      <div className="draftInner">
        {hasStructuredContent ? (
          <div className="reviewBarWrap">
            {reviewStatus !== "accepted" ? (
              <div className="reviewBar">
                <div className="reviewBarTitle">⚠ AI DRAFT — Not clinician reviewed</div>
                <div className="reviewBarActions">
                  <button className="reviewActionPrimary" type="button" onClick={() => onAccept(false)}>
                    Accept draft
                  </button>
                  <button className="reviewActionSecondary" type="button" onClick={() => onAccept(true)}>
                    Edit &amp; accept
                  </button>
                  <button className="reviewActionSecondary" type="button" onClick={onReject}>
                    Reject / start over
                  </button>
                </div>
              </div>
            ) : (
              <div className="acceptedBadge">✓ Clinician accepted · {acceptedEntry ? formatAuditTimestamp(acceptedEntry.timestamp) : formatAuditTimestamp(new Date().toISOString())}</div>
            )}
            {lastAuditEntry ? (
              <div className="reviewAuditLine">
                Last action: {lastAuditEntry.action} — {lastAuditEntry.encounterType} — {formatAuditTimestamp(lastAuditEntry.timestamp)}
              </div>
            ) : null}
          </div>
        ) : null}

        <header className="patientHeader refinedHeader">
          <div>
            <h1 className="patientTitle refinedTitle">
              {structured.documentType === "cardiology_consultant_letter"
                ? "Consultant Letter Draft"
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Discharge Summary Draft"
                  : "Clinical Draft"}
            </h1>
            <div className="patientMetaRow refinedMetaRow">
              <span className="metaTag">{encounterType}</span>
              <span>{hasStructuredContent ? "Structured output ready" : "Awaiting generation"}</span>
              <span>{status}</span>
            </div>
          </div>
          <div className="patientDateBlock">
            <p>Date of Encounter</p>
            <strong>{new Intl.DateTimeFormat("en-NZ", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}</strong>
          </div>
        </header>

        {hasStructuredContent ? (
          <div className="docStack">
            <Section title="Generated Draft Text">
              {editableOutput ? (
                <textarea className="stitchTextarea large outputEditor" value={output} onChange={(e) => onOutputChange(e.target.value)} rows={10} />
              ) : (
                <div className="plainDraftOutput">{output}</div>
              )}
            </Section>

            {structured.documentType === "cardiology_consultant_letter" ? (
              <>
                <Section title="Referral Context">{[structured.referralContext.openingLine, structured.referralContext.referrer, structured.referralContext.reasonForReferral, structured.referralContext.visitType].filter(Boolean).join("\n") || "—"}</Section>
                <Section title="Cardiac Risk Factors">{structured.cardiacRiskFactors.length ? structured.cardiacRiskFactors.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Cardiac History">{structured.cardiacHistory.length ? structured.cardiacHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Other Medical History">{structured.otherMedicalHistory.length ? structured.otherMedicalHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Current Medications">{consultantMedicationText || "—"}</Section>
                <Section title="Allergies">{structured.allergies.length ? structured.allergies.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Social History">{structured.socialHistory.length ? structured.socialHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Presenting History">{structured.presentingHistory || "—"}</Section>
                <Section title="Physical Examination">{structured.physicalExamination || "—"}</Section>
                <Section title="Investigations">{structured.investigations.length ? structured.investigations.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Summary">{structured.summary || "—"}</Section>
                <Section title="Assessment & Management Plan">{structured.assessmentPlan.length ? structured.assessmentPlan.map((item, index) => `#${index + 1} ${item.problem}\nAssessment: ${item.assessment}\nPlan: ${item.plan}`).join("\n\n") : "—"}</Section>
                <Section title="Follow Up">{structured.followUp || "—"}</Section>
                <Section title="Closing">{structured.closing || "—"}</Section>
              </>
            ) : structured.documentType === "cardiac_discharge_summary" ? (
              <>
                <Section title="Patient Context">{patientContextText || "—"}</Section>
                <Section title="Admission Course">{structured.admissionCourse || "—"}</Section>
                <Section title="Key Investigations">{structured.keyInvestigations.length ? structured.keyInvestigations.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Procedures">{structured.procedures.length ? structured.procedures.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Discharge Diagnoses">{structured.dischargeDiagnoses.length ? structured.dischargeDiagnoses.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Medication Changes">{structured.medicationChanges.length ? structured.medicationChanges.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Discharge Status">{structured.dischargeStatus || "—"}</Section>
                <Section title="Follow Up Plans">{structured.followUpPlans.length ? structured.followUpPlans.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Discharge Instructions">{structured.dischargeInstructions.length ? structured.dischargeInstructions.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              </>
            ) : (
              <>
                <Section title="Interval History">{structured.overnightEvents || "—"}</Section>
                <Section title="Objective Findings">{structured.observations || "—"}</Section>
                <Section title="Physical Examination">{structured.examination || "—"}</Section>
                <Section title="Assessment & Management Plan">{[structured.assessment, structured.planToday.length ? structured.planToday.map((item) => `• ${item}`).join("\n") : ""].filter(Boolean).join("\n\n") || "—"}</Section>
                <Section title="Patient Context">{patientContextText || "—"}</Section>
                <Section title="Symptoms">{structured.symptoms || "—"}</Section>
                <Section title="Key Investigations">{structured.keyInvestigations || "—"}</Section>
                <Section title="Active Problems">{structured.activeProblems.length ? structured.activeProblems.map((item) => `• ${item}`).join("\n") : "—"}</Section>
                <Section title="Discharge Considerations">{structured.dischargeConsiderations || "—"}</Section>
              </>
            )}

            {showEvidence && structured.evidenceSupport.length > 0 ? (
              <Section title="Evidence Support" variant="evidence">
                {structured.evidenceSupport.map((item) => `• ${item.claim} — ${item.rationale}\n${item.evidenceType} | confidence: ${item.confidence} | ${item.citationLabel}`).join("\n\n")}
              </Section>
            ) : null}

            {showEvidence && structured.evidenceLimitations.length > 0 ? (
              <Section title="Evidence Limitations" variant="evidence">
                {structured.evidenceLimitations.map((item) => `• ${item}`).join("\n")}
              </Section>
            ) : null}
          </div>
        ) : (
          <div className="emptyDraftState">{output}</div>
        )}

        <footer className="evidenceFooter stickyEvidenceFooter">
          <div className="evidenceFooterLeft">
            <span className="evidenceFooterLabel">Evidence Support</span>
            <div className="evidenceChips">
              <span className="evidenceChip primary">Guideline-aware</span>
              <span className="evidenceChip">Visible {showEvidence ? "On" : "Off"}</span>
              <span className="evidenceChip">Limitations {structured.evidenceLimitations.length}</span>
            </div>
          </div>
          <div className="footerActions">
            <button className="secondaryAction" type="button" onClick={onCopy}>Copy</button>
            <button className="secondaryAction" type="button" onClick={onGenerate} disabled={loading || transcriptNeedsConfirmation}>Regenerate</button>
          </div>
        </footer>
      </div>
    </section>
  );
}

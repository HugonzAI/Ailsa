import type { ReviewStatus } from "@/components/note-studio/constants";
import type { StructuredOutput } from "@/lib/types";
import { SidecarBlock } from "@/components/note-studio/ui";

type SidecarRailProps = {
  structured: StructuredOutput;
  reviewStatus: ReviewStatus | null;
  onFinalize: () => void;
  onResetDemo: () => void;
};

export function SidecarRail({ structured, reviewStatus, onFinalize, onResetDemo }: SidecarRailProps) {
  return (
    <aside className="sidecarRail">
      <h3 className="microHeading sidecarHeading">Operational Sidecar</h3>

      {structured.documentType === "cardiology_consultant_letter" ? (
        <>
          <SidecarBlock title="Investigations">{structured.investigations.length ? structured.investigations.map((item) => `• ${item}`).join("\n") : "—"}</SidecarBlock>
          <SidecarBlock title="Follow-up">{structured.followUp || "—"}</SidecarBlock>
        </>
      ) : structured.documentType === "cardiac_discharge_summary" ? (
        <>
          <SidecarBlock title="Pending Results">{structured.pendingResults.length ? structured.pendingResults.map((item) => `• ${item}`).join("\n") : "—"}</SidecarBlock>
          <SidecarBlock title="Escalation Advice" danger>{structured.escalationAdvice || "—"}</SidecarBlock>
        </>
      ) : (
        <>
          <SidecarBlock title="Active Risks" danger>{structured.escalationsSafetyConcerns || "No active safety concerns recorded."}</SidecarBlock>
          <SidecarBlock title="Pending Tasks">{structured.tasksAllocated.length ? structured.tasksAllocated.map((item) => `• ${[item.task, item.owner, item.timing, item.urgency].filter(Boolean).join(" — ")}`).join("\n") : "—"}</SidecarBlock>
          <SidecarBlock title="Continuity">{structured.nextReview || "—"}</SidecarBlock>
          <SidecarBlock title="Action Summary">{structured.actionSummary.length ? structured.actionSummary.map((item) => `• ${item}`).join("\n") : "—"}</SidecarBlock>
        </>
      )}

      <div className="sidecarButtons">
        <button
          className="primarySidecarButton"
          type="button"
          onClick={reviewStatus === "accepted" ? onFinalize : undefined}
          disabled={reviewStatus !== "accepted"}
          title={reviewStatus !== "accepted" ? "Accept draft first" : undefined}
        >
          Finalize to EMR
        </button>
        <button className="secondarySidecarButton" type="button" onClick={onResetDemo}>Load Demo</button>
      </div>
    </aside>
  );
}

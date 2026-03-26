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
      <h3 className="microHeading sidecarHeading">Secondary Panel</h3>

      {structured.documentType === "cardiology_consultant_letter" ? (
        <>
          {structured.followUp ? <SidecarBlock title="Follow-up">{structured.followUp}</SidecarBlock> : null}
        </>
      ) : structured.documentType === "cardiac_discharge_summary" ? (
        <>
          {structured.pendingResults.length ? <SidecarBlock title="Pending Results">{structured.pendingResults.map((item) => `• ${item}`).join("\n")}</SidecarBlock> : null}
          {structured.escalationAdvice ? <SidecarBlock title="Return Advice" danger>{structured.escalationAdvice}</SidecarBlock> : null}
        </>
      ) : (
        <>
          {structured.escalationsSafetyConcerns ? <SidecarBlock title="Active Risks" danger>{structured.escalationsSafetyConcerns}</SidecarBlock> : null}
          {structured.tasksAllocated.length ? <SidecarBlock title="Pending Tasks">{structured.tasksAllocated.map((item) => `• ${[item.task, item.owner, item.timing, item.urgency].filter(Boolean).join(" — ")}`).join("\n")}</SidecarBlock> : null}
          {structured.nextReview ? <SidecarBlock title="Next Review">{structured.nextReview}</SidecarBlock> : null}
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

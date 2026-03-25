import { NoteStudio } from "@/components/note-studio";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Ailsa Cardiology MVP</span>
        <h1 className="title">Transcript in. Cardiac ward note draft out.</h1>
        <p className="subtitle">
          A deliberately focused first cut for New Zealand inpatient cardiology teams. Ailsa is being shaped around ward round notes, active problems, and plan-for-today drafting rather than generic outpatient SOAP summaries.
        </p>

        <div className="steps">
          <div className="step"><strong>1. Capture</strong><span>Upload or record inpatient cardiology discussion, then convert it into transcript text.</span></div>
          <div className="step"><strong>2. Draft</strong><span>Generate a conservative ward note using cardiology-specific structure, problems, and today-plan logic.</span></div>
          <div className="step"><strong>3. Review</strong><span>Edit the draft, then hand it into ward workflow, handover, or discharge planning.</span></div>
        </div>
      </section>

      <NoteStudio />
    </main>
  );
}

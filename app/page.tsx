import { NoteStudio } from "@/components/note-studio";

export default function Home() {
  return (
    <main className="page shellPage">
      <header className="appHeader">
        <div>
          <span className="eyebrow">Ailsa</span>
          <h1 className="appTitle">Cardiology documentation workspace</h1>
          <p className="appSubtitle">
            A focused clinical workspace for New Zealand cardiology teams: inpatient note drafting, workflow extraction, and conservative evidence support.
          </p>
        </div>
        <div className="headerMeta">
          <div className="headerPill">Clinical Draft</div>
          <div className="headerPill">Workflow / Handover</div>
          <div className="headerPill">Evidence Support</div>
        </div>
      </header>

      <NoteStudio />
    </main>
  );
}

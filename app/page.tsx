import { NoteStudio } from "@/components/note-studio";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Ailsa MVP</span>
        <h1 className="title">Transcript in. Draft SOAP note out.</h1>
        <p className="subtitle">
          A deliberately simple first cut for GP consultation documentation. GCP hosts the app, Whisper handles transcription later, and a strong external model turns cleaned transcript text into a clinician-reviewable SOAP draft.
        </p>

        <div className="steps">
          <div className="step"><strong>1. Capture</strong><span>Upload or record consultation audio, then convert it into transcript text.</span></div>
          <div className="step"><strong>2. Draft</strong><span>Generate a conservative SOAP note that only uses facts present in the transcript.</span></div>
          <div className="step"><strong>3. Review</strong><span>Edit the draft, then copy or export it into the clinician’s existing workflow.</span></div>
        </div>
      </section>

      <NoteStudio />
    </main>
  );
}

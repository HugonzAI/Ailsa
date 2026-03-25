import type { ReactNode } from "react";

export function Section({ title, children, variant }: { title: string; children: ReactNode; variant?: "evidence" }) {
  return (
    <article className={`docSection${variant === "evidence" ? " evidenceSection" : ""}`}>
      <h2 className="docSectionTitle">{title}</h2>
      <div className="docBody">{children || "—"}</div>
    </article>
  );
}

export function SidecarBlock({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`sidecarBlock${danger ? " danger" : ""}`}>
      <h4 className="sidecarTitle">{title}</h4>
      <div className="sidecarBody">{children || "—"}</div>
    </section>
  );
}

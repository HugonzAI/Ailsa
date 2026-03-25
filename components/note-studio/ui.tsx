import type { ReactNode } from "react";

export function Section({
  title,
  children,
  variant,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  variant?: "evidence" | "secondary";
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (collapsible) {
    return (
      <details className={`docSection collapsibleSection${variant === "evidence" ? " evidenceSection" : ""}${variant === "secondary" ? " secondarySection" : ""}`} open={defaultOpen}>
        <summary className="docSectionTitle collapsibleSectionTitle">{title}</summary>
        <div className="docBody">{children || "—"}</div>
      </details>
    );
  }

  return (
    <article className={`docSection${variant === "evidence" ? " evidenceSection" : ""}${variant === "secondary" ? " secondarySection" : ""}`}>
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

import { ArrowUpRight, ShieldCheck } from "lucide-react";

import type { SourceRef } from "../contracts/generated/contracts";

interface SourceCardProps {
  source: SourceRef;
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeZone: "America/Bogota",
});

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : dateFormatter.format(date);
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <article className="source-card">
      <div className="source-card__icon" aria-hidden="true">
        <ShieldCheck size={18} strokeWidth={1.75} />
      </div>
      <span className="source-card__provider">{source.provider}</span>
      <div className="source-card__meta">
        <strong>{source.title}</strong>
        <span>Consultada {readableDate(source.retrievedAt)}</span>
        <span className={source.cached ? "source-card__cached" : undefined}>
          {source.cached ? "Copia verificada" : "Fuente en vivo"}
        </span>
      </div>
      <a
        className="source-card__link"
        href={source.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir ${source.title} en una pestaña nueva`}
      >
        <span>Abrir documentación</span>
        <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </a>
    </article>
  );
}

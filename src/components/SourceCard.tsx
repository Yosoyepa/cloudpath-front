import { ArrowUpRight, DatabaseZap } from "lucide-react";

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
        <DatabaseZap size={18} strokeWidth={1.75} />
      </div>
      <div className="source-card__body">
        <p className="source-card__provider">{source.provider}</p>
        <h3>{source.title}</h3>
        <div className="source-card__meta">
          <span>Consultada {readableDate(source.retrievedAt)}</span>
          <span className={source.cached ? "source-card__cached" : undefined}>
            {source.cached ? "Copia verificada" : "Fuente en vivo"}
          </span>
        </div>
      </div>
      <a
        className="source-card__link"
        href={source.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir ${source.title} en una pestaña nueva`}
      >
        <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </a>
    </article>
  );
}

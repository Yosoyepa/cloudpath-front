import { ArrowRight, Braces, Clock3, Route } from "lucide-react";
import { Link } from "react-router-dom";

import { SourceCard } from "../../components/SourceCard";
import type { Lesson } from "../../contracts/generated/contracts";

interface LessonViewProps {
  lesson: Lesson;
  degraded?: boolean;
}

const formatLabels: Record<Lesson["format"], string> = {
  video: "Video guiado",
  text: "Lectura",
  practice: "Práctica",
  oral_explanation: "Explicación oral",
};

export function LessonView({ lesson, degraded = false }: LessonViewProps) {
  return (
    <article className="lesson-shell" aria-labelledby="lesson-title">
      <header className="lesson-hero">
        <div className="lesson-hero__signal" aria-hidden="true">
          <Route size={24} strokeWidth={1.6} />
          <span />
          <Braces size={24} strokeWidth={1.6} />
        </div>
        <p className="lesson-kicker">
          <span>Microlección</span>
          <span>{formatLabels[lesson.format]}</span>
        </p>
        <h1 id="lesson-title">{lesson.title}</h1>
        <p className="lesson-intro">
          Comprende el concepto, aplícalo y después comprueba tu dominio.
        </p>
        <div className="lesson-meta">
          <span>
            <Clock3 aria-hidden="true" size={15} />
            8–12 min
          </span>
          <span>Nodo · {lesson.nodeId}</span>
          {degraded ? <span className="lesson-mode">Modo respaldo</span> : null}
        </div>
      </header>

      <div className="lesson-grid">
        <section className="lesson-content" aria-labelledby="lesson-concept">
          <div className="lesson-section-label">01 · Concepto</div>
          <h2 id="lesson-concept">Idea clave</h2>
          <div className="lesson-copy">{lesson.content}</div>
        </section>

        <aside className="lesson-activity" aria-labelledby="lesson-activity">
          <div className="lesson-section-label">02 · Ensayo</div>
          <h2 id="lesson-activity">Ponlo en práctica</h2>
          <p>{lesson.activity}</p>
          <div className="lesson-activity__trace" aria-hidden="true">
            <span>comprende</span>
            <i />
            <span>aplica</span>
            <i />
            <span>explica</span>
          </div>
        </aside>
      </div>

      <section className="lesson-sources" id="sources" aria-labelledby="sources-title">
        <div className="lesson-section-label">Evidencia</div>
        <div className="lesson-sources__heading">
          <div>
            <h2 id="sources-title">Fuentes oficiales</h2>
            <p>Contenido trazable a documentación de AWS.</p>
          </div>
          <span>{lesson.sourceRefs.length} referencias</span>
        </div>
        <div className="source-list">
          {lesson.sourceRefs.map((source) => (
            <SourceCard key={source.url} source={source} />
          ))}
        </div>
      </section>

      <footer className="lesson-next">
        <div>
          <span>Siguiente señal</span>
          <strong>Demuestra qué entendiste, no qué memorizaste.</strong>
        </div>
        <Link
          className="button button-primary"
          to={`/assessment/${lesson.nodeId}`}
        >
          Probar lo que entendí
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </footer>
    </article>
  );
}

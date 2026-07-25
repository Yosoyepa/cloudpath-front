import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
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
  const sourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash !== "#sources") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      sourcesRef.current?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <article className="lesson-shell" aria-labelledby="lesson-title">
      <header className="lesson-hero">
        <p className="lesson-kicker">
          Microlección · {formatLabels[lesson.format]} ·{" "}
          <span className="lesson-duration">8–12 min</span>
        </p>
        <h1 id="lesson-title">{lesson.title}</h1>

        <div
          className="source-list"
          id="sources"
          ref={sourcesRef}
          aria-label="Fuentes oficiales"
        >
          {lesson.sourceRefs.map((source) => (
            <SourceCard key={source.url} source={source} />
          ))}
        </div>
        {degraded ? (
          <p className="lesson-mode" role="status">
            Modo respaldo
          </p>
        ) : null}
      </header>

      <section className="lesson-content" aria-labelledby="lesson-concept">
        <p className="lesson-section-label">Objetivo</p>
        <h2 id="lesson-concept">Idea clave</h2>
        <div className="lesson-copy">{lesson.content}</div>
      </section>

      <section className="lesson-activity" aria-labelledby="lesson-activity">
        <p className="lesson-section-label">Ejemplo práctico</p>
        <h2 id="lesson-activity">Ponlo en práctica</h2>
        <p>{lesson.activity}</p>
      </section>

      <footer className="lesson-next">
        <h2>Comprueba lo aprendido con una pregunta.</h2>
        <p>
          Una pregunta, tu nivel de confianza y retroalimentación inmediata.
        </p>
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

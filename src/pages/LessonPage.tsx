import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import type { Lesson } from "../contracts/generated/contracts";
import { getFallbackLesson } from "../features/lesson/lessonFallback";
import { LessonView } from "../features/lesson/LessonView";
import { requestLesson } from "../features/lesson/requestLesson";
import "../features/lesson/lesson.css";
import { useSession } from "../state/SessionProvider";

export default function LessonPage() {
  const { nodeId = "" } = useParams();
  const { state, dispatch } = useSession();
  const [lesson, setLesson] = useState<Lesson | null>(() =>
    state.activeLesson?.nodeId === nodeId ? state.activeLesson : null,
  );
  const [degraded, setDegraded] = useState(false);
  const [warning, setWarning] = useState<string>();
  const [failedNodeId, setFailedNodeId] = useState<string | null>(null);
  const routeNode = state.route?.nodes.find((node) => node.id === nodeId);
  const routeNodeId = routeNode?.id;
  const currentLesson = lesson?.nodeId === nodeId ? lesson : null;

  useEffect(() => {
    if (!state.profile || !nodeId || !routeNodeId || currentLesson) {
      return;
    }

    let active = true;
    setFailedNodeId(null);
    setWarning(undefined);
    setDegraded(false);
    const warningTimer = window.setTimeout(() => {
      if (active) {
        setWarning(
          "La fuente está tardando. Prepararemos la copia local verificada si hace falta.",
        );
      }
    }, 4_000);

    void requestLesson(state.profile, nodeId)
      .then((response) => {
        if (!active) {
          return;
        }
        setLesson(response.lesson);
        setDegraded(response.degraded);
        setWarning(
          response.degraded
            ? "Modo respaldo: estás viendo una copia local verificada."
            : undefined,
        );
        dispatch({ type: "lesson/loaded", payload: response.lesson });
        if (response.degraded) {
          dispatch({ type: "provider/degraded" });
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        const fallback = getFallbackLesson(nodeId);
        if (!fallback) {
          setFailedNodeId(nodeId);
          return;
        }
        setLesson(fallback);
        setDegraded(true);
        setWarning("Modo respaldo: estás viendo una copia local verificada.");
        dispatch({ type: "lesson/loaded", payload: fallback });
        dispatch({ type: "provider/degraded" });
      })
      .finally(() => window.clearTimeout(warningTimer));

    return () => {
      active = false;
      window.clearTimeout(warningTimer);
    };
  }, [currentLesson, dispatch, nodeId, routeNodeId, state.profile]);

  if (!state.profile) {
    return <Navigate replace to="/interview" />;
  }

  if (!nodeId || !state.route || !routeNode) {
    return <Navigate replace to="/route" />;
  }

  if (failedNodeId === nodeId) {
    return (
      <section className="lesson-page lesson-error">
        <h1>Esta microlección aún no está disponible.</h1>
        <Link className="button button-secondary" to="/route">
          Volver a mi ruta
        </Link>
      </section>
    );
  }

  if (!currentLesson) {
    return (
      <section className="lesson-page lesson-loading" role="status">
        <p>{warning ?? "Consultando la microlección y sus fuentes…"}</p>
      </section>
    );
  }

  return (
    <section className="lesson-page">
      {warning ? (
        <p className="provider-message" role="status">
          {warning}
        </p>
      ) : null}
      <LessonView lesson={currentLesson} degraded={degraded} />
    </section>
  );
}

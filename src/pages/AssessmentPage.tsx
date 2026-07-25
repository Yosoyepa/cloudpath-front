import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import type {
  Attempt,
  Lesson,
} from "../contracts/generated/contracts";
import {
  AssessmentForm,
  type AssessmentSubmission,
} from "../features/assessment/AssessmentForm";
import "../features/assessment/assessment.css";
import {
  evaluateAttempt,
  toLocalSignal,
} from "../features/assessment/evaluateAttempt";
import { requestLesson } from "../features/lesson/requestLesson";
import { useSession } from "../state/SessionProvider";

export default function AssessmentPage() {
  const { nodeId = "" } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useSession();
  const [startedAt] = useState(() => performance.now());
  const [loadedLesson, setLoadedLesson] = useState<Lesson | null>(() =>
    state.activeLesson?.nodeId === nodeId ? state.activeLesson : null,
  );
  const [failedNodeId, setFailedNodeId] = useState<string | null>(null);
  const routeNode = state.route?.nodes.find((node) => node.id === nodeId);
  const routeNodeId = routeNode?.id;
  const lesson =
    loadedLesson?.nodeId === nodeId
      ? loadedLesson
      : state.activeLesson?.nodeId === nodeId
        ? state.activeLesson
        : null;

  useEffect(() => {
    if (!state.profile || !nodeId || !routeNodeId || lesson) {
      return;
    }

    let active = true;
    setFailedNodeId(null);
    void requestLesson(state.profile, nodeId)
      .then((response) => {
        if (!active) {
          return;
        }
        setLoadedLesson(response.lesson);
        dispatch({ type: "lesson/loaded", payload: response.lesson });
        if (response.degraded) {
          dispatch({ type: "provider/degraded" });
        }
      })
      .catch(() => {
        if (active) {
          setFailedNodeId(nodeId);
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch, lesson, nodeId, routeNodeId, state.profile]);

  if (!state.profile) {
    return <Navigate replace to="/interview" />;
  }

  if (!nodeId || !state.route || !routeNode) {
    return <Navigate replace to="/route" />;
  }

  if (failedNodeId === nodeId) {
    return (
      <section className="assessment-page assessment-error">
        <h1>No pudimos preparar esta evaluación.</h1>
        <Link className="button button-secondary" to={`/lesson/${nodeId}`}>
          Volver a la microlección
        </Link>
      </section>
    );
  }

  if (!lesson) {
    return (
      <section className="assessment-page assessment-loading" role="status">
        <p>Preparando tu señal de dominio…</p>
      </section>
    );
  }

  function submitAssessment({
    optionIndex,
    confidence,
  }: AssessmentSubmission) {
    if (!lesson) {
      return;
    }
    const correct = optionIndex === lesson.question.correctOptionIndex;
    const evaluation = evaluateAttempt(correct, confidence);
    const attempt: Attempt = {
      nodeId: lesson.nodeId,
      answer: lesson.question.options[optionIndex] ?? "",
      correct,
      confidence,
      responseTimeMs: Math.min(
        600_000,
        Math.max(0, Math.round(performance.now() - startedAt)),
      ),
      hintsUsed: 0,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "attempt/recorded", payload: attempt });
    dispatch({
      type: "route/local-signal",
      payload: toLocalSignal(lesson.nodeId, evaluation),
    });
    navigate("/route/recalibrated");
  }

  return (
    <section className="assessment-page">
      <header className="assessment-header">
        <p className="assessment-kicker">Evaluación · {lesson.title}</p>
        <h1>
          Una pregunta. Tu respuesta y tu confianza cuentan como evidencia.
        </h1>
      </header>
      <AssessmentForm
        question={lesson.question}
        onSubmit={submitAssessment}
      />
    </section>
  );
}

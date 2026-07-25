import { ArrowRight, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { cloudpathApi } from "../api/cloudpath";
import type {
  AdaptRequest,
  AdaptResponse,
  Attempt,
  LearnerProfile,
  RouteState,
  SourceRef,
} from "../contracts/generated/contracts";
import {
  evaluateAttempt,
  toLocalSignal,
} from "../features/assessment/evaluateAttempt";
import { applyAdaptation } from "../features/route/applyAdaptation";
import { createFallbackDecision } from "../features/route/createFallbackDecision";
import { useSession } from "../state/SessionProvider";
import type { LocalSignal } from "../state/sessionTypes";
import "./recalibrated.css";

type AdaptationResult = AdaptResponse & {
  failedOnline?: boolean;
};

const providerLabels: Record<AdaptResponse["source"], string> = {
  claude: "Claude",
  minimax: "MiniMax",
  deterministic: "Motor local verificado",
};

const pendingAdaptations = new Map<string, Promise<AdaptationResult>>();

function adaptationKey(
  profile: LearnerProfile,
  route: RouteState,
  attempt: Attempt,
): string {
  return JSON.stringify({
    goal: profile.goal,
    experienceLevel: profile.experienceLevel,
    preferredFormats: profile.preferredFormats,
    routeVersion: route.routeVersion,
    nodeIds: route.nodes.map((node) => node.id),
    attempt,
  });
}

function requestAdaptation(
  profile: NonNullable<ReturnType<typeof useSession>["state"]["profile"]>,
  route: RouteState,
  attempt: Attempt,
  localSignal: LocalSignal | null,
): Promise<AdaptationResult> {
  const key = adaptationKey(profile, route, attempt);
  const existing = pendingAdaptations.get(key);
  if (existing) {
    return existing;
  }

  const request = cloudpathApi
    .adapt({
      profile,
      routeVersion: route.routeVersion,
      nodeIds: route.nodes.map((node) => node.id) as AdaptRequest["nodeIds"],
      attempts: [attempt],
    })
    .then((response) => response as AdaptationResult)
    .catch(
      (): AdaptationResult => ({
        decision: createFallbackDecision(
          route.routeVersion,
          localSignal ??
            toLocalSignal(
              attempt.nodeId,
              evaluateAttempt(attempt.correct, attempt.confidence),
            ),
        ),
        degraded: true,
        source: "deterministic",
        failedOnline: true,
      }),
    );

  pendingAdaptations.set(key, request);
  const clear = () => {
    if (pendingAdaptations.get(key) === request) {
      pendingAdaptations.delete(key);
    }
  };
  void request.then(clear, clear);
  return request;
}

function uniqueSources(sources: SourceRef[]): SourceRef[] {
  return sources.filter(
    (source, index, all) =>
      all.findIndex((candidate) => candidate.url === source.url) === index,
  );
}

export default function RecalibratedPage() {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const statusRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    state.lastAdaptation ? "ready" : "loading",
  );
  const [message, setMessage] = useState("");
  const latestAttempt = state.attempts.at(-1) ?? null;

  useEffect(() => {
    if (
      !state.profile ||
      !state.route ||
      !latestAttempt ||
      state.lastAdaptation
    ) {
      return;
    }

    let current = true;
    const routeBefore = state.route;
    const startedAt = performance.now();

    void requestAdaptation(
      state.profile,
      routeBefore,
      latestAttempt,
      state.localSignal,
    ).then(
      (response) => {
        if (!current) {
          return;
        }

        const routeAfter = applyAdaptation(routeBefore, response.decision);
        if (routeAfter === routeBefore) {
          setPhase("error");
          setMessage(
            "La ruta cambió mientras analizábamos tu respuesta. Conservamos la versión vigente.",
          );
          return;
        }

        const finish = () => {
          if (!current) {
            return;
          }
          dispatch({
            type: "adaptation/applied",
            payload: {
              decision: response.decision,
              routeBefore,
              routeAfter,
              source: response.source,
              degraded: response.degraded,
            },
          });
          setMessage(
            response.failedOnline
              ? "Estás sin conexión. Tu ruta en modo respaldo sigue disponible para practicar."
              : response.degraded
                ? "Aplicamos la adaptación local verificada."
                : "El diagnóstico personalizado ya está aplicado.",
          );
          setPhase("ready");
          window.requestAnimationFrame(() => statusRef.current?.focus());
        };

        const remaining = Math.max(0, 520 - (performance.now() - startedAt));
        window.setTimeout(finish, remaining);
      },
    );

    return () => {
      current = false;
    };
  }, [
    dispatch,
    latestAttempt,
    state.lastAdaptation,
    state.localSignal,
    state.profile,
    state.route,
  ]);

  const applied = state.lastAdaptation;
  const insertedNode = useMemo(
    () =>
      applied?.decision.operations.find(
        (operation) => operation.type === "insert_node",
      ),
    [applied],
  );
  const sources = useMemo(
    () =>
      uniqueSources([
        ...(applied?.decision.sourceRefs ?? []),
        ...(insertedNode?.type === "insert_node"
          ? (insertedNode.node.sourceRefs ?? [])
          : []),
      ]),
    [applied, insertedNode],
  );

  if (!state.profile || !state.route || !latestAttempt) {
    return <Navigate replace to="/route" />;
  }

  const attemptedNode =
    applied?.routeBefore.nodes.find(
      (node) => node.id === latestAttempt.nodeId,
    ) ??
    state.route.nodes.find((node) => node.id === latestAttempt.nodeId);
  const attemptedTitle = attemptedNode?.title ?? latestAttempt.nodeId;
  const adjustedNode = applied?.routeAfter.nodes.find(
    (node) => node.id === latestAttempt.nodeId,
  );
  const providerLabel = applied ? providerLabels[applied.source] : null;

  const keepPreviousRoute = () => {
    if (!applied) {
      return;
    }
    dispatch({ type: "route/replaced", payload: applied.routeBefore });
    navigate("/route");
  };

  return (
    <section className="recalibrated-page" aria-labelledby="recalibrated-title">
      <header className="recalibrated-heading">
        <span className="eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          Señal detectada ·{" "}
          {latestAttempt.confidence === "high"
            ? "confianza alta"
            : "confianza baja"}
        </span>
        <h1 id="recalibrated-title">
          {latestAttempt.correct
            ? "Confirmaste tu dominio en"
            : "Detectamos una señal en"}
          <span> {attemptedTitle}.</span>
        </h1>
        {applied ? (
          <>
            <p>
              <strong>Diagnóstico:</strong> {applied.decision.diagnosis}
            </p>
            <p>
              <strong>Decisión:</strong> {applied.decision.rationale}
            </p>
          </>
        ) : (
          <p>
            Estamos recalculando el siguiente paso a partir de tu respuesta y
            nivel de confianza.
          </p>
        )}
      </header>

      {state.localSignal ? (
        <div className="local-signal" aria-live="polite">
          <span>Señal provisional aplicada</span>
          <strong>{state.localSignal.masteryDelta} dominio</strong>
          <small>
            {state.localSignal.kind === "correct_mental_model"
              ? "Corrigiendo modelo mental"
              : "Ajustando el siguiente paso"}
          </small>
        </div>
      ) : null}

      <div
        className={`adaptation-status adaptation-status-${phase}`}
        ref={statusRef}
        role="status"
        tabIndex={phase === "ready" ? -1 : undefined}
      >
        {phase === "loading" ? (
          <>
            <span className="status-pulse" aria-hidden="true" />
            Recalculando el siguiente paso…
          </>
        ) : phase === "error" ? (
          message
        ) : (
          <>
            <ShieldCheck size={18} aria-hidden="true" />
            <strong>
              {applied?.degraded ? "Modo respaldo" : "Diagnóstico personalizado"}
            </strong>
            <span>{message}</span>
            {applied ? <span>Proveedor: {providerLabel}</span> : null}
          </>
        )}
      </div>

      {applied ? (
        <>
          <div className="route-diff" aria-label="Comparación de la ruta">
            <article className="route-diff-card route-diff-before">
              <span>Antes</span>
              <strong>{attemptedTitle}</strong>
              <small>
                Dominio {attemptedNode?.mastery ?? 0}%
              </small>
            </article>
            <ArrowRight className="route-diff-arrow" aria-hidden="true" />
            <article
              className={`route-diff-card ${
                insertedNode ? "route-diff-inserted" : "route-diff-updated"
              }`}
            >
              <span>
                {insertedNode ? "Intervención insertada" : "Dominio actualizado"}
              </span>
              <strong>
                {insertedNode?.type === "insert_node"
                  ? insertedNode.node.title
                  : (adjustedNode?.title ?? attemptedTitle)}
              </strong>
              <small>
                {insertedNode?.type === "insert_node"
                  ? `${insertedNode.node.durationMinutes} min · ${insertedNode.node.format}`
                  : `${adjustedNode?.mastery ?? 0}% de dominio`}
              </small>
            </article>
          </div>

          <div className="recalibrated-actions">
            {insertedNode?.type === "insert_node" ? (
              <Link
                className="button button-primary"
                to={`/lesson/${insertedNode.node.id}`}
              >
                Iniciar práctica guiada
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ) : (
              <Link className="button button-primary" to="/route">
                Volver a mi ruta
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            )}
            <button
              className="button button-quiet"
              type="button"
              onClick={keepPreviousRoute}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Mantener mi ruta anterior
            </button>
          </div>

          {sources.length > 0 ? (
            <aside className="adaptation-sources" aria-label="Fuentes del ajuste">
              <p>Decisión respaldada por documentación oficial</p>
              <ul>
                {sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {source.title}
                    </a>
                    <span>{source.provider}</span>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

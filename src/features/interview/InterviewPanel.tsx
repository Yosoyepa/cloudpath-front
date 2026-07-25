import { ArrowRight, Keyboard, Mic, ShieldCheck } from "lucide-react";
import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { InterviewStatus } from "./interviewMachine";
import type { InterviewRoutePreview } from "./interviewRoutePreview";
import { ProgressiveRoutePreview } from "./ProgressiveRoutePreview";
import { VoiceOrb } from "./VoiceOrb";

interface InterviewPanelProps {
  status: InterviewStatus;
  reason?: string;
  question?: {
    prompt: string;
    placeholder: string;
  };
  step: number;
  total: number;
  answer: string;
  transcript: string;
  validationError?: string;
  preview: InterviewRoutePreview;
  onAnswer: (value: string) => void;
  onConsent: () => void;
  onUseText: () => void;
  onWrittenSubmit: () => void;
  onFinishVoice: () => void;
}

export function InterviewPanel({
  status,
  reason,
  question,
  step,
  total,
  answer,
  transcript,
  validationError,
  preview,
  onAnswer,
  onConsent,
  onUseText,
  onWrittenSubmit,
  onFinishVoice,
}: InterviewPanelProps) {
  const [mobilePane, setMobilePane] = useState<"mentor" | "route">("mentor");
  const mentorTabRef = useRef<HTMLButtonElement>(null);
  const routeTabRef = useRef<HTMLButtonElement>(null);
  const written = status === "text";
  const building = status === "building-route" || status === "submitting";
  const voiceGuidance =
    status === "requesting-token"
      ? "Esperando permiso del micrófono. Solo después prepararemos la conexión."
      : status === "connecting"
        ? "Micrófono listo. Estamos conectando con tu mentor."
        : building
          ? "Ya tengo lo necesario. Estoy ordenando tu ruta personalizada."
        : "Habla con naturalidad. El mentor hará como máximo seis preguntas.";

  function submit(event: FormEvent) {
    event.preventDefault();
    onWrittenSubmit();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const nextPane =
      event.key === "ArrowRight" || event.key === "End"
        ? "route"
        : event.key === "ArrowLeft" || event.key === "Home"
          ? "mentor"
          : null;
    if (!nextPane) {
      return;
    }

    event.preventDefault();
    setMobilePane(nextPane);
    (nextPane === "mentor" ? mentorTabRef : routeTabRef).current?.focus();
  }

  return (
    <>
      <header className="interview-intro">
        <div>
          <p className="interview-kicker">Entrevista inicial</p>
          <h1 id="interview-heading">
            Quiero entender cómo aprendes y qué tanto conoces AWS.
          </h1>
          <p className="interview-summary">
            Serán menos de cinco minutos. Puedes hablar o escribir; los
            subtítulos siempre están visibles.
          </p>
        </div>
        <p className="interview-progress" aria-label="Progreso de la entrevista">
          <span>Pregunta</span>
          <strong>
            {Math.min(step + 1, total)} / {total}
          </strong>
        </p>
      </header>

      <div
        className="interview-mobile-tabs"
        role="tablist"
        aria-label="Vista en móvil"
      >
        <button
          type="button"
          role="tab"
          id="interview-tab-mentor"
          aria-controls="interview-pane-mentor"
          aria-selected={mobilePane === "mentor"}
          tabIndex={mobilePane === "mentor" ? 0 : -1}
          ref={mentorTabRef}
          onKeyDown={handleTabKeyDown}
          onClick={() => setMobilePane("mentor")}
        >
          Mentor
        </button>
        <button
          type="button"
          role="tab"
          id="interview-tab-route"
          aria-controls="interview-pane-route"
          aria-selected={mobilePane === "route"}
          tabIndex={mobilePane === "route" ? 0 : -1}
          ref={routeTabRef}
          onKeyDown={handleTabKeyDown}
          onClick={() => setMobilePane("route")}
        >
          Mi ruta
        </button>
      </div>

      <div className="interview-layout" data-mobile-pane={mobilePane}>
        <section
          className="mentor-pane"
          id="interview-pane-mentor"
          role="tabpanel"
          aria-labelledby="interview-tab-mentor interview-heading"
        >
          {status === "idle" ? (
            <div className="consent-card interview-panel">
              <div className="consent-heading">
                <ShieldCheck aria-hidden="true" size={20} />
                <h2>Tu voz permanece en la conversación</h2>
              </div>
              <p>
                Usaremos el micrófono durante esta entrevista. No guardamos el
                audio y puedes continuar por escrito en cualquier momento.
              </p>
              <div className="consent-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={onConsent}
                >
                  <Mic aria-hidden="true" size={17} />
                  Permitir micrófono
                </button>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={onUseText}
                >
                  <Keyboard aria-hidden="true" size={17} />
                  Responder por escrito
                </button>
              </div>
            </div>
          ) : null}

          {!written && status !== "idle" ? (
            <div className="voice-session interview-panel">
              <VoiceOrb status={status} />
              <p className="voice-guidance">{voiceGuidance}</p>
              {!building ? (
                <button
                  className="text-action"
                  type="button"
                  onClick={onUseText}
                >
                  <Keyboard aria-hidden="true" size={16} />
                  Continuar por escrito
                </button>
              ) : null}
            </div>
          ) : null}

          <section
            className="transcript-card interview-panel"
            aria-label="Transcripción"
          >
            <div className="transcript-heading">
              <span>Pregunta actual</span>
              <span className="question-progress">
                <span className="question-dots" aria-hidden="true">
                  {Array.from({ length: total }, (_, index) => (
                    <span
                      className={index <= step ? "is-active" : undefined}
                      key={index}
                    />
                  ))}
                </span>
                <span className="question-count">
                  {Math.min(step + 1, total)} / {total}
                </span>
              </span>
            </div>
            {question ? (
              <p className="agent-question">{question.prompt}</p>
            ) : null}
            <hr />
            <p className="user-transcript" aria-live="polite">
              {transcript ||
                "Tu respuesta aparecerá aquí, también como texto."}
            </p>
          </section>

          {written && question ? (
            <form
              className="written-interview interview-panel"
              onSubmit={submit}
            >
              <div className="step-label">
                Señal {step + 1} de {total}
              </div>
              <label htmlFor="interview-answer">{question.prompt}</label>
              <textarea
                id="interview-answer"
                value={answer}
                onChange={(event) => onAnswer(event.target.value)}
                placeholder={question.placeholder}
                rows={5}
                autoFocus
                aria-describedby={
                  validationError ? "interview-answer-error" : undefined
                }
                aria-invalid={Boolean(validationError)}
              />
              {validationError ? (
                <p
                  className="field-error"
                  id="interview-answer-error"
                  role="alert"
                >
                  {validationError}
                </p>
              ) : null}
              <button className="button button-primary" type="submit">
                {step + 1 === total ? "Crear mi perfil" : "Continuar"}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </form>
          ) : null}

          {reason ? (
            <p className="provider-message" role="status">
              {reason}
            </p>
          ) : null}
        </section>

        <aside
          className="route-pane"
          id="interview-pane-route"
          role="tabpanel"
          aria-labelledby="interview-tab-route"
        >
          <ProgressiveRoutePreview preview={preview} building={building} />
          {!written && status !== "idle" && !building ? (
            <div className="route-action">
              <p>
                Cuando termines de responder, construiremos la primera versión
                de tu ruta.
              </p>
              <button
                className="button button-primary"
                type="button"
                disabled={!transcript.trim()}
                onClick={onFinishVoice}
              >
                Terminar y crear mi ruta
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

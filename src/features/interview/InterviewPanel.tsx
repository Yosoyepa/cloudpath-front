import { ArrowRight, Keyboard, Mic, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";

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

  return (
    <div className="interview-layout">
      <section className="interview-stage" aria-labelledby="interview-heading">
        <div className="interview-kicker">Entrevista adaptativa · 3–4 min</div>
        <h1 id="interview-heading">
          Primero entendemos <span>cómo funcionas.</span>
        </h1>

        {status === "idle" ? (
          <div className="consent-card">
            <ShieldCheck aria-hidden="true" size={21} />
            <div>
              <h2>Tu voz permanece en la conversación</h2>
              <p>
                Usaremos el micrófono durante esta entrevista. No guardamos el
                audio y puedes continuar por escrito en cualquier momento.
              </p>
            </div>
            <div className="consent-actions">
              <button className="button button-primary" onClick={onConsent}>
                <Mic aria-hidden="true" size={17} />
                Permitir micrófono
              </button>
              <button className="button button-quiet" onClick={onUseText}>
                <Keyboard aria-hidden="true" size={17} />
                Responder por escrito
              </button>
            </div>
          </div>
        ) : null}

        {written && question ? (
          <form className="written-interview" onSubmit={submit}>
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

        {!written && status !== "idle" ? (
          <div className="voice-session">
            <VoiceOrb status={status} />
            <p className="voice-guidance">
              {voiceGuidance}
            </p>
            {!building ? (
              <>
                <button
                  className="button button-primary"
                  disabled={!transcript.trim()}
                  onClick={onFinishVoice}
                >
                  Terminar y crear mi ruta
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
                <button className="text-action" onClick={onUseText}>
                  Continuar por escrito
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {reason ? (
          <p className="provider-message" role="status">
            {reason}
          </p>
        ) : null}
      </section>

      <aside className="transcript-panel" aria-label="Transcripción">
        <div className="transcript-heading">
          <span>Transcripción en vivo</span>
          <span className="live-dot">LIVE</span>
        </div>
        <pre aria-live="polite">
          {transcript || "Tus respuestas aparecerán aquí mientras conversas."}
        </pre>
        <ProgressiveRoutePreview preview={preview} building={building} />
      </aside>
    </div>
  );
}

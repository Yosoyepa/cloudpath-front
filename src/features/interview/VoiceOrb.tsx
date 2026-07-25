import type { InterviewStatus } from "./interviewMachine";

const labels: Record<InterviewStatus, string> = {
  idle: "Listo",
  "requesting-token": "Preparando voz",
  connecting: "Conectando",
  listening: "Escuchando",
  speaking: "Mentor hablando",
  "building-route": "Ordenando tu ruta",
  text: "Modo escrito",
  submitting: "Creando perfil",
  complete: "Entrevista completa",
  error: "Modo respaldo",
};

const visualStates: Record<
  InterviewStatus,
  "idle" | "listening" | "speaking" | "interpreting" | "unavailable"
> = {
  idle: "idle",
  "requesting-token": "interpreting",
  connecting: "interpreting",
  listening: "listening",
  speaking: "speaking",
  "building-route": "interpreting",
  text: "unavailable",
  submitting: "interpreting",
  complete: "idle",
  error: "unavailable",
};

export function VoiceOrb({ status }: { status: InterviewStatus }) {
  const visualState = visualStates[status];
  const live = status === "listening";

  return (
    <div className="voice-orb-wrap">
      <div
        className="voice-orb"
        data-state={visualState}
        role="img"
        aria-label={`Estado del mentor de voz: ${labels[status]}`}
      >
        {(["idle", "listening", "speaking", "interpreting"] as const).map(
          (videoState) => (
            <video
              className="voice-orb-video"
              data-orb-video={videoState}
              src={`/media/orb-${videoState}.mp4`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              key={videoState}
            />
          ),
        )}
      </div>
      <div className="voice-waveform" data-live={live} aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <span className="voice-orb-label" aria-live="polite">
        {labels[status]}
      </span>
    </div>
  );
}

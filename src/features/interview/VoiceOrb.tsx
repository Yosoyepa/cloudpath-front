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

export function VoiceOrb({ status }: { status: InterviewStatus }) {
  return (
    <div className="voice-orb-wrap">
      <div className={`voice-orb voice-orb--${status}`} aria-hidden="true">
        {Array.from({ length: 25 }, (_, index) => (
          <span key={index} style={{ "--dot-index": index } as React.CSSProperties} />
        ))}
      </div>
      <span className="voice-orb-label">{labels[status]}</span>
    </div>
  );
}

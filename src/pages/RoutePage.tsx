import {
  ArrowRight,
  BookOpen,
  Check,
  CircleDot,
  Lock,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { LearningMap } from "../features/route/LearningMap";
import { useSession } from "../state/SessionProvider";
import "../styles/react-flow.css";

const experienceLabels = {
  none: "Sin experiencia",
  beginner: "Experiencia inicial",
  intermediate: "Experiencia intermedia",
  advanced: "Experiencia avanzada",
} as const;

const formatLabels = {
  video: "Video",
  text: "Lectura",
  practice: "Práctica",
  oral_explanation: "Explicación",
} as const;

export default function RoutePage() {
  const { state } = useSession();
  const navigate = useNavigate();
  const route = state.route;
  const profile = state.profile;
  const activeNode = route?.nodes.find(
    (node) => node.id === route.activeNodeId,
  );

  return (
    <div className="route-page">
      <header className="route-page__header">
        <p className="eyebrow">Mapa de aprendizaje</p>
        <h1>Tu ruta Cloud Practitioner</h1>
        {profile ? (
          <div className="route-profile-pills" aria-label="Perfil de estudio">
            <span className="pill pill-cyan">
              {Math.max(1, Math.round(profile.weeklyMinutes / 60))} h/semana
            </span>
            <span className="pill pill-cyan">
              {experienceLabels[profile.experienceLevel]}
            </span>
            <span className="pill pill-cyan">
              {formatLabels[profile.preferredFormats[0]]}
            </span>
          </div>
        ) : null}
      </header>

      {route ? (
        <>
          <section className="route-explanation">
            <Sparkles size={18} aria-hidden="true" />
            <p>
              Esta ruta parte de tus señales actuales y se recalibra cuando tu
              evidencia cambia.
            </p>
          </section>

          <div className="route-workspace">
            <LearningMap
              route={route}
              onOpenNode={(nodeId) => navigate(`/lesson/${nodeId}`)}
            />

            <aside className="route-sidebar" aria-label="Resumen de tu ruta">
              <section className="panel route-legend" aria-labelledby="legend-title">
                <h2 id="legend-title">Leyenda</h2>
                <ul>
                  <li>
                    <Check size={14} aria-hidden="true" />
                    <span>Dominado · evidencia demostrada</span>
                  </li>
                  <li>
                    <CircleDot size={14} aria-hidden="true" />
                    <span>Activo · actividad disponible</span>
                  </li>
                  <li>
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>Brecha · necesita refuerzo</span>
                  </li>
                  <li>
                    <Sparkles size={14} aria-hidden="true" />
                    <span>Nueva práctica · añadida por adaptación</span>
                  </li>
                  <li>
                    <Lock size={14} aria-hidden="true" />
                    <span>Bloqueado · requiere un prerrequisito</span>
                  </li>
                </ul>
              </section>

              {activeNode ? (
                <section className="panel route-next-step" aria-label="Siguiente paso">
                  <span className="route-next-step__icon" aria-hidden="true">
                    <BookOpen size={18} />
                  </span>
                  <div>
                    <span>Siguiente actividad</span>
                    <strong>{activeNode.title}</strong>
                    <small>
                      {activeNode.durationMinutes} min · dominio{" "}
                      {activeNode.mastery}%
                    </small>
                  </div>
                  <Link
                    className="button button-primary"
                    to={`/lesson/${activeNode.id}`}
                  >
                    Continuar con {activeNode.title}
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </section>
              ) : null}
            </aside>
          </div>
        </>
      ) : (
        <section className="route-page__empty" aria-label="Sin ruta todavía">
          <p>
            Todavía no tienes una ruta. Completa la entrevista para construir
            tu trayectoria personalizada.
          </p>
          <Link className="button button-primary" to="/interview">
            Construir mi ruta
          </Link>
        </section>
      )}
    </div>
  );
}

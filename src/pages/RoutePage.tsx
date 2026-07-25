import { ArrowRight, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/react-flow.css";
import { LearningMap } from "../features/route/LearningMap";
import { useSession } from "../state/SessionProvider";

export default function RoutePage() {
  const { state } = useSession();
  const navigate = useNavigate();
  const route = state.route;
  const activeNode = route?.nodes.find(
    (node) => node.id === route.activeNodeId,
  );

  return (
    <div className="route-page">
      <header className="route-page__header">
        <h1>Tu ruta Cloud Practitioner</h1>
        {route ? (
          <p className="route-page__lead">
            Sigue el paso actual. La ruta se recalibra cuando tu evidencia
            cambia.
          </p>
        ) : null}
      </header>

      {route ? (
        <>
          {activeNode ? (
            <aside className="route-next-step" aria-label="Siguiente paso">
              <span className="route-next-step__icon" aria-hidden="true">
                <BookOpen size={20} />
              </span>
              <div>
                <span>Tu siguiente señal</span>
                <strong>{activeNode.title}</strong>
                <small>
                  {activeNode.durationMinutes} min · dominio {activeNode.mastery}%
                </small>
              </div>
              <Link
                className="button button-primary"
                to={`/lesson/${activeNode.id}`}
              >
                Continuar con {activeNode.title}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </aside>
          ) : null}
          <LearningMap
            route={route}
            onOpenNode={(nodeId) => navigate(`/lesson/${nodeId}`)}
          />
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

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { InterviewRoutePreview } from "./interviewRoutePreview";
import "./progressiveRoutePreview.css";

export function ProgressiveRoutePreview({
  preview,
  building,
}: {
  preview: InterviewRoutePreview;
  building: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <section className="progressive-route" aria-label="Ruta provisional">
      <div className="progressive-route__heading" aria-live="polite">
        <h2>Tu mapa en construcción</h2>
        <span className="progressive-route__pill">
          {building ? "Estabilizando…" : "Crece con la entrevista"}
        </span>
      </div>
      <div className="progressive-route__canvas">
        {preview.nodes.length > 0 ? (
          <ol className="progressive-route__nodes">
            <AnimatePresence initial={false}>
              {preview.nodes.map((node, index) => (
                <motion.li
                  key={node.id}
                  data-node-id={node.id}
                  initial={{
                    opacity: 0,
                    y: reduceMotion ? 0 : 12,
                    scale: reduceMotion ? 1 : 0.96,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: reduceMotion ? 0.12 : 0.52,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span className="progressive-route__status" aria-hidden="true" />
                  <span className="progressive-route__node-copy">
                    <strong>{node.title}</strong>
                    <small>Paso {String(index + 1).padStart(2, "0")}</small>
                  </span>
                  <span className="progressive-route__format">
                    {node.format.replace("_", " ")}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        ) : (
          <p className="progressive-route__empty">
            Cada respuesta agrega dominios y conexiones. El mapa se completa al
            finalizar la entrevista.
          </p>
        )}
      </div>
      <div className="progressive-route__signals">
        <span>Pasos detectados</span>
        <strong>{preview.nodes.length}</strong>
      </div>
      <div className="progressive-route__footer">
        <p>
          Tus respuestas bastan para construir la primera versión de tu ruta.
        </p>
        <span>
          {building
            ? "Ordenando conexiones…"
            : `${preview.nodes.length} pasos estimados`}
        </span>
      </div>
    </section>
  );
}

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
        <span>Ruta provisional</span>
        <span>
          {building ? "Estabilizando…" : `${preview.nodes.length} pasos estimados`}
        </span>
      </div>
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
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{node.title}</strong>
              <small>{node.format.replace("_", " ")}</small>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

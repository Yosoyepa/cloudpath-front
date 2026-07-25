import { useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Route as RouteIcon } from "lucide-react";
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

import { landingCopy } from "../../content/copy";
import {
  GAP_WINDOW,
  IGNITION_EDGES,
  IGNITION_NODES,
  IGNITION_VIEWBOX,
  MASTERY_WINDOW,
  REFLOW_X,
  REFLOW_Y,
  REROUTE_WINDOW,
  SIGNAL_PULSE,
  reflowedPosition,
  routeIgnitionPhase,
  useStaticIgnitionScene,
  type IgnitionEdge,
  type IgnitionNode,
  type IgnitionPhase,
} from "./routeIgnitionModel";
import "./routeIgnition.css";

const NODE_WIDTH = 104;
const NODE_HEIGHT = 34;

/**
 * Route Ignition: one sticky scene (~240vh) that proves the product in the
 * first viewport. Copy and CTA are ordinary DOM and never move; only the
 * trajectory, nodes, evidence and halos respond to scroll progress.
 */
export function RouteIgnition() {
  const trackRef = useRef<HTMLElement | null>(null);
  const staticScene = useStaticIgnitionScene();

  return (
    <section
      ref={trackRef}
      className={
        staticScene ? "ignition-track ignition-track--static" : "ignition-track"
      }
      aria-labelledby="ignition-title"
    >
      <div className="ignition-sticky">
        <div className="ignition-copy">
          <img
            className="ignition-mark"
            src="/brand/cloudpath-mark.svg"
            alt=""
            width={44}
            height={44}
          />
          <p className="eyebrow">{landingCopy.eyebrow}</p>
          <h1 id="ignition-title">
            {landingCopy.headlineLead} <span>{landingCopy.headlineAccent}</span>
          </h1>
          <p className="ignition-support">{landingCopy.support}</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/interview">
              {landingCopy.primaryCta}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <span className="route-proof">
              <RouteIcon aria-hidden="true" size={17} />
              {landingCopy.proof}
            </span>
          </div>
        </div>
        <LazyMotion features={domAnimation}>
          {staticScene ? <StaticScene /> : <ScrubScene target={trackRef} />}
        </LazyMotion>
        <p className="sr-only">{landingCopy.sceneSummary}</p>
      </div>
    </section>
  );
}

function NodeGlyph({
  node,
  cx,
  cy,
  mastered,
}: {
  node: IgnitionNode;
  cx: number;
  cy: number;
  mastered: boolean;
}) {
  return (
    <g className={`ignition-node ignition-node--${node.tone}`}>
      <rect
        x={cx - NODE_WIDTH / 2}
        y={cy - NODE_HEIGHT / 2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={NODE_HEIGHT / 2}
      />
      <text x={cx} y={cy + 3.5} textAnchor="middle">
        {node.label}
      </text>
      {mastered ? <circle className="ignition-node-mastery" cx={cx + 40} cy={cy - 13} r={4} /> : null}
    </g>
  );
}

function SceneTags({ phase }: { phase: IgnitionPhase }) {
  return (
    <>
      <p
        className={
          phase === "gap"
            ? "ignition-tag ignition-tag--gap ignition-tag--visible"
            : "ignition-tag ignition-tag--gap"
        }
      >
        {landingCopy.gapLabel}
      </p>
      <p
        className={
          phase === "reroute" || phase === "mastery"
            ? "ignition-tag ignition-tag--violet ignition-tag--visible"
            : "ignition-tag ignition-tag--violet"
        }
      >
        {landingCopy.insertedLabel}
      </p>
      <p
        className={
          phase === "mastery"
            ? "ignition-tag ignition-tag--green ignition-tag--visible"
            : "ignition-tag ignition-tag--green"
        }
      >
        {landingCopy.recalibratedLabel}
      </p>
    </>
  );
}

function ScrubEdge({
  edge,
  progress,
  gapOpacity,
}: {
  edge: IgnitionEdge;
  progress: MotionValue<number>;
  gapOpacity: MotionValue<number>;
}) {
  const pathLength = useTransform(progress, [edge.drawStart, edge.drawEnd], [0, 1]);
  const gapFade = useTransform(
    progress,
    [REROUTE_WINDOW.start, REROUTE_WINDOW.start + 0.08],
    [1, 0],
  );

  if (edge.kind === "gap") {
    return (
      <g>
        <m.path
          className="ignition-edge"
          d={edge.d}
          style={{ pathLength, opacity: gapFade }}
        />
        <m.path
          className="ignition-edge ignition-edge--gapline"
          d={edge.d}
          style={{ pathLength, opacity: gapOpacity }}
        />
      </g>
    );
  }

  return (
    <m.path
      className={
        edge.kind === "violet" ? "ignition-edge ignition-edge--violet" : "ignition-edge"
      }
      d={edge.d}
      style={{ pathLength }}
    />
  );
}

function ScrubNode({
  node,
  progress,
  masteryOpacity,
}: {
  node: IgnitionNode;
  progress: MotionValue<number>;
  masteryOpacity: MotionValue<number>;
}) {
  const opacity = useTransform(progress, [node.appearAt, node.appearAt + 0.05], [0, 1]);
  const scale = useTransform(progress, [node.appearAt, node.appearAt + 0.07], [0.82, 1]);
  const mastered = node.tone === "done" || node.tone === "active";

  return (
    <m.g className="ignition-node-enter" style={{ opacity, scale }}>
      <NodeGlyph node={node} cx={node.cx} cy={node.cy} mastered={false} />
      {mastered ? (
        <m.circle
          className="ignition-node-mastery"
          cx={node.cx + 40}
          cy={node.cy - 13}
          r={4}
          style={{ opacity: masteryOpacity }}
        />
      ) : null}
    </m.g>
  );
}

function ScrubScene({ target }: { target: RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });

  const reflowX = useTransform(
    scrollYProgress,
    [REROUTE_WINDOW.start, REROUTE_WINDOW.end],
    [0, REFLOW_X],
  );
  const reflowY = useTransform(
    scrollYProgress,
    [REROUTE_WINDOW.start, REROUTE_WINDOW.end],
    [0, REFLOW_Y],
  );
  const pulseOpacity = useTransform(
    scrollYProgress,
    [0.02, 0.07, 0.12, 0.18],
    [0, 1, 0.4, 0],
  );
  const gapOpacity = useTransform(
    scrollYProgress,
    [GAP_WINDOW.appear, GAP_WINDOW.settled, GAP_WINDOW.fadeStart, GAP_WINDOW.gone],
    [0, 1, 1, 0],
  );
  const masteryOpacity = useTransform(
    scrollYProgress,
    [MASTERY_WINDOW.start, MASTERY_WINDOW.settled],
    [0, 1],
  );

  // HTML evidence tags follow the discrete phase model instead of per-frame
  // MotionValues; they re-render only when the phase actually changes.
  const [phase, setPhase] = useState<IgnitionPhase>(() =>
    routeIgnitionPhase(scrollYProgress.get()),
  );
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = routeIgnitionPhase(value);
    setPhase((previous) => (previous === next ? previous : next));
  });

  const staticEdges = IGNITION_EDGES.filter((edge) => !edge.reflows);
  const reflowEdges = IGNITION_EDGES.filter((edge) => edge.reflows);
  const staticNodes = IGNITION_NODES.filter((node) => !node.reflows);
  const reflowNodes = IGNITION_NODES.filter((node) => node.reflows);

  return (
    <div className="ignition-scene">
      <svg
        viewBox={IGNITION_VIEWBOX}
        aria-hidden="true"
        focusable="false"
        role="presentation"
      >
        <g>
          {staticEdges.map((edge) => (
            <ScrubEdge
              key={edge.id}
              edge={edge}
              progress={scrollYProgress}
              gapOpacity={gapOpacity}
            />
          ))}
        </g>
        <m.g style={{ x: reflowX, y: reflowY }}>
          {reflowEdges.map((edge) => (
            <ScrubEdge
              key={edge.id}
              edge={edge}
              progress={scrollYProgress}
              gapOpacity={gapOpacity}
            />
          ))}
        </m.g>
        <m.circle
          className="ignition-pulse"
          cx={SIGNAL_PULSE.cx}
          cy={SIGNAL_PULSE.cy}
          r={10}
          style={{ opacity: pulseOpacity }}
        />
        <m.circle
          className="ignition-pulse-halo"
          cx={SIGNAL_PULSE.cx}
          cy={SIGNAL_PULSE.cy}
          r={20}
          style={{ opacity: pulseOpacity }}
        />
        <g>
          {staticNodes.map((node) => (
            <ScrubNode
              key={node.id}
              node={node}
              progress={scrollYProgress}
              masteryOpacity={masteryOpacity}
            />
          ))}
        </g>
        <m.g style={{ x: reflowX, y: reflowY }}>
          {reflowNodes.map((node) => (
            <ScrubNode
              key={node.id}
              node={node}
              progress={scrollYProgress}
              masteryOpacity={masteryOpacity}
            />
          ))}
        </m.g>
      </svg>
      <SceneTags phase={phase} />
    </div>
  );
}

/**
 * Final stable composition: reduced motion, mobile and save-data. Same
 * content, same CTA, no scrub.
 */
function StaticScene() {
  return (
    <div className="ignition-scene">
      <svg
        viewBox={IGNITION_VIEWBOX}
        aria-hidden="true"
        focusable="false"
        role="presentation"
      >
        {IGNITION_EDGES.filter((edge) => edge.kind !== "gap").map((edge) => (
          <path
            key={edge.id}
            className={
              edge.kind === "violet" ? "ignition-edge ignition-edge--violet" : "ignition-edge"
            }
            d={edge.d}
          />
        ))}
        {IGNITION_NODES.map((node) => {
          const { cx, cy } = reflowedPosition(node);
          return (
            <NodeGlyph
              key={node.id}
              node={node}
              cx={cx}
              cy={cy}
              mastered={node.tone === "done" || node.tone === "active"}
            />
          );
        })}
      </svg>
      <SceneTags phase="mastery" />
    </div>
  );
}

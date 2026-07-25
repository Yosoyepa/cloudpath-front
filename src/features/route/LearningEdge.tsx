import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type LearningEdgeState = "default" | "active" | "gap";

export interface LearningEdgeData extends Record<string, unknown> {
  state: LearningEdgeState;
}

export type LearningFlowEdge = Edge<LearningEdgeData, "learning">;

/**
 * Thin, quiet prerequisite edge. State is semantic: cyan marks the path into
 * the active step, orange marks a path that needs review. Meaning is also
 * carried by the adjacent node labels, never by stroke color alone.
 */
export function LearningEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<LearningFlowEdge>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const state = data?.state ?? "default";

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      className={`learning-edge learning-edge--${state}`}
    />
  );
}

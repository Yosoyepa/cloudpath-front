import type {
  LearningFormat,
  LearningNode,
  NodeStatus,
  RouteState,
} from "../../contracts/generated/contracts";

/**
 * Deterministic prerequisite-depth layout for the learning map.
 *
 * The MVP map holds 6 to 10 nodes, so a bounded layered layout on a fixed
 * grid is enough and keeps the bundle free of Dagre. Depth comes from the
 * longest prerequisite chain; nodes sharing a depth are ordered by domain
 * and then by id so the output is stable for a given RouteState.
 */

export const GRID_COLUMN_WIDTH = 260;
export const GRID_ROW_HEIGHT = 132;

export interface PositionedPoint {
  depth: number;
  row: number;
  x: number;
  y: number;
}

export interface PositionedRoute {
  /** Position per node id. */
  byId: Record<string, PositionedPoint>;
  /** Node ids in prerequisite reading order (depth, then domain, then id). */
  orderedIds: string[];
  /** Non-fatal data issues found while laying out the route. */
  warnings: string[];
  /** Grid extent in pixels. */
  width: number;
  height: number;
}

function compareNodes(a: LearningNode, b: LearningNode): number {
  const byDomain = a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0;
  if (byDomain !== 0) return byDomain;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function layoutRoute(route: RouteState): PositionedRoute {
  const warnings: string[] = [];
  const nodesById = new Map<string, LearningNode>();

  for (const node of route.nodes) {
    if (nodesById.has(node.id)) {
      warnings.push(`duplicate node id "${node.id}" ignored`);
      continue;
    }
    nodesById.set(node.id, node);
  }

  const depthMemo = new Map<string, number>();
  const visiting = new Set<string>();

  const depthOf = (node: LearningNode): number => {
    const memoized = depthMemo.get(node.id);
    if (memoized !== undefined) return memoized;
    if (visiting.has(node.id)) {
      warnings.push(`cycle detected at node "${node.id}"; back edge ignored`);
      return -1;
    }
    visiting.add(node.id);
    let depth = 0;
    for (const prerequisiteId of node.prerequisites ?? []) {
      const prerequisite = nodesById.get(prerequisiteId);
      if (!prerequisite) {
        warnings.push(
          `unknown prerequisite "${prerequisiteId}" on node "${node.id}" ignored`,
        );
        continue;
      }
      depth = Math.max(depth, depthOf(prerequisite) + 1);
    }
    visiting.delete(node.id);
    depthMemo.set(node.id, depth);
    return depth;
  };

  const byDepth = new Map<number, LearningNode[]>();
  for (const node of nodesById.values()) {
    const depth = depthOf(node);
    const column = byDepth.get(depth);
    if (column) column.push(node);
    else byDepth.set(depth, [node]);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const byId: Record<string, PositionedPoint> = {};
  const orderedIds: string[] = [];
  let maxRows = 0;

  for (const depth of depths) {
    const column = (byDepth.get(depth) ?? []).sort(compareNodes);
    maxRows = Math.max(maxRows, column.length);
    column.forEach((node, row) => {
      byId[node.id] = {
        depth,
        row,
        x: depth * GRID_COLUMN_WIDTH,
        y: row * GRID_ROW_HEIGHT,
      };
      orderedIds.push(node.id);
    });
  }

  const maxDepth = depths.length > 0 ? depths[depths.length - 1] : 0;
  return {
    byId,
    orderedIds,
    warnings,
    width: (maxDepth + 1) * GRID_COLUMN_WIDTH,
    height: maxRows * GRID_ROW_HEIGHT,
  };
}

/**
 * Semantic, text-first labels so state never depends on color alone.
 * `active` is derived from `RouteState.activeNodeId` and takes precedence
 * over the raw status when the node can still be opened.
 */
export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  locked: "Bloqueado",
  available: "Disponible",
  in_progress: "En curso",
  mastered: "Dominado",
  needs_review: "Repasar",
};

export const ACTIVE_NODE_LABEL = "Paso actual";

export const FORMAT_LABELS: Record<LearningFormat, string> = {
  video: "Video",
  text: "Lectura",
  practice: "Práctica",
  oral_explanation: "Explicación oral",
};

export function isNodeOpenable(
  node: LearningNode,
  activeNodeId?: string | null,
): boolean {
  if (node.id === activeNodeId) return true;
  return (
    node.status === "available" ||
    node.status === "in_progress" ||
    node.status === "needs_review"
  );
}

export function nodeStatusLabel(
  node: LearningNode,
  activeNodeId?: string | null,
): string {
  if (node.id === activeNodeId && node.status !== "mastered") {
    return ACTIVE_NODE_LABEL;
  }
  return NODE_STATUS_LABELS[node.status];
}

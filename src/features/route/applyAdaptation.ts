import type {
  AdaptationDecision,
  AdaptationOperation,
  InsertNodeOperation,
  LearningEdge,
  LearningNode,
  ReinforceNodeOperation,
  RouteState,
} from "../../contracts/generated/contracts";

const MAX_OPERATIONS = 4;
const MIN_MASTERY = 0;
const MAX_MASTERY = 100;

function clampMastery(value: number): number {
  return Math.min(MAX_MASTERY, Math.max(MIN_MASTERY, value));
}

function isReinforceNode(
  operation: AdaptationOperation,
): operation is ReinforceNodeOperation {
  return operation.type === "reinforce_node";
}

function isInsertNode(
  operation: AdaptationOperation,
): operation is InsertNodeOperation {
  return operation.type === "insert_node";
}

function edgeKey(edge: LearningEdge): string {
  return `${edge.source}\u0000${edge.target}`;
}

function isSafeNode(node: LearningNode): boolean {
  const prerequisites = Array.from(node.prerequisites ?? []);
  return (
    typeof node.id === "string" &&
    node.id.length > 0 &&
    Number.isFinite(node.mastery) &&
    Number.isFinite(node.durationMinutes) &&
    node.durationMinutes > 0 &&
    !prerequisites.includes(node.id)
  );
}

/**
 * Applies the browser allowlist for an adaptation as one transaction.
 *
 * Returning the original reference is intentional: callers can distinguish a
 * rejected/stale patch from an accepted patch without partially mutating the
 * learning route.
 */
export function applyAdaptation(
  route: RouteState,
  decision: AdaptationDecision,
): RouteState {
  if (
    decision.requestRouteVersion !== route.routeVersion ||
    decision.operations.length === 0 ||
    decision.operations.length > MAX_OPERATIONS
  ) {
    return route;
  }

  const supportedOperations = decision.operations.filter(
    (operation): operation is InsertNodeOperation | ReinforceNodeOperation =>
      isInsertNode(operation) || isReinforceNode(operation),
  );

  if (supportedOperations.length !== decision.operations.length) {
    return route;
  }

  const nodes: LearningNode[] = route.nodes.map((node) => ({
    ...node,
    sourceRefs: node.sourceRefs ? [...node.sourceRefs] : undefined,
  }));
  const edges = (route.edges ?? []).map((edge) => ({ ...edge }));
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const operationTargets = new Set<string>();
  const edgeKeys = new Set(edges.map(edgeKey));

  for (const operation of supportedOperations) {
    const targetId =
      operation.type === "insert_node" ? operation.node.id : operation.nodeId;

    if (operationTargets.has(targetId)) {
      return route;
    }
    operationTargets.add(targetId);

    if (operation.type === "reinforce_node") {
      const nodeIndex = nodes.findIndex(
        (node) => node.id === operation.nodeId,
      );
      if (
        nodeIndex < 0 ||
        !Number.isFinite(operation.masteryDelta)
      ) {
        return route;
      }

      const node = nodes[nodeIndex];
      nodes[nodeIndex] = {
        ...node,
        mastery: clampMastery(node.mastery + operation.masteryDelta),
        status:
          operation.masteryDelta < 0 && node.status !== "locked"
            ? "needs_review"
            : node.status,
      };
      continue;
    }

    const { afterNodeId, node } = operation;
    const anchorIndex = nodes.findIndex(
      (candidate) => candidate.id === afterNodeId,
    );
    if (
      anchorIndex < 0 ||
      knownNodeIds.has(node.id) ||
      !isSafeNode(node)
    ) {
      return route;
    }

    const prerequisites = Array.from(
      new Set([...(node.prerequisites ?? []), afterNodeId]),
    );
    if (
      prerequisites.length > 6 ||
      prerequisites.some(
        (prerequisite) =>
          prerequisite === node.id || !knownNodeIds.has(prerequisite),
      )
    ) {
      return route;
    }

    const insertedNode: LearningNode = {
      ...node,
      mastery: clampMastery(node.mastery),
      prerequisites: prerequisites as LearningNode["prerequisites"],
      sourceRefs: node.sourceRefs ? [...node.sourceRefs] : undefined,
    };

    nodes.splice(anchorIndex + 1, 0, insertedNode);
    knownNodeIds.add(insertedNode.id);

    for (const prerequisite of prerequisites) {
      const edge = { source: prerequisite, target: insertedNode.id };
      const key = edgeKey(edge);
      if (!edgeKeys.has(key)) {
        edges.push(edge);
        edgeKeys.add(key);
      }
    }
  }

  return {
    ...route,
    routeVersion: route.routeVersion + 1,
    nodes: nodes as RouteState["nodes"],
    edges,
  };
}

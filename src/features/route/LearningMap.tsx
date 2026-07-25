import {
  applyNodeChanges,
  Controls,
  ReactFlow,
  useNodesState,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import { List, Map as MapIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { RouteState } from "../../contracts/generated/contracts";
import { AdaptiveMapNode, type AdaptiveFlowNode } from "./AdaptiveMapNode";
import {
  LearningEdge,
  type LearningEdgeState,
  type LearningFlowEdge,
} from "./LearningEdge";
import { isNodeOpenable, layoutRoute, nodeStatusLabel } from "./routeLayout";
import { RouteTextView } from "./routeTextView";

const nodeTypes = { adaptive: AdaptiveMapNode };
const edgeTypes = { learning: LearningEdge };

const NODE_WIDTH = 224;
const NODE_HEIGHT = 116;

interface LearningMapProps {
  route: RouteState;
  onOpenNode: (nodeId: string) => void;
}

function edgeStateFor(targetStatus: string | undefined, isActive: boolean): LearningEdgeState {
  if (isActive) return "active";
  if (targetStatus === "needs_review") return "gap";
  return "default";
}

function startsWithListView(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 40rem)").matches
  );
}

/**
 * Controlled React Flow graph for the current RouteState. Node and edge
 * types are declared at module scope; nodes are fixed (not draggable, not
 * connectable) but focusable and keyboard operable through real buttons.
 */
export function LearningMap({ route, onOpenNode }: LearningMapProps) {
  const [showList, setShowList] = useState(startsWithListView);

  const layout = useMemo(() => layoutRoute(route), [route]);

  const initialNodes = useMemo<AdaptiveFlowNode[]>(() => {
    const nodesById = new Map(route.nodes.map((node) => [node.id, node]));
    const activeNodeId = route.activeNodeId ?? null;

    return layout.orderedIds.flatMap((id) => {
      const node = nodesById.get(id);
      const point = layout.byId[id];
      if (!node || !point) return [];
      const openable = isNodeOpenable(node, activeNodeId);
      const unlockHint =
        node.status === "locked"
          ? ((node.prerequisites ?? [])
              .map((prerequisiteId) => nodesById.get(prerequisiteId)?.title)
              .find((title) => Boolean(title)) ?? null)
          : null;

      return [
        {
          id: node.id,
          type: "adaptive" as const,
          position: { x: point.x, y: point.y },
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          draggable: false,
          connectable: false,
          ariaLabel: `${node.title}. Estado: ${nodeStatusLabel(node, activeNodeId)}`,
          data: {
            node,
            activeNodeId,
            openable,
            unlockHint,
            onOpen: onOpenNode,
          },
        },
      ];
    });
  }, [route, layout, onOpenNode]);

  const edges = useMemo<LearningFlowEdge[]>(() => {
    const nodesById = new Map(route.nodes.map((node) => [node.id, node]));
    const activeNodeId = route.activeNodeId ?? null;
    const seen = new Set<string>();

    const fromRoute = route.edges ?? [];
    const derived = route.nodes.flatMap((node) =>
      (node.prerequisites ?? []).map((source) => ({ source, target: node.id })),
    );
    const raw = fromRoute.length > 0 ? fromRoute : derived;

    const result: LearningFlowEdge[] = [];
    for (const edge of raw) {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) continue;
      const id = `${edge.source}->${edge.target}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        type: "learning",
        source: edge.source,
        target: edge.target,
        ariaLabel: `${source.title} desbloquea ${target.title}`,
        data: {
          state: edgeStateFor(target.status, edge.target === activeNodeId),
        },
      });
    }
    return result;
  }, [route]);

  const [nodes, setNodes] = useNodesState<AdaptiveFlowNode>(initialNodes);
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<AdaptiveFlowNode>[]) =>
      setNodes((current) => applyNodeChanges(changes, current)),
    [setNodes],
  );

  const onNodeClick = useCallback<NodeMouseHandler<AdaptiveFlowNode>>(
    (_event, node) => {
      if (node.data.openable) onOpenNode(node.id);
    },
    [onOpenNode],
  );

  return (
    <section className="learning-map" aria-label="Mapa de aprendizaje">
      <div className="learning-map__toolbar">
        <p className="learning-map__summary" aria-live="polite">
          Ruta versión {route.routeVersion} · {route.nodes.length} pasos
        </p>
        <button
          type="button"
          className="learning-map__toggle"
          aria-pressed={showList}
          onClick={() => setShowList((current) => !current)}
        >
          {showList ? <MapIcon size={15} aria-hidden="true" /> : <List size={15} aria-hidden="true" />}
          {showList ? "Ver mapa" : "Ver ruta como lista"}
        </button>
      </div>

      {layout.warnings.length > 0 ? (
        <p className="learning-map__warnings" role="status">
          Algunas relaciones de la ruta no se pudieron trazar.
        </p>
      ) : null}

      {showList ? (
        <RouteTextView route={route} />
      ) : (
        <div className="learning-map__canvas">
          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={edges as Edge[]}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable
            edgesFocusable
            elementsSelectable
            disableKeyboardA11y={false}
            autoPanOnNodeFocus
            fitView
            fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
            minZoom={0.35}
            maxZoom={1.25}
            aria-label="Mapa interactivo de la ruta de aprendizaje"
          >
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </div>
      )}
    </section>
  );
}

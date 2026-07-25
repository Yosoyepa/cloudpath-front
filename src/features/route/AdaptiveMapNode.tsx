import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Check, CircleDot, Lock, Play, RotateCcw } from "lucide-react";
import type { ComponentType } from "react";

import type {
  LearningNode,
  NodeStatus,
} from "../../contracts/generated/contracts";
import { FORMAT_LABELS, nodeStatusLabel } from "./routeLayout";

export interface AdaptiveNodeData extends Record<string, unknown> {
  node: LearningNode;
  activeNodeId: string | null;
  openable: boolean;
  unlockHint: string | null;
  onOpen: (nodeId: string) => void;
}

export type AdaptiveFlowNode = Node<AdaptiveNodeData, "adaptive">;

const STATUS_ICONS: Record<NodeStatus, ComponentType<{ size?: number | string }>> = {
  locked: Lock,
  available: CircleDot,
  in_progress: Play,
  mastered: Check,
  needs_review: RotateCcw,
};

/**
 * React Flow node for the learning map. The outer transform belongs to
 * React Flow; this component only styles and reveals inner content, so no
 * Motion animation ever targets the node wrapper.
 */
export function AdaptiveMapNode({ data }: NodeProps<AdaptiveFlowNode>) {
  const { node, activeNodeId, openable, unlockHint, onOpen } = data;
  const isActive = node.id === activeNodeId && node.status !== "mastered";
  const statusLabel = nodeStatusLabel(node, activeNodeId);
  const StatusIcon = STATUS_ICONS[node.status];

  const className = [
    "map-node",
    `map-node--${node.status}`,
    isActive ? "map-node--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="map-node__status">
        <StatusIcon size={13} aria-hidden="true" />
        <span>{statusLabel}</span>
      </span>
      <span className="map-node__title">{node.title}</span>
      <span className="map-node__meta">
        <span>{node.durationMinutes} min</span>
        <span aria-hidden="true">·</span>
        <span>{FORMAT_LABELS[node.format]}</span>
        <span aria-hidden="true">·</span>
        <span>Dominio {node.mastery}%</span>
      </span>
      {node.status === "locked" && unlockHint ? (
        <span className="map-node__hint">Se abre con: {unlockHint}</span>
      ) : null}
      <span
        className="map-node__bar"
        role="img"
        aria-label={`Dominio ${node.mastery} por ciento`}
      >
        <span
          className="map-node__bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, node.mastery))}%` }}
        />
      </span>
    </>
  );

  return (
    <div className={className}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="map-node__handle"
      />
      {openable ? (
        <button
          type="button"
          className="map-node__open"
          aria-label={`Abrir lección: ${node.title}. Estado: ${statusLabel}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(node.id);
          }}
        >
          {body}
        </button>
      ) : (
        <div className="map-node__static">{body}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="map-node__handle"
      />
    </div>
  );
}

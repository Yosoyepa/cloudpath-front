import { Link } from "react-router-dom";

import type { RouteState } from "../../contracts/generated/contracts";
import {
  FORMAT_LABELS,
  isNodeOpenable,
  layoutRoute,
  nodeStatusLabel,
} from "./routeLayout";

interface RouteTextViewProps {
  route: RouteState;
}

/**
 * Text equivalent of the learning map: every node in prerequisite reading
 * order with its status, duration, format and mastery as plain text. Open
 * steps are real links so keyboard and screen-reader users get the same
 * navigation as the visual map.
 */
export function RouteTextView({ route }: RouteTextViewProps) {
  const layout = layoutRoute(route);
  const nodesById = new Map(route.nodes.map((node) => [node.id, node]));

  return (
    <ol className="route-text-view">
      {layout.orderedIds.map((id) => {
        const node = nodesById.get(id);
        if (!node) return null;
        const statusLabel = nodeStatusLabel(node, route.activeNodeId);
        const openable = isNodeOpenable(node, route.activeNodeId);
        const unlockHint =
          node.status === "locked"
            ? (node.prerequisites ?? [])
                .map((prerequisiteId) => nodesById.get(prerequisiteId)?.title)
                .filter((title): title is string => Boolean(title))
                .join(", ")
            : "";

        return (
          <li key={id} className="route-text-view__item">
            <span className="route-text-view__status">{statusLabel}</span>
            <span className="route-text-view__body">
              {openable ? (
                <Link
                  className="route-text-view__link"
                  to={`/lesson/${node.id}`}
                >
                  {node.title}
                </Link>
              ) : (
                <span className="route-text-view__title">{node.title}</span>
              )}
              <span className="route-text-view__meta">
                {node.durationMinutes} min · {FORMAT_LABELS[node.format]} ·
                Dominio {node.mastery}%
              </span>
              {unlockHint ? (
                <span className="route-text-view__hint">
                  Se abre con: {unlockHint}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

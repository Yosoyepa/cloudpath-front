import type {
  LearningNode,
  RouteState,
} from "../../src/contracts/generated/contracts";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import {
  GRID_COLUMN_WIDTH,
  GRID_ROW_HEIGHT,
  isNodeOpenable,
  layoutRoute,
} from "../../src/features/route/routeLayout";

const demoRoute = demoRouteJson as unknown as RouteState;

function node(partial: Partial<LearningNode> & { id: string }): LearningNode {
  return {
    domain: "cloud_concepts",
    durationMinutes: 10,
    format: "video",
    mastery: 0,
    status: "available",
    title: partial.id,
    prerequisites: [],
    ...partial,
  };
}

function routeOf(nodes: LearningNode[]): RouteState {
  return { routeVersion: 1, nodes: nodes as RouteState["nodes"] };
}

describe("layoutRoute", () => {
  it("places prerequisites before dependants and keeps output stable", () => {
    const first = layoutRoute(demoRoute);
    const second = layoutRoute(structuredClone(demoRoute));
    expect(second).toEqual(first);
    expect(first.byId["security-shared-responsibility"].x).toBeLessThan(
      first.byId["security-iam-fundamentals"].x,
    );
  });

  it("maps every node exactly once onto the fixed 260x132 grid", () => {
    const layout = layoutRoute(demoRoute);
    expect(layout.orderedIds).toHaveLength(demoRoute.nodes.length);
    for (const point of Object.values(layout.byId)) {
      expect(point.x % GRID_COLUMN_WIDTH).toBe(0);
      expect(point.y % GRID_ROW_HEIGHT).toBe(0);
      expect(point.x).toBe(point.depth * GRID_COLUMN_WIDTH);
    }
    const positions = Object.values(layout.byId).map((p) => `${p.x}:${p.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("orders same-depth nodes by domain and then id", () => {
    const route = routeOf([
      node({ id: "zeta", domain: "security_and_compliance" }),
      node({ id: "beta", domain: "cloud_concepts" }),
      node({ id: "alpha", domain: "cloud_concepts" }),
      node({ id: "child", prerequisites: ["beta"] }),
    ]);
    const layout = layoutRoute(route);
    expect(layout.orderedIds).toEqual(["alpha", "beta", "zeta", "child"]);
    expect(layout.byId["alpha"].y).toBeLessThan(layout.byId["beta"].y);
    expect(layout.byId["child"].depth).toBe(1);
  });

  it("uses the longest prerequisite chain for depth", () => {
    const route = routeOf([
      node({ id: "a" }),
      node({ id: "b", prerequisites: ["a"] }),
      node({ id: "c", prerequisites: ["b"] }),
      node({ id: "d", prerequisites: ["a", "c"] }),
    ]);
    const layout = layoutRoute(route);
    expect(layout.byId["d"].depth).toBe(3);
    expect(layout.byId["d"].x).toBe(3 * GRID_COLUMN_WIDTH);
  });

  it("ignores unknown prerequisites and reports a warning", () => {
    const route = routeOf([node({ id: "a", prerequisites: ["ghost"] })]);
    const layout = layoutRoute(route);
    expect(layout.byId["a"].depth).toBe(0);
    expect(layout.warnings.join(" ")).toContain("ghost");
  });

  it("breaks cycles without hanging and reports a warning", () => {
    const route = routeOf([
      node({ id: "a", prerequisites: ["b"] }),
      node({ id: "b", prerequisites: ["a"] }),
    ]);
    const layout = layoutRoute(route);
    expect(layout.orderedIds.sort()).toEqual(["a", "b"]);
    expect(layout.warnings.join(" ")).toContain("cycle");
  });
});

describe("isNodeOpenable", () => {
  it("opens any active, available, in-progress or review route node", () => {
    const id = "cloud-value-proposition";
    const locked = node({ id, status: "locked" });
    const mastered = node({ id, status: "mastered" });
    const available = node({ id, status: "available" });
    const inProgress = node({ id, status: "in_progress" });
    const needsReview = node({ id, status: "needs_review" });
    expect(isNodeOpenable(locked, null)).toBe(false);
    expect(isNodeOpenable(mastered, null)).toBe(false);
    expect(isNodeOpenable(available, null)).toBe(true);
    expect(isNodeOpenable(inProgress, null)).toBe(true);
    expect(isNodeOpenable(needsReview, null)).toBe(true);
    expect(isNodeOpenable(locked, id)).toBe(true);
    expect(isNodeOpenable(mastered, id)).toBe(true);
  });
});

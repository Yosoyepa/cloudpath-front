import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import type {
  AdaptationDecision,
  RouteState,
} from "../../src/contracts/generated/contracts";
import { applyAdaptation } from "../../src/features/route/applyAdaptation";
import { createFallbackDecision } from "../../src/features/route/createFallbackDecision";

function freshRoute(): RouteState {
  return structuredClone(demoRouteJson) as RouteState;
}

describe("applyAdaptation", () => {
  it("reinforces IAM, inserts IAM vs KMS after it, and increments once", () => {
    const route = freshRoute();
    const originalMastery = route.nodes.find(
      (node) => node.id === "security-iam-fundamentals",
    )?.mastery;

    const next = applyAdaptation(
      route,
      createFallbackDecision(route.routeVersion),
    );

    const iamIndex = next.nodes.findIndex(
      (node) => node.id === "security-iam-fundamentals",
    );
    const intervention = next.nodes[iamIndex + 1];

    expect(next).not.toBe(route);
    expect(next.routeVersion).toBe(route.routeVersion + 1);
    expect(intervention.id).toBe("security-iam-vs-kms");
    expect(
      next.nodes.filter((node) => node.id === intervention.id),
    ).toHaveLength(1);
    expect(intervention.prerequisites).toContain(
      "security-iam-fundamentals",
    );
    expect(next.edges).toContainEqual({
      source: "security-iam-fundamentals",
      target: "security-iam-vs-kms",
    });
    expect(
      next.nodes.find(
        (node) => node.id === "security-iam-fundamentals",
      )?.mastery,
    ).toBe(Math.max(0, (originalMastery ?? 0) - 15));
    expect(route.nodes).not.toContainEqual(intervention);
  });

  it("returns the same route for a stale decision", () => {
    const route = { ...freshRoute(), routeVersion: 2 } as RouteState;

    expect(applyAdaptation(route, createFallbackDecision(1))).toBe(route);
  });

  it("rejects a duplicate insertion without partially reinforcing the route", () => {
    const once = applyAdaptation(
      freshRoute(),
      createFallbackDecision(1),
    );
    const originalMastery = once.nodes.find(
      (node) => node.id === "security-iam-fundamentals",
    )?.mastery;

    const duplicated = applyAdaptation(
      once,
      createFallbackDecision(once.routeVersion),
    );

    expect(duplicated).toBe(once);
    expect(
      duplicated.nodes.filter(
        (node) => node.id === "security-iam-vs-kms",
      ),
    ).toHaveLength(1);
    expect(
      duplicated.nodes.find(
        (node) => node.id === "security-iam-fundamentals",
      )?.mastery,
    ).toBe(originalMastery);
  });

  it.each([
    { mastery: 95, delta: 20, expected: 100 },
    { mastery: 5, delta: -20, expected: 0 },
  ])(
    "clamps mastery $mastery plus $delta to $expected",
    ({ mastery, delta, expected }) => {
      const route = freshRoute();
      route.nodes[0] = { ...route.nodes[0], mastery };
      const decision: AdaptationDecision = {
        requestRouteVersion: route.routeVersion,
        diagnosis: "Ajuste de prueba",
        rationale: "Comprueba límites de dominio.",
        operations: [
          {
            type: "reinforce_node",
            nodeId: route.nodes[0].id,
            masteryDelta: delta,
          },
        ],
      };

      expect(
        applyAdaptation(route, decision).nodes[0].mastery,
      ).toBe(expected);
    },
  );

  it("rejects unsupported operations and unknown anchors safely", () => {
    const route = freshRoute();
    const unsupported: AdaptationDecision = {
      requestRouteVersion: route.routeVersion,
      diagnosis: "Operación no admitida",
      rationale: "No debe tocar la ruta.",
      operations: [
        {
          type: "unlock_node",
          nodeId: route.nodes[0].id,
        },
      ],
    };
    const unknownAnchor = createFallbackDecision(route.routeVersion);
    const insert = unknownAnchor.operations[1];
    if (insert?.type === "insert_node") {
      insert.afterNodeId = "missing-node";
    }

    expect(applyAdaptation(route, unsupported)).toBe(route);
    expect(applyAdaptation(route, unknownAnchor)).toBe(route);
  });
});

describe("createFallbackDecision", () => {
  it("uses a generic mastery adjustment outside the judged IAM misconception", () => {
    const decision = createFallbackDecision(3, {
      nodeId: "cloud-value-proposition",
      masteryDelta: 12,
      kind: "advance",
    });

    expect(decision.operations).toEqual([
      {
        type: "reinforce_node",
        nodeId: "cloud-value-proposition",
        masteryDelta: 12,
      },
    ]);
  });
});

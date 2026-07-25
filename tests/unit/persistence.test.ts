import demoProfileJson from "../../src/contracts/generated/fixtures/demo-profile.json";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import type {
  LearnerProfile,
  RouteState,
} from "../../src/contracts/generated/contracts";
import {
  readPersistedSession,
  STORAGE_KEY,
  toPersistedSession,
} from "../../src/state/persistence";
import {
  initialSessionState,
  type AppliedAdaptation,
} from "../../src/state/sessionTypes";

const demoRoute = demoRouteJson as RouteState;
const appliedAdaptation: AppliedAdaptation = {
  decision: {
    requestRouteVersion: demoRoute.routeVersion,
    diagnosis: "La evidencia requiere un refuerzo.",
    rationale: "Se conserva la adaptación para no repetir el mismo intento.",
    operations: [
      {
        type: "reinforce_node",
        nodeId: demoRoute.nodes[0].id,
        masteryDelta: -8,
      },
    ],
  },
  routeBefore: demoRoute,
  routeAfter: {
    ...demoRoute,
    routeVersion: demoRoute.routeVersion + 1,
  },
  source: "deterministic",
  degraded: true,
};

describe("session persistence", () => {
  it("omits transcript and provider state", () => {
    const persisted = toPersistedSession({
      ...initialSessionState,
      profile: demoProfileJson as LearnerProfile,
      route: demoRouteJson as RouteState,
      transcript: "contenido que no debe persistir",
      providerMode: "degraded",
    });

    expect(persisted).not.toHaveProperty("transcript");
    expect(persisted).not.toHaveProperty("providerMode");
  });

  it("returns null for invalid JSON without deleting the original", () => {
    const storage = {
      getItem: vi.fn(() => "{broken"),
    };

    expect(readPersistedSession(storage)).toBeNull();
    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns null when browser storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("Blocked", "SecurityError");
      }),
    };

    expect(readPersistedSession(storage)).toBeNull();
  });

  it("persists the applied adaptation so refresh cannot consume the attempt twice", () => {
    const persisted = toPersistedSession({
      ...initialSessionState,
      profile: demoProfileJson as LearnerProfile,
      route: appliedAdaptation.routeAfter,
      attempts: [],
      lastAdaptation: appliedAdaptation,
    });

    expect(persisted.lastAdaptation).toEqual(appliedAdaptation);
  });

  it("restores a version-one snapshot", () => {
    const snapshot = {
      schemaVersion: 1,
      profile: demoProfileJson,
      route: demoRouteJson,
      attempts: [],
    };
    const storage = {
      getItem: vi.fn(() => JSON.stringify(snapshot)),
    };

    expect(readPersistedSession(storage)).toEqual(snapshot);
  });
});

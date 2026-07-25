import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import demoProfileJson from "../../src/contracts/generated/fixtures/demo-profile.json";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import attemptJson from "../../src/contracts/generated/fixtures/high-confidence-wrong-attempt.json";
import type {
  AdaptResponse,
  Attempt,
  LearnerProfile,
  RouteState,
} from "../../src/contracts/generated/contracts";
import RecalibratedPage from "../../src/pages/RecalibratedPage";
import { sessionReducer } from "../../src/state/sessionReducer";
import {
  initialSessionState,
  type SessionAction,
  type SessionState,
} from "../../src/state/sessionTypes";

const runtime = vi.hoisted(() => ({
  adapt: vi.fn(),
  dispatch: vi.fn(),
  state: null as unknown,
}));

vi.mock("../../src/api/cloudpath", () => ({
  cloudpathApi: {
    adapt: runtime.adapt,
  },
}));

vi.mock("../../src/state/SessionProvider", () => ({
  useSession: () => ({
    state: runtime.state,
    dispatch: runtime.dispatch,
    reset: vi.fn(),
  }),
}));

const demoProfile = demoProfileJson as LearnerProfile;
const demoRoute = demoRouteJson as RouteState;
const demoAttempt = attemptJson as Attempt;

function buildState(createdAt: string): SessionState {
  return {
    ...initialSessionState,
    profile: demoProfile,
    route: demoRoute,
    attempts: [{ ...demoAttempt, createdAt }],
  };
}

function PageHarness() {
  return (
    <MemoryRouter initialEntries={["/route/recalibrated"]}>
      <Routes>
        <Route path="/route/recalibrated" element={<RecalibratedPage />} />
        <Route path="/route" element={<p>Ruta anterior restaurada</p>} />
        <Route path="/lesson/:nodeId" element={<p>Lección insertada</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RecalibratedPage", () => {
  beforeEach(() => {
    runtime.adapt.mockReset();
    runtime.dispatch.mockReset();
    runtime.state = buildState("2026-07-24T15:12:04.001Z");
    runtime.dispatch.mockImplementation((action: SessionAction) => {
      runtime.state = sessionReducer(runtime.state as SessionState, action);
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back safely, inserts IAM vs KMS, and preserves the previous route action", async () => {
    const user = userEvent.setup();
    runtime.adapt.mockRejectedValueOnce(new TypeError("offline"));

    const view = render(<PageHarness />);

    await waitFor(
      () =>
        expect(runtime.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: "adaptation/applied" }),
        ),
      { timeout: 1_500 },
    );

    const appliedAction = runtime.dispatch.mock.calls.find(
      ([action]) => action.type === "adaptation/applied",
    )?.[0] as Extract<SessionAction, { type: "adaptation/applied" }>;

    expect(appliedAction.payload.routeAfter.routeVersion).toBe(2);
    expect(
      appliedAction.payload.routeAfter.nodes.some(
        (node) => node.id === "security-iam-vs-kms",
      ),
    ).toBe(true);

    view.rerender(<PageHarness />);

    expect(await screen.findByText("Modo respaldo")).toBeVisible();
    expect(
      screen.getByText(
        "IAM frente a KMS: control de acceso y cifrado no son lo mismo",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /iniciar práctica guiada/i }),
    ).toHaveAttribute("href", "/lesson/security-iam-vs-kms");

    await user.click(
      screen.getByRole("button", { name: /mantener mi ruta anterior/i }),
    );

    expect(runtime.dispatch).toHaveBeenLastCalledWith({
      type: "route/replaced",
      payload: appliedAction.payload.routeBefore,
    });
    expect(
      await screen.findByText("Ruta anterior restaurada"),
    ).toBeVisible();
  });

  it("rejects a stale decision without changing the current route", async () => {
    runtime.state = buildState("2026-07-24T15:12:04.002Z");
    const staleResponse: AdaptResponse = {
      decision: {
        requestRouteVersion: 0,
        diagnosis: "Respuesta obsoleta",
        rationale: "La ruta ya cambió.",
        operations: [],
      },
      degraded: false,
      source: "claude",
    };
    runtime.adapt.mockResolvedValueOnce(staleResponse);

    render(<PageHarness />);

    expect(
      await screen.findByText(/la ruta cambió mientras analizábamos/i),
    ).toBeVisible();
    const unchangedState = runtime.state as SessionState;
    expect(unchangedState.route).toBe(demoRoute);
    expect(unchangedState.lastAdaptation).toBeNull();
    expect(runtime.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "adaptation/applied" }),
    );
    expect(
      screen.queryByRole("link", { name: /iniciar práctica guiada/i }),
    ).not.toBeInTheDocument();
  });

  it("falls back against the attempted node when a personalized route has no IAM node", async () => {
    const routeWithoutIam = {
      ...demoRoute,
      nodes: demoRoute.nodes.filter(
        (node) => !node.id.startsWith("security-iam"),
      ),
      activeNodeId: "cloud-deployment-models",
    } as RouteState;
    runtime.state = {
      ...buildState("2026-07-24T15:12:04.004Z"),
      route: routeWithoutIam,
      attempts: [
        {
          ...demoAttempt,
          nodeId: "cloud-deployment-models",
          answer: "Respuesta incorrecta",
        },
      ],
      localSignal: null,
    } satisfies SessionState;
    runtime.adapt.mockRejectedValueOnce(new TypeError("offline"));

    render(<PageHarness />);

    await waitFor(
      () =>
        expect(runtime.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: "adaptation/applied" }),
        ),
      { timeout: 1_500 },
    );
    const applied = (runtime.state as SessionState).lastAdaptation;
    expect(applied?.routeAfter.routeVersion).toBe(2);
    expect(applied?.decision.operations).toEqual([
      expect.objectContaining({
        type: "reinforce_node",
        nodeId: "cloud-deployment-models",
      }),
    ]);
    expect(
      applied?.routeAfter.nodes.some((node) => node.id === "security-iam-vs-kms"),
    ).toBe(false);
  });

  it("does not request another adaptation when the processed result was restored", () => {
    const state = buildState("2026-07-24T15:12:04.005Z");
    runtime.state = {
      ...state,
      route: {
        ...demoRoute,
        routeVersion: 2,
      },
      lastAdaptation: {
        decision: {
          requestRouteVersion: 1,
          diagnosis: "Intento ya procesado.",
          rationale: "La ruta restaurada ya contiene este ajuste.",
          operations: [
            {
              type: "reinforce_node",
              nodeId: demoAttempt.nodeId,
              masteryDelta: -15,
            },
          ],
        },
        routeBefore: demoRoute,
        routeAfter: {
          ...demoRoute,
          routeVersion: 2,
        },
        source: "minimax",
        degraded: false,
      },
    } satisfies SessionState;

    render(<PageHarness />);

    expect(screen.getByText("Intento ya procesado.")).toBeVisible();
    expect(screen.getByText("Proveedor: MiniMax")).toBeVisible();
    expect(runtime.adapt).not.toHaveBeenCalled();
  });

  it("renders a provider adaptation using the attempted and inserted node metadata", async () => {
    const attemptedNode = demoRoute.nodes.find(
      (node) => node.id === "cloud-deployment-models",
    );
    expect(attemptedNode).toBeDefined();
    runtime.state = {
      ...buildState("2026-07-24T15:12:04.003Z"),
      attempts: [
        {
          ...demoAttempt,
          nodeId: "cloud-deployment-models",
          answer: "Solo nube pública",
          confidence: "low",
        },
      ],
    } satisfies SessionState;
    const response: AdaptResponse = {
      decision: {
        requestRouteVersion: demoRoute.routeVersion,
        diagnosis:
          "La respuesta muestra una duda entre despliegues híbridos y públicos.",
        rationale:
          "Insertamos una comparación breve antes de avanzar al siguiente dominio.",
        operations: [
          {
            type: "insert_node",
            afterNodeId: "cloud-deployment-models",
            node: {
              id: "cloud-deployment-hybrid-review",
              domain: "cloud_concepts",
              title: "Nube híbrida frente a nube pública",
              format: "practice",
              durationMinutes: 7,
              mastery: 0,
              status: "available",
              prerequisites: ["cloud-deployment-models"],
              sourceRefs: [],
            },
          },
        ],
      },
      degraded: false,
      source: "claude",
    };
    runtime.adapt.mockResolvedValueOnce(response);

    const view = render(<PageHarness />);

    await waitFor(
      () =>
        expect(runtime.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: "adaptation/applied" }),
        ),
      { timeout: 1_500 },
    );
    view.rerender(<PageHarness />);

    expect(
      screen.getAllByText(attemptedNode?.title ?? "").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(response.decision.diagnosis)).toBeVisible();
    expect(screen.getByText(response.decision.rationale)).toBeVisible();
    expect(screen.getByText("Proveedor: Claude")).toBeVisible();
    expect(screen.queryByText("IAM fundamentals")).not.toBeInTheDocument();
    expect(
      screen.getByText("Nube híbrida frente a nube pública"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /iniciar práctica guiada/i }),
    ).toHaveAttribute(
      "href",
      "/lesson/cloud-deployment-hybrid-review",
    );
  });
});

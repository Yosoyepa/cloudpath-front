import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import type { RouteState } from "../../src/contracts/generated/contracts";
import RoutePage from "../../src/pages/RoutePage";
import {
  initialSessionState,
  type SessionState,
} from "../../src/state/sessionTypes";

const runtime = vi.hoisted(() => ({
  state: null as unknown,
}));

vi.mock("../../src/state/SessionProvider", () => ({
  useSession: () => ({
    state: runtime.state,
    dispatch: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../../src/features/route/LearningMap", () => ({
  LearningMap: () => <div>Mapa dinámico</div>,
}));

describe("RoutePage", () => {
  it("links the CTA to the arbitrary active node and names that lesson", () => {
    const route = {
      ...(demoRouteJson as unknown as RouteState),
      activeNodeId: "cloud-value-proposition",
    };
    runtime.state = {
      ...initialSessionState,
      route,
    } satisfies SessionState;

    render(
      <MemoryRouter>
        <RoutePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", {
        name: /Continuar con Qué es la nube y cuál es su propuesta de valor/,
      }),
    ).toHaveAttribute("href", "/lesson/cloud-value-proposition");
  });
});

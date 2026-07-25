import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { RouteState } from "../../src/contracts/generated/contracts";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import { LearningMap } from "../../src/features/route/LearningMap";

const demoRoute = demoRouteJson as unknown as RouteState;

// React Flow measures the DOM; jsdom needs these globals mocked. They live
// here (not in shared tests/setup.ts) because this slice owns its tests.
beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver =
    window.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);

  class DOMMatrixReadOnlyMock {
    m22: number;
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1];
      this.m22 = scale !== undefined ? Number(scale) : 1;
    }
  }
  window.DOMMatrixReadOnly =
    window.DOMMatrixReadOnly ??
    (DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly);

  Object.defineProperties(window.HTMLElement.prototype, {
    offsetHeight: {
      configurable: true,
      get(this: HTMLElement) {
        return parseFloat(this.style.height) || 116;
      },
    },
    offsetWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return parseFloat(this.style.width) || 224;
      },
    },
  });

  (window.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox =
    () =>
      ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
});

function renderMap(route: RouteState = demoRoute) {
  const onOpenNode = vi.fn();
  render(
    <MemoryRouter>
      <LearningMap route={route} onOpenNode={onOpenNode} />
    </MemoryRouter>,
  );
  return { onOpenNode };
}

describe("LearningMap", () => {
  it("renders every node with a text status, duration, format and mastery", () => {
    renderMap();
    expect(
      screen.getByText("Fundamentos de IAM: usuarios, grupos, roles y políticas"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Paso actual")).not.toHaveLength(0);
    expect(screen.getAllByText("Bloqueado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dominado").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dominio \d+%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it("marks the active node with a visible label, not only color", () => {
    renderMap();
    const openControl = screen.getByRole("button", {
      name: /Abrir lección: Fundamentos de IAM/,
    });
    expect(openControl).toHaveTextContent("Paso actual");
  });

  it("opens the active lesson from a pointer interaction", () => {
    const { onOpenNode } = renderMap();
    // fireEvent avoids d3-zoom's mousedown handler, which needs a real
    // event.view that jsdom does not provide.
    fireEvent.click(
      screen.getByRole("button", {
        name: /Abrir lección: Fundamentos de IAM/,
      }),
    );
    expect(onOpenNode).toHaveBeenCalledWith("security-iam-fundamentals");
  });

  it("opens the active lesson from keyboard interaction", async () => {
    const user = userEvent.setup();
    const { onOpenNode } = renderMap();
    screen
      .getByRole("button", { name: /Abrir lección: Fundamentos de IAM/ })
      .focus();
    await user.keyboard("{Enter}");
    expect(onOpenNode).toHaveBeenCalledWith("security-iam-fundamentals");
  });

  it("opens an arbitrary Claude-selected active node", () => {
    const route = {
      ...demoRoute,
      activeNodeId: "cloud-value-proposition",
    };
    const { onOpenNode } = renderMap(route);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Abrir lección: Qué es la nube y cuál es su propuesta de valor/,
      }),
    );

    expect(onOpenNode).toHaveBeenCalledWith("cloud-value-proposition");
  });

  it("does not offer open controls on locked nodes", () => {
    const { onOpenNode } = renderMap();
    expect(
      screen.queryByRole("button", {
        name: /Abrir lección: Cómputo con Amazon EC2/,
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByText("Cómputo con Amazon EC2: instancias, AMI y ciclo de vida"),
    );
    expect(onOpenNode).not.toHaveBeenCalled();
  });

  it("shows the unlock prerequisite on locked nodes", () => {
    renderMap();
    expect(
      screen.getAllByText(/Se abre con: Infraestructura global/).length,
    ).toBeGreaterThan(0);
  });

  it("switches to an equivalent ordered text list that links open lessons", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(
      screen.getByRole("button", { name: /ver ruta como lista/i }),
    );

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(demoRoute.nodes.length);
    // Prerequisite reading order: value proposition precedes IAM fundamentals.
    expect(items[0]).toHaveTextContent("propuesta de valor");
    expect(items[items.length - 1]).toHaveTextContent("precios");

    const iamLink = screen.getByRole("link", {
      name: /Fundamentos de IAM/,
    });
    expect(iamLink).toHaveAttribute(
      "href",
      "/lesson/security-iam-fundamentals",
    );
    expect(
      screen.getByRole("link", {
        name: /Modelos de despliegue/,
      }),
    ).toHaveAttribute("href", "/lesson/cloud-deployment-models");
    expect(
      screen.queryByRole("link", { name: /Cómputo con Amazon EC2/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver mapa/i }));
    expect(
      screen.getByRole("button", { name: /Abrir lección: Fundamentos de IAM/ }),
    ).toBeInTheDocument();
  });
});

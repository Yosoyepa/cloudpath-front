import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LandingPage from "../../src/pages/LandingPage";
import { RouteIgnition } from "../../src/features/landing/RouteIgnition";
import {
  IGNITION_EDGES,
  IGNITION_NODES,
  REFLOW_X,
  REFLOW_Y,
  reflowedPosition,
  routeIgnitionPhase,
} from "../../src/features/landing/routeIgnitionModel";

function mockMatchMedia({
  reducedMotion = false,
  mobile = false,
}: { reducedMotion?: boolean; mobile?: boolean } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion")
      ? reducedMotion
      : query.includes("max-width")
        ? mobile
        : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderIgnition() {
  return render(
    <MemoryRouter>
      <RouteIgnition />
    </MemoryRouter>,
  );
}

describe("routeIgnitionPhase", () => {
  it("maps scroll progress to the semantic phases", () => {
    expect(routeIgnitionPhase(0.1)).toBe("signal");
    expect(routeIgnitionPhase(0.5)).toBe("route");
    expect(routeIgnitionPhase(0.7)).toBe("gap");
    expect(routeIgnitionPhase(0.86)).toBe("reroute");
    expect(routeIgnitionPhase(1)).toBe("mastery");
  });
});

describe("ignition scene data", () => {
  it("uses unique deterministic node ids", () => {
    const ids = IGNITION_NODES.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("inserts IAM vs KMS after IAM fundamentals and before EC2", () => {
    const byId = new Map(IGNITION_NODES.map((node) => [node.id, node]));
    const iam = byId.get("security-iam-fundamentals");
    const inserted = byId.get("security-iam-vs-kms");
    const ec2 = byId.get("compute-ec2");
    expect(iam).toBeDefined();
    expect(inserted).toBeDefined();
    expect(ec2).toBeDefined();
    expect(inserted!.tone).toBe("inserted");
    expect(iam!.appearAt).toBeLessThan(inserted!.appearAt);
    expect(ec2!.appearAt).toBeLessThan(inserted!.appearAt);
  });

  it("reflows only the downstream nodes by a fixed translation", () => {
    const ec2 = IGNITION_NODES.find((node) => node.id === "compute-ec2")!;
    const iam = IGNITION_NODES.find((node) => node.id === "security-iam-fundamentals")!;
    expect(reflowedPosition(ec2)).toEqual({
      cx: ec2.cx + REFLOW_X,
      cy: ec2.cy + REFLOW_Y,
    });
    expect(reflowedPosition(iam)).toEqual({ cx: iam.cx, cy: iam.cy });
  });

  it("marks exactly one edge as the gap and two as violet remediation", () => {
    expect(IGNITION_EDGES.filter((edge) => edge.kind === "gap")).toHaveLength(1);
    expect(IGNITION_EDGES.filter((edge) => edge.kind === "violet")).toHaveLength(2);
  });
});

describe("RouteIgnition", () => {
  it("keeps the heading, CTA and semantic evidence in the first viewport", () => {
    mockMatchMedia();
    const { container } = renderIgnition();

    expect(
      screen.getByRole("heading", { name: /tu error cambia el camino/i }),
    ).toBeVisible();
    const cta = screen.getByRole("link", { name: /construir mi ruta/i });
    expect(cta).toBeVisible();
    expect(cta).toHaveAttribute("href", "/interview");

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");

    // Accessible hidden description of the same change.
    expect(screen.getByText(/enciende tu trayectoria/i)).toBeInTheDocument();
    // Semantic labels exist in the DOM alongside the decorative paths.
    expect(screen.getByText(/brecha detectada/i)).toBeInTheDocument();
    expect(screen.getByText(/nueva práctica: iam vs kms/i)).toBeInTheDocument();
    expect(screen.getByText("Ruta recalibrada")).toBeInTheDocument();
  });

  it("keeps the CTA available and shows the final state when reduced motion is enabled", () => {
    mockMatchMedia({ reducedMotion: true });
    render(<MemoryRouter><RouteIgnition /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /construir mi ruta/i })).toBeVisible();
    expect(screen.getByText("Ruta recalibrada")).toBeInTheDocument();
    expect(screen.getByText(/nueva práctica: iam vs kms/i)).toBeInTheDocument();
  });

  it("serves a static composition on mobile without losing content or CTA", () => {
    mockMatchMedia({ mobile: true });
    const { container } = renderIgnition();

    expect(screen.getByRole("link", { name: /construir mi ruta/i })).toBeVisible();
    expect(screen.getByText("Ruta recalibrada")).toBeInTheDocument();
    expect(screen.getByText(/enciende tu trayectoria/i)).toBeInTheDocument();
    expect(container.querySelector(".ignition-track--static")).not.toBeNull();
  });

  it("uses the scrub scene on desktop without reduced motion", () => {
    mockMatchMedia();
    const { container } = renderIgnition();
    expect(container.querySelector(".ignition-track--static")).toBeNull();
  });
});

describe("LandingPage", () => {
  it("renders the exported static landing as the production entry", () => {
    mockMatchMedia();
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: /tu ruta a aws no debería empezar con otra pestaña/i,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /diseñar mi ruta/i }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", {
        name: "AWS Certified Cloud Practitioner",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /tu ruta se dibuja contigo/i }),
    ).toBeVisible();
  });
});

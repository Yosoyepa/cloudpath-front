import { useEffect, useState } from "react";

/**
 * Route Ignition deterministic model.
 *
 * The landing scene mirrors the real learning map with fixed coordinates, so
 * the same scroll progress always produces the same composition. React Flow
 * stays out of the landing bundle; this data is the lightweight equivalent.
 */

export type IgnitionPhase = "signal" | "route" | "gap" | "reroute" | "mastery";

/** Maps scroll progress (0–1) to the semantic phase of the scene. */
export function routeIgnitionPhase(progress: number): IgnitionPhase {
  if (progress < 0.18) return "signal";
  if (progress < 0.62) return "route";
  if (progress < 0.78) return "gap";
  if (progress < 0.94) return "reroute";
  return "mastery";
}

/** Translation applied to downstream nodes when the remediation is inserted. */
export const REFLOW_X = 40;
export const REFLOW_Y = 12;

export type IgnitionNodeTone = "done" | "active" | "pending" | "inserted";

export interface IgnitionNode {
  readonly id: string;
  readonly label: string;
  readonly cx: number;
  readonly cy: number;
  /** Scroll progress at which the node starts fading in. */
  readonly appearAt: number;
  readonly tone: IgnitionNodeTone;
  /** True when the node belongs to the group re-accommodated on reroute. */
  readonly reflows: boolean;
}

export const IGNITION_VIEWBOX = "0 0 840 480";

export const IGNITION_NODES: readonly IgnitionNode[] = [
  {
    id: "security-shared-responsibility",
    label: "Responsabilidad",
    cx: 80,
    cy: 320,
    appearAt: 0.2,
    tone: "done",
    reflows: false,
  },
  {
    id: "cloud-fundamentals",
    label: "Cloud",
    cx: 190,
    cy: 160,
    appearAt: 0.24,
    tone: "done",
    reflows: false,
  },
  {
    id: "security-iam-fundamentals",
    label: "IAM",
    cx: 300,
    cy: 320,
    appearAt: 0.28,
    tone: "active",
    reflows: false,
  },
  {
    id: "compute-ec2",
    label: "EC2",
    cx: 440,
    cy: 210,
    appearAt: 0.36,
    tone: "pending",
    reflows: true,
  },
  {
    id: "storage-s3",
    label: "S3",
    cx: 560,
    cy: 330,
    appearAt: 0.42,
    tone: "pending",
    reflows: true,
  },
  {
    id: "billing-pricing",
    label: "Facturación",
    cx: 660,
    cy: 190,
    appearAt: 0.48,
    tone: "pending",
    reflows: true,
  },
  {
    id: "exam-readiness",
    label: "Examen",
    cx: 730,
    cy: 330,
    appearAt: 0.54,
    tone: "pending",
    reflows: true,
  },
  {
    id: "security-iam-vs-kms",
    label: "IAM vs KMS",
    cx: 385,
    cy: 120,
    appearAt: 0.8,
    tone: "inserted",
    reflows: false,
  },
];

export type IgnitionEdgeKind = "base" | "gap" | "violet";

export interface IgnitionEdge {
  readonly id: string;
  readonly d: string;
  readonly drawStart: number;
  readonly drawEnd: number;
  readonly kind: IgnitionEdgeKind;
  /** True when the edge travels with the reflow group. */
  readonly reflows: boolean;
}

export const IGNITION_EDGES: readonly IgnitionEdge[] = [
  {
    id: "edge-shared-iam",
    d: "M 80 320 C 150 320 220 320 300 320",
    drawStart: 0.04,
    drawEnd: 0.14,
    kind: "base",
    reflows: false,
  },
  {
    id: "edge-cloud-iam",
    d: "M 190 160 C 225 225 260 275 300 320",
    drawStart: 0.06,
    drawEnd: 0.16,
    kind: "base",
    reflows: false,
  },
  {
    id: "edge-iam-ec2-gap",
    d: "M 300 320 C 355 315 390 260 440 210",
    drawStart: 0.3,
    drawEnd: 0.4,
    kind: "gap",
    reflows: false,
  },
  {
    id: "edge-ec2-s3",
    d: "M 440 210 C 490 250 510 290 560 330",
    drawStart: 0.4,
    drawEnd: 0.48,
    kind: "base",
    reflows: true,
  },
  {
    id: "edge-s3-billing",
    d: "M 560 330 C 610 300 620 240 660 190",
    drawStart: 0.46,
    drawEnd: 0.54,
    kind: "base",
    reflows: true,
  },
  {
    id: "edge-billing-exam",
    d: "M 660 190 C 700 240 710 290 730 330",
    drawStart: 0.52,
    drawEnd: 0.6,
    kind: "base",
    reflows: true,
  },
  {
    id: "edge-iam-vskms",
    d: "M 300 320 C 325 240 350 175 385 120",
    drawStart: 0.8,
    drawEnd: 0.88,
    kind: "violet",
    reflows: false,
  },
  {
    id: "edge-vskms-ec2",
    // Ends at the reflowed EC2 position (440 + REFLOW_X, 210 + REFLOW_Y).
    d: "M 385 120 C 430 160 445 195 480 222",
    drawStart: 0.84,
    drawEnd: 0.92,
    kind: "violet",
    reflows: false,
  },
];

/** Where the cyan signal pulse sits while the trajectory ignites. */
export const SIGNAL_PULSE = { cx: 80, cy: 320 } as const;

/** Gap highlight window (orange), as scroll progress. */
export const GAP_WINDOW = { appear: 0.62, settled: 0.66, fadeStart: 0.82, gone: 0.9 } as const;

/** Reroute window (violet insertion and reflow). */
export const REROUTE_WINDOW = { start: 0.78, end: 0.94 } as const;

/** Mastery window (green, stable final state). */
export const MASTERY_WINDOW = { start: 0.94, settled: 0.985 } as const;

/** Final position of a node after the reroute reflow. */
export function reflowedPosition(node: IgnitionNode): { cx: number; cy: number } {
  return node.reflows
    ? { cx: node.cx + REFLOW_X, cy: node.cy + REFLOW_Y }
    : { cx: node.cx, cy: node.cy };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

interface NavigatorConnection {
  connection?: { saveData?: boolean };
}

function prefersSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as NavigatorConnection).connection?.saveData === true;
}

/**
 * Reduced motion, compact viewports and save-data receive a static final
 * composition: no scrub, same content, same CTA.
 */
export function useStaticIgnitionScene(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery("(max-width: 40rem)");
  return reducedMotion || compact || prefersSaveData();
}

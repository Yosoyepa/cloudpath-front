import type {
  LearningFormat,
  LearningSignals,
} from "./interviewSignals";

export interface PreviewNode {
  id: string;
  title: string;
  format: LearningFormat;
}
export interface PreviewEdge {
  source: string;
  target: string;
}
export interface InterviewRoutePreview {
  nodes: PreviewNode[];
  edges: PreviewEdge[];
}

interface Candidate {
  id: string;
  title: string;
  formats: readonly LearningFormat[];
  prerequisites: readonly string[];
}

const CANDIDATES: readonly Candidate[] = [
  { id: "cloud-value-proposition", title: "Valor de la nube", formats: ["video", "text", "oral_explanation"], prerequisites: [] },
  { id: "cloud-deployment-models", title: "Modelos de despliegue", formats: ["video", "text", "practice"], prerequisites: ["cloud-value-proposition"] },
  { id: "cloud-economics-capex-opex", title: "Economía cloud", formats: ["video", "text"], prerequisites: ["cloud-value-proposition"] },
  { id: "security-shared-responsibility", title: "Responsabilidad compartida", formats: ["video", "text", "oral_explanation"], prerequisites: ["cloud-deployment-models"] },
  { id: "security-iam-fundamentals", title: "Fundamentos de IAM", formats: ["practice", "video", "text"], prerequisites: ["security-shared-responsibility"] },
  { id: "global-infrastructure-regions-az", title: "Infraestructura global", formats: ["video", "text", "practice"], prerequisites: ["cloud-deployment-models"] },
  { id: "tech-ways-to-interact", title: "Cómo interactuar con AWS", formats: ["practice", "video", "text"], prerequisites: ["global-infrastructure-regions-az"] },
];

export function projectInterviewRoute(
  signals: LearningSignals,
): InterviewRoutePreview {
  const count =
    (signals.goal ? 1 : 0) +
    (signals.weekly_minutes ? 2 : 0) +
    (signals.experience_level ? 2 : 0) +
    (signals.preferred_formats?.length ? 2 : 0);
  const selected = CANDIDATES.slice(0, Math.min(count, CANDIDATES.length));
  const selectedIds = new Set(selected.map((node) => node.id));
  const preferred = signals.preferred_formats ?? [];
  const nodes = selected.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    format:
      preferred.find((format) => candidate.formats.includes(format)) ??
      candidate.formats[0]!,
  }));
  const edges = selected.flatMap((candidate) =>
    candidate.prerequisites
      .filter((source) => selectedIds.has(source))
      .map((source) => ({ source, target: candidate.id })),
  );
  return { nodes, edges };
}

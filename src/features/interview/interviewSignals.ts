import type { InterviewAnswer } from "../../contracts/generated/contracts";

export type LearningSignalKind =
  | "goal"
  | "weekly_minutes"
  | "experience_level"
  | "preferred_formats";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type LearningFormat =
  | "video"
  | "text"
  | "practice"
  | "oral_explanation";

export interface CompleteLearningIntake {
  goal: string;
  weekly_minutes: number;
  experience_level: ExperienceLevel;
  preferred_formats: LearningFormat[];
  exam_date?: string;
}

export type LearningSignals = Partial<CompleteLearningIntake>;
export type LearningSignal =
  | { kind: "goal"; value: string }
  | { kind: "weekly_minutes"; value: number }
  | { kind: "experience_level"; value: ExperienceLevel }
  | { kind: "preferred_formats"; value: LearningFormat[] };

const LEVELS = new Set<ExperienceLevel>([
  "beginner",
  "intermediate",
  "advanced",
]);
const FORMATS = new Set<LearningFormat>([
  "video",
  "text",
  "practice",
  "oral_explanation",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseFormats(value: unknown): LearningFormat[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [
    ...new Set(
      raw
        .map((item) => String(item).trim().toLowerCase())
        .filter((item): item is LearningFormat =>
          FORMATS.has(item as LearningFormat),
        ),
    ),
  ];
}

export function parseSignalCall(args: unknown): LearningSignal | null {
  const input = record(args);
  if (!input || typeof input.kind !== "string") return null;
  const raw = typeof input.value === "string" ? input.value.trim() : input.value;
  if (input.kind === "goal" && typeof raw === "string" && raw) {
    return { kind: "goal", value: raw.slice(0, 300) };
  }
  if (input.kind === "weekly_minutes") {
    const value = Number(raw);
    return Number.isInteger(value)
      ? { kind: "weekly_minutes", value: Math.min(1200, Math.max(30, value)) }
      : null;
  }
  if (
    input.kind === "experience_level" &&
    typeof raw === "string" &&
    LEVELS.has(raw.toLowerCase() as ExperienceLevel)
  ) {
    return {
      kind: "experience_level",
      value: raw.toLowerCase() as ExperienceLevel,
    };
  }
  if (input.kind === "preferred_formats") {
    const value = parseFormats(raw);
    return value.length ? { kind: "preferred_formats", value } : null;
  }
  return null;
}

export function parseCompleteCall(
  args: unknown,
): CompleteLearningIntake | null {
  const input = record(args);
  if (!input) return null;
  const goal = typeof input.goal === "string" ? input.goal.trim() : "";
  const weeklyMinutes = Number(input.weekly_minutes);
  const experience = String(input.experience_level ?? "").toLowerCase();
  const preferredFormats = parseFormats(input.preferred_formats);
  if (
    !goal ||
    !Number.isInteger(weeklyMinutes) ||
    !LEVELS.has(experience as ExperienceLevel) ||
    preferredFormats.length === 0
  ) {
    return null;
  }
  const examDate =
    typeof input.exam_date === "string" && input.exam_date.trim()
      ? input.exam_date.trim().slice(0, 80)
      : undefined;
  return {
    goal: goal.slice(0, 300),
    weekly_minutes: Math.min(1200, Math.max(30, weeklyMinutes)),
    experience_level: experience as ExperienceLevel,
    preferred_formats: preferredFormats,
    ...(examDate ? { exam_date: examDate } : {}),
  };
}

export function mergeSignal(
  current: LearningSignals,
  signal: LearningSignal,
): LearningSignals {
  return { ...current, [signal.kind]: signal.value };
}

export function mergeComplete(
  current: LearningSignals,
  complete: CompleteLearningIntake,
): LearningSignals {
  return { ...current, ...complete };
}

export function toProfileAnswers(signals: LearningSignals): InterviewAnswer[] {
  const values: Array<[LearningSignalKind, string | undefined]> = [
    ["goal", signals.goal],
    ["weekly_minutes", signals.weekly_minutes?.toString()],
    ["experience_level", signals.experience_level],
    ["preferred_formats", signals.preferred_formats?.join(",")],
  ];
  return values
    .filter((entry): entry is [LearningSignalKind, string] => Boolean(entry[1]))
    .map(([questionId, answer]) => ({ questionId, answer }));
}

export function writtenAnswerToSignal(
  questionId: string,
  answer: string,
): LearningSignal | null {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return null;
  if (questionId === "goal") {
    return { kind: "goal", value: answer.trim().slice(0, 300) };
  }
  if (questionId === "weekly-minutes") {
    const minutes = normalized.match(/\d+/)?.[0];
    return minutes
      ? parseSignalCall({ kind: "weekly_minutes", value: minutes })
      : null;
  }
  if (questionId === "experience") {
    const value: ExperienceLevel =
      /avanz|senior|profesional|certific/.test(normalized)
        ? "advanced"
        : /intermedi|he usado|proyecto|experien/.test(normalized)
          ? "intermediate"
          : "beginner";
    return { kind: "experience_level", value };
  }
  if (questionId === "format") {
    const formats: LearningFormat[] = [];
    if (/pr[aá]ctic|laboratorio|hands.?on/.test(normalized)) formats.push("practice");
    if (/video|viendo|ver /.test(normalized)) formats.push("video");
    if (/leer|lectura|texto|document/.test(normalized)) formats.push("text");
    if (/explic|oral|voz|hablando/.test(normalized)) {
      formats.push("oral_explanation");
    }
    return formats.length
      ? { kind: "preferred_formats", value: [...new Set(formats)] }
      : null;
  }
  return null;
}

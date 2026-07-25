import iamFundamentalsFixture from "../../contracts/generated/fixtures/iam-fundamentals-lesson.json";
import iamVsKmsFixture from "../../contracts/generated/fixtures/iam-vs-kms-lesson.json";
import type { Lesson } from "../../contracts/generated/contracts";

const localLessons: Readonly<Record<string, Lesson>> = {
  "security-iam-fundamentals": iamFundamentalsFixture as Lesson,
  "security-iam-vs-kms": iamVsKmsFixture as Lesson,
};

export function getFallbackLesson(nodeId: string): Lesson | null {
  return localLessons[nodeId] ?? null;
}

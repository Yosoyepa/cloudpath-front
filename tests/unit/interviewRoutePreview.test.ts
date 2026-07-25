import { projectInterviewRoute } from "../../src/features/interview/interviewRoutePreview";

describe("provisional interview route", () => {
  it("grows monotonically using canonical prerequisite edges", () => {
    const goalOnly = projectInterviewRoute({ goal: "Aprobar" });
    const complete = projectInterviewRoute({
      goal: "Aprobar",
      weekly_minutes: 120,
      experience_level: "beginner",
      preferred_formats: ["practice"],
    });
    expect(goalOnly.nodes.map((node) => node.id)).toEqual([
      "cloud-value-proposition",
    ]);
    expect(complete.nodes.length).toBeGreaterThan(goalOnly.nodes.length);
    expect(complete.edges).toContainEqual({
      source: "security-shared-responsibility",
      target: "security-iam-fundamentals",
    });
    expect(complete.nodes.find((node) => node.id === "cloud-value-proposition"))
      .toMatchObject({ format: "video" });
    expect(complete.nodes.find((node) => node.id === "security-iam-fundamentals"))
      .toMatchObject({ format: "practice" });
  });
});

import {
  mergeComplete,
  mergeSignal,
  parseCompleteCall,
  parseSignalCall,
  toProfileAnswers,
  writtenAnswerToSignal,
} from "../../src/features/interview/interviewSignals";

describe("interview signals", () => {
  it("normalizes and replaces a signal by kind", () => {
    const first = parseSignalCall({ kind: "weekly_minutes", value: " 90 " });
    const second = parseSignalCall({ kind: "weekly_minutes", value: "120" });
    expect(first).toEqual({ kind: "weekly_minutes", value: 90 });
    expect(mergeSignal(mergeSignal({}, first!), second!)).toEqual({
      weekly_minutes: 120,
    });
  });

  it("rejects incomplete completion and maps complete canonical answers", () => {
    expect(parseCompleteCall({ goal: "Aprobar" })).toBeNull();
    const complete = parseCompleteCall({
      goal: "Aprobar CLF-C02",
      weekly_minutes: 180,
      experience_level: "beginner",
      preferred_formats: ["practice", "video"],
    });
    expect(toProfileAnswers(mergeComplete({}, complete!))).toEqual([
      { questionId: "goal", answer: "Aprobar CLF-C02" },
      { questionId: "weekly_minutes", answer: "180" },
      { questionId: "experience_level", answer: "beginner" },
      { questionId: "preferred_formats", answer: "practice,video" },
    ]);
  });

  it("adapts current written question ids and Spanish free text", () => {
    expect(writtenAnswerToSignal("weekly-minutes", "Tengo 150 minutos")).toEqual({
      kind: "weekly_minutes",
      value: 150,
    });
    expect(writtenAnswerToSignal("format", "Practicando y explicando")).toEqual({
      kind: "preferred_formats",
      value: ["practice", "oral_explanation"],
    });
    expect(writtenAnswerToSignal("deadline", "en agosto")).toBeNull();
  });
});

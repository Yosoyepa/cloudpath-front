import { evaluateAttempt, toLocalSignal } from "../../src/features/assessment/evaluateAttempt";

describe("evaluateAttempt", () => {
  it.each([
    [true, "high", 12, "advance"],
    [true, "low", 8, "reinforce"],
    [false, "high", -15, "correct_mental_model"],
    [false, "low", -8, "return_to_prerequisite"],
  ] as const)(
    "maps correct=%s confidence=%s to the deterministic signal",
    (correct, confidence, masteryDelta, kind) => {
      expect(evaluateAttempt(correct, confidence)).toEqual({
        masteryDelta,
        kind,
      });
    },
  );

  it("derives the local signal without changing the evaluation", () => {
    const evaluation = evaluateAttempt(false, "high");

    expect(toLocalSignal("security-iam-fundamentals", evaluation)).toEqual({
      nodeId: "security-iam-fundamentals",
      masteryDelta: -15,
      kind: "correct_mental_model",
    });
  });
});

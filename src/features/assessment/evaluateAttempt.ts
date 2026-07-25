import type { Confidence } from "../../contracts/generated/contracts";
import type {
  LocalIntervention,
  LocalSignal,
} from "../../state/sessionTypes";

export interface AttemptEvaluation {
  masteryDelta: number;
  kind: LocalIntervention;
}

const evaluationMatrix: Record<
  "correct" | "incorrect",
  Record<Confidence, AttemptEvaluation>
> = {
  correct: {
    high: { masteryDelta: 12, kind: "advance" },
    low: { masteryDelta: 8, kind: "reinforce" },
  },
  incorrect: {
    high: { masteryDelta: -15, kind: "correct_mental_model" },
    low: { masteryDelta: -8, kind: "return_to_prerequisite" },
  },
};

export function evaluateAttempt(
  correct: boolean,
  confidence: Confidence,
): AttemptEvaluation {
  return evaluationMatrix[correct ? "correct" : "incorrect"][confidence];
}

export function toLocalSignal(
  nodeId: string,
  evaluation: AttemptEvaluation,
): LocalSignal {
  return {
    nodeId,
    masteryDelta: evaluation.masteryDelta,
    kind: evaluation.kind,
  };
}

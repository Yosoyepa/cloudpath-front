import iamVsKmsInterventionJson from "../../contracts/generated/fixtures/iam-vs-kms-intervention.json";
import type {
  AdaptationDecision,
  LearningNode,
} from "../../contracts/generated/contracts";
import type { LocalSignal } from "../../state/sessionTypes";

const IAM_FUNDAMENTALS_NODE_ID = "security-iam-fundamentals";
const interventionNode = iamVsKmsInterventionJson as LearningNode;

/**
 * Deterministic, fully sourced fallback for the judged IAM/KMS misconception.
 */
export function createFallbackDecision(
  requestRouteVersion: number,
  signal?: LocalSignal,
): AdaptationDecision {
  if (
    signal &&
    (signal.nodeId !== IAM_FUNDAMENTALS_NODE_ID ||
      signal.kind !== "correct_mental_model")
  ) {
    return {
      requestRouteVersion,
      diagnosis: "Diagnóstico local basado en tu respuesta y nivel de confianza.",
      rationale:
        "Modo respaldo: actualizamos el dominio del paso actual sin depender de un proveedor externo.",
      operations: [
        {
          type: "reinforce_node",
          nodeId: signal.nodeId,
          masteryDelta: signal.masteryDelta,
        },
      ],
    };
  }

  return {
    requestRouteVersion,
    diagnosis:
      "Diagnóstico local: una respuesta incorrecta con confianza alta indica una confusión entre control de acceso y cifrado.",
    rationale:
      "Modo respaldo: reforzamos Fundamentos de IAM e insertamos una comparación breve entre IAM y KMS antes de continuar.",
    operations: [
      {
        type: "reinforce_node",
        nodeId: IAM_FUNDAMENTALS_NODE_ID,
        masteryDelta: -15,
      },
      {
        type: "insert_node",
        afterNodeId: IAM_FUNDAMENTALS_NODE_ID,
        node: {
          ...interventionNode,
          prerequisites: interventionNode.prerequisites
            ? [...interventionNode.prerequisites]
            : [IAM_FUNDAMENTALS_NODE_ID],
          sourceRefs: interventionNode.sourceRefs
            ? [...interventionNode.sourceRefs]
            : undefined,
        },
      },
    ],
    sourceRefs: interventionNode.sourceRefs
      ? [...interventionNode.sourceRefs]
      : undefined,
  };
}

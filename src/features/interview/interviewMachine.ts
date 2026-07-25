export type InterviewStatus =
  | "idle"
  | "requesting-token"
  | "connecting"
  | "listening"
  | "speaking"
  | "building-route"
  | "text"
  | "submitting"
  | "complete"
  | "error";

export interface InterviewMachineState {
  status: InterviewStatus;
  reason?: string;
}

export type InterviewMachineEvent =
  | { type: "CONSENT" }
  | { type: "TOKEN_READY" }
  | { type: "CONNECTED" }
  | { type: "MODEL_SPEAKING" }
  | { type: "MODEL_DONE" }
  | { type: "BUILD_ROUTE" }
  | { type: "USE_TEXT"; reason?: string }
  | { type: "DEGRADED"; reason?: string }
  | { type: "SOCKET_DROPPED"; reason?: string }
  | { type: "SUBMIT" }
  | { type: "COMPLETE" }
  | { type: "FAIL"; reason: string };

export function transition(
  state: InterviewMachineState,
  event: InterviewMachineEvent,
): InterviewMachineState {
  if (
    state.status === "building-route" &&
    (event.type === "CONNECTED" ||
      event.type === "MODEL_SPEAKING" ||
      event.type === "MODEL_DONE")
  ) {
    return state;
  }
  switch (event.type) {
    case "CONSENT":
      return { status: "requesting-token" };
    case "TOKEN_READY":
      return { status: "connecting" };
    case "CONNECTED":
    case "MODEL_DONE":
      return { status: "listening" };
    case "MODEL_SPEAKING":
      return { status: "speaking" };
    case "BUILD_ROUTE":
      return { status: "building-route" };
    case "USE_TEXT":
    case "DEGRADED":
    case "SOCKET_DROPPED":
      return { status: "text", reason: event.reason };
    case "SUBMIT":
      return { status: "submitting" };
    case "COMPLETE":
      return { status: "complete" };
    case "FAIL":
      return { status: "error", reason: event.reason };
  }
}

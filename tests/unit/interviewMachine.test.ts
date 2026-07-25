import { transition } from "../../src/features/interview/interviewMachine";

describe("interview state machine", () => {
  it("moves from consent to a live session", () => {
    const requesting = transition({ status: "idle" }, { type: "CONSENT" });
    const connecting = transition(requesting, { type: "TOKEN_READY" });
    const listening = transition(connecting, { type: "CONNECTED" });

    expect(requesting.status).toBe("requesting-token");
    expect(connecting.status).toBe("connecting");
    expect(listening.status).toBe("listening");
  });

  it.each(["DEGRADED", "SOCKET_DROPPED", "USE_TEXT"] as const)(
    "switches to written mode on %s",
    (type) => {
      expect(
        transition(
          { status: "listening" },
          { type, reason: "answers preserved" },
        ),
      ).toEqual({ status: "text", reason: "answers preserved" });
    },
  );

  it("keeps route building sticky through the mentor's final turn", () => {
    const building = transition(
      { status: "listening" },
      { type: "BUILD_ROUTE" },
    );
    expect(transition(building, { type: "CONNECTED" })).toBe(building);
    expect(transition(building, { type: "MODEL_SPEAKING" })).toBe(building);
    expect(transition(building, { type: "MODEL_DONE" })).toBe(building);
  });
});

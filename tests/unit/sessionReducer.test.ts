import demoProfileJson from "../../src/contracts/generated/fixtures/demo-profile.json";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import lessonJson from "../../src/contracts/generated/fixtures/iam-fundamentals-lesson.json";
import type {
  AdaptationDecision,
  LearnerProfile,
  Lesson,
  ProfileResponse,
  RouteState,
} from "../../src/contracts/generated/contracts";
import { sessionReducer } from "../../src/state/sessionReducer";
import {
  initialSessionState,
  type SessionState,
} from "../../src/state/sessionTypes";

const demoProfile = demoProfileJson as LearnerProfile;
const demoRoute = demoRouteJson as RouteState;
const lesson = lessonJson as Lesson;

const profileResponse: ProfileResponse = {
  profile: demoProfile,
  route: demoRoute,
  degraded: true,
  source: "deterministic",
};

describe("sessionReducer", () => {
  it("stores a profile response without mutating the previous state", () => {
    const next = sessionReducer(initialSessionState, {
      type: "profile/loaded",
      payload: profileResponse,
    });

    expect(next.route?.routeVersion).toBe(1);
    expect(next.providerMode).toBe("degraded");
    expect(initialSessionState.route).toBeNull();
  });

  it("clears the previous active lesson when a new profile route loads", () => {
    const state: SessionState = {
      ...initialSessionState,
      profile: demoProfile,
      route: demoRoute,
      activeLesson: lesson,
    };

    const next = sessionReducer(state, {
      type: "profile/loaded",
      payload: profileResponse,
    });

    expect(next.activeLesson).toBeNull();
    expect(state.activeLesson).toBe(lesson);
  });

  it("replaces an interview answer with the same question id", () => {
    const answered = sessionReducer(initialSessionState, {
      type: "interview/answered",
      payload: { questionId: "goal", answer: "Primera meta" },
    });
    const corrected = sessionReducer(answered, {
      type: "interview/answered",
      payload: { questionId: "goal", answer: "Aprobar Cloud Practitioner" },
    });

    expect(corrected.interviewAnswers).toEqual([
      { questionId: "goal", answer: "Aprobar Cloud Practitioner" },
    ]);
  });

  it("rejects an adaptation for a stale route version", () => {
    const routeV2 = { ...demoRoute, routeVersion: 2 } as RouteState;
    const state: SessionState = {
      ...initialSessionState,
      route: routeV2,
    };
    const staleDecision: AdaptationDecision = {
      requestRouteVersion: 1,
      diagnosis: "Stale",
      rationale: "The route already changed.",
      operations: [],
    };

    expect(
      sessionReducer(state, {
        type: "adaptation/applied",
        payload: {
          decision: staleDecision,
          routeBefore: { ...demoRoute, routeVersion: 1 },
          routeAfter: routeV2,
          degraded: true,
          source: "deterministic",
        },
      }),
    ).toBe(state);
  });

  it("applies a fresh adaptation atomically and keeps its provenance", () => {
    const state: SessionState = {
      ...initialSessionState,
      route: demoRoute,
    };
    const decision: AdaptationDecision = {
      requestRouteVersion: 1,
      diagnosis: "Confundió control de acceso con cifrado.",
      rationale: "Insertar una comparación antes de continuar.",
      operations: [],
    };
    const routeAfter = { ...demoRoute, routeVersion: 2 } as RouteState;

    const next = sessionReducer(state, {
      type: "adaptation/applied",
      payload: {
        decision,
        routeBefore: demoRoute,
        routeAfter,
        degraded: true,
        source: "deterministic",
      },
    });

    expect(next.route?.routeVersion).toBe(2);
    expect(next.lastAdaptation?.routeBefore.routeVersion).toBe(1);
    expect(next.lastAdaptation?.source).toBe("deterministic");
    expect(next.providerMode).toBe("degraded");
  });

  it("clears stale adaptation provenance when a new attempt starts", () => {
    const decision: AdaptationDecision = {
      requestRouteVersion: 1,
      diagnosis: "Anterior",
      rationale: "Anterior",
      operations: [],
    };
    const state: SessionState = {
      ...initialSessionState,
      route: demoRoute,
      lastAdaptation: {
        decision,
        routeBefore: demoRoute,
        routeAfter: { ...demoRoute, routeVersion: 2 },
        degraded: true,
        source: "deterministic",
      },
    };

    const next = sessionReducer(state, {
      type: "attempt/recorded",
      payload: {
        nodeId: "security-iam-fundamentals",
        answer: "KMS",
        correct: false,
        confidence: "high",
        responseTimeMs: 12,
        hintsUsed: 0,
        createdAt: "2026-07-24T22:00:00Z",
      },
    });

    expect(next.lastAdaptation).toBeNull();
  });

  it("restores the applied adaptation marker with the persisted route", () => {
    const routeAfter = {
      ...demoRoute,
      routeVersion: demoRoute.routeVersion + 1,
    } as RouteState;
    const decision: AdaptationDecision = {
      requestRouteVersion: demoRoute.routeVersion,
      diagnosis: "Refuerzo ya procesado.",
      rationale: "No se debe procesar dos veces el mismo intento.",
      operations: [],
    };
    const lastAdaptation = {
      decision,
      routeBefore: demoRoute,
      routeAfter,
      degraded: true,
      source: "deterministic" as const,
    };

    const next = sessionReducer(initialSessionState, {
      type: "session/restored",
      payload: {
        schemaVersion: 1,
        profile: demoProfile,
        route: routeAfter,
        attempts: [],
        lastAdaptation,
      },
    });

    expect(next.lastAdaptation).toEqual(lastAdaptation);
    expect(next.route?.routeVersion).toBe(routeAfter.routeVersion);
  });
});

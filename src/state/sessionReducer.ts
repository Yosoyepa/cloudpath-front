import {
  initialSessionState,
  type SessionAction,
  type SessionState,
} from "./sessionTypes";

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "interview/answered": {
      const withoutPrevious = state.interviewAnswers.filter(
        (answer) => answer.questionId !== action.payload.questionId,
      );
      return {
        ...state,
        interviewAnswers: [...withoutPrevious, action.payload],
      };
    }
    case "interview/transcript":
      return { ...state, transcript: action.payload };
    case "profile/loaded":
      return {
        ...state,
        profile: action.payload.profile,
        route: action.payload.route,
        activeLesson: null,
        providerMode: action.payload.degraded ? "degraded" : "online",
      };
    case "lesson/loaded":
      return { ...state, activeLesson: action.payload };
    case "attempt/recorded":
      return {
        ...state,
        attempts: [...state.attempts.slice(-5), action.payload],
        lastAdaptation: null,
        localSignal: null,
      };
    case "route/local-signal":
      return { ...state, localSignal: action.payload };
    case "route/replaced":
      return {
        ...state,
        route: action.payload,
        lastAdaptation: null,
        localSignal: null,
      };
    case "adaptation/applied":
      if (
        state.route === null ||
        action.payload.decision.requestRouteVersion !==
          state.route.routeVersion ||
        action.payload.routeBefore.routeVersion !== state.route.routeVersion ||
        action.payload.routeAfter.routeVersion !== state.route.routeVersion + 1
      ) {
        return state;
      }
      return {
        ...state,
        route: action.payload.routeAfter,
        lastAdaptation: action.payload,
        providerMode: action.payload.degraded ? "degraded" : "online",
      };
    case "provider/degraded":
      return { ...state, providerMode: "degraded" };
    case "session/restored":
      return {
        ...initialSessionState,
        profile: action.payload.profile,
        route: action.payload.route,
        attempts: action.payload.attempts,
        lastAdaptation: action.payload.lastAdaptation ?? null,
      };
    case "session/reset":
      return initialSessionState;
  }
}

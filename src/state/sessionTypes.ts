import type {
  AdaptResponse,
  AdaptationDecision,
  Attempt,
  InterviewAnswer,
  LearnerProfile,
  Lesson,
  ProfileResponse,
  RouteState,
} from "../contracts/generated/contracts";

export type LocalIntervention =
  | "advance"
  | "reinforce"
  | "correct_mental_model"
  | "return_to_prerequisite";

export interface LocalSignal {
  nodeId: string;
  masteryDelta: number;
  kind: LocalIntervention;
}

export interface AppliedAdaptation {
  decision: AdaptationDecision;
  routeBefore: RouteState;
  routeAfter: RouteState;
  // Intentionally tied to AdaptResponse: MiniMax is a profile-route fallback,
  // not an adaptation provider.
  source: AdaptResponse["source"];
  degraded: boolean;
}

export interface SessionState {
  schemaVersion: 1;
  profile: LearnerProfile | null;
  route: RouteState | null;
  attempts: Attempt[];
  interviewAnswers: InterviewAnswer[];
  transcript: string;
  activeLesson: Lesson | null;
  lastAdaptation: AppliedAdaptation | null;
  localSignal: LocalSignal | null;
  providerMode: "online" | "degraded" | "demo";
}

export interface PersistedSession {
  schemaVersion: 1;
  profile: LearnerProfile | null;
  route: RouteState | null;
  attempts: Attempt[];
  lastAdaptation?: AppliedAdaptation | null;
}

export type SessionAction =
  | { type: "interview/answered"; payload: InterviewAnswer }
  | { type: "interview/transcript"; payload: string }
  | { type: "profile/loaded"; payload: ProfileResponse }
  | { type: "lesson/loaded"; payload: Lesson }
  | { type: "attempt/recorded"; payload: Attempt }
  | { type: "route/local-signal"; payload: LocalSignal }
  | { type: "route/replaced"; payload: RouteState }
  | { type: "adaptation/applied"; payload: AppliedAdaptation }
  | { type: "provider/degraded" }
  | { type: "session/restored"; payload: PersistedSession }
  | { type: "session/reset" };

export const initialSessionState: SessionState = {
  schemaVersion: 1,
  profile: null,
  route: null,
  attempts: [],
  interviewAnswers: [],
  transcript: "",
  activeLesson: null,
  lastAdaptation: null,
  localSignal: null,
  providerMode: "online",
};

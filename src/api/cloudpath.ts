import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import adaptResponseSchema from "../contracts/generated/schemas/AdaptResponse.json";
import lessonResponseSchema from "../contracts/generated/schemas/LessonResponse.json";
import profileResponseSchema from "../contracts/generated/schemas/ProfileResponse.json";
import voiceTokenResponseSchema from "../contracts/generated/schemas/VoiceTokenResponse.json";
import type {
  AdaptRequest,
  AdaptResponse,
  LessonRequest,
  LessonResponse,
  ProfileRequest,
  ProfileResponse,
  VoiceTokenResponse,
} from "../contracts/generated/contracts";
import { requestJson, type JsonValidator } from "./client";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function validator<T>(schema: object): JsonValidator<T> {
  const validate: ValidateFunction = ajv.compile(schema);
  return (value: unknown): value is T => validate(value);
}

const validatesProfile = validator<ProfileResponse>(profileResponseSchema);
const validatesLesson = validator<LessonResponse>(lessonResponseSchema);
const validatesAdaptation = validator<AdaptResponse>(adaptResponseSchema);
const validatesVoiceToken =
  validator<VoiceTokenResponse>(voiceTokenResponseSchema);

export const cloudpathApi = {
  profile: (body: ProfileRequest) =>
    requestJson<ProfileResponse>("/api/profile", {
      method: "POST",
      body,
      headers: { "X-CloudPath-Session": getAnonymousSessionId() },
      timeoutMs: 16_000,
      validate: validatesProfile,
    }),
  lesson: (body: LessonRequest) =>
    requestJson<LessonResponse>("/api/lesson", {
      method: "POST",
      body,
      headers: { "X-CloudPath-Session": getAnonymousSessionId() },
      timeoutMs: 60_000,
      validate: validatesLesson,
    }),
  adapt: (body: AdaptRequest) =>
    requestJson<AdaptResponse>("/api/adapt", {
      method: "POST",
      body,
      headers: { "X-CloudPath-Session": getAnonymousSessionId() },
      timeoutMs: 18_000,
      validate: validatesAdaptation,
    }),
  voiceToken: (sessionId: string) =>
    requestJson<VoiceTokenResponse>("/api/voice/token", {
      method: "POST",
      headers: { "X-CloudPath-Session": sessionId },
      timeoutMs: 10_000,
      validate: validatesVoiceToken,
    }),
};

export function getAnonymousSessionId(
  storage: Pick<Storage, "getItem" | "setItem"> = window.sessionStorage,
): string {
  const key = "cloudpath.anonymous-session";
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  storage.setItem(key, created);
  return created;
}

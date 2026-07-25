import { cloudpathApi } from "../../api/cloudpath";
import type {
  LearnerProfile,
  LessonResponse,
} from "../../contracts/generated/contracts";

const inFlightLessons = new Map<string, Promise<LessonResponse>>();

export function requestLesson(
  profile: LearnerProfile,
  nodeId: string,
): Promise<LessonResponse> {
  const key = JSON.stringify({ nodeId, profile });
  const existing = inFlightLessons.get(key);
  if (existing) {
    return existing;
  }

  const request = cloudpathApi.lesson({ profile, nodeId });
  inFlightLessons.set(key, request);
  const clear = () => {
    if (inFlightLessons.get(key) === request) {
      inFlightLessons.delete(key);
    }
  };
  void request.then(clear, clear);
  return request;
}

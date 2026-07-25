import { cloudpathApi } from "../../src/api/cloudpath";
import demoProfileJson from "../../src/contracts/generated/fixtures/demo-profile.json";
import lessonJson from "../../src/contracts/generated/fixtures/iam-fundamentals-lesson.json";
import type {
  AdaptRequest,
  AdaptResponse,
  LearnerProfile,
  Lesson,
  LessonResponse,
} from "../../src/contracts/generated/contracts";

const profile = demoProfileJson as LearnerProfile;
const lesson = lessonJson as Lesson;

describe("cloudpathApi", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("sends the anonymous session id with lesson requests", async () => {
    window.sessionStorage.setItem(
      "cloudpath.anonymous-session",
      "lesson-session-id",
    );
    const response: LessonResponse = {
      lesson,
      degraded: true,
      source: "local_catalog",
    };
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("x-cloudpath-session")).toBe(
        "lesson-session-id",
      );
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      cloudpathApi.lesson({
        profile,
        nodeId: lesson.nodeId,
      }),
    ).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends the same anonymous session id with adaptation requests", async () => {
    window.sessionStorage.setItem(
      "cloudpath.anonymous-session",
      "adapt-session-id",
    );
    const response: AdaptResponse = {
      decision: {
        requestRouteVersion: 1,
        diagnosis: "Conviene reforzar el concepto.",
        rationale: "La respuesta incorrecta revela una brecha concreta.",
        operations: [
          {
            type: "reinforce_node",
            nodeId: lesson.nodeId,
            masteryDelta: -15,
          },
        ],
      },
      degraded: false,
      source: "claude",
    };
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("x-cloudpath-session")).toBe(
        "adapt-session-id",
      );
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const body: AdaptRequest = {
      profile,
      routeVersion: 1,
      nodeIds: [lesson.nodeId],
      attempts: [
        {
          nodeId: lesson.nodeId,
          answer: "Respuesta intencionalmente incorrecta",
          correct: false,
          confidence: "high",
          responseTimeMs: 1_000,
          hintsUsed: 0,
          createdAt: "2026-07-25T05:00:00Z",
        },
      ],
    };

    await expect(cloudpathApi.adapt(body)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

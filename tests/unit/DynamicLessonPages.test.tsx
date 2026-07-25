import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import demoProfileJson from "../../src/contracts/generated/fixtures/demo-profile.json";
import demoRouteJson from "../../src/contracts/generated/fixtures/demo-route.json";
import lessonFixtureJson from "../../src/contracts/generated/fixtures/iam-fundamentals-lesson.json";
import type {
  LearnerProfile,
  Lesson,
  LessonResponse,
  RouteState,
} from "../../src/contracts/generated/contracts";
import AssessmentPage from "../../src/pages/AssessmentPage";
import LessonPage from "../../src/pages/LessonPage";
import {
  initialSessionState,
  type SessionState,
} from "../../src/state/sessionTypes";

const runtime = vi.hoisted(() => ({
  dispatch: vi.fn(),
  lesson: vi.fn(),
  state: null as unknown,
}));

vi.mock("../../src/api/cloudpath", () => ({
  cloudpathApi: {
    lesson: runtime.lesson,
  },
}));

vi.mock("../../src/state/SessionProvider", () => ({
  useSession: () => ({
    state: runtime.state,
    dispatch: runtime.dispatch,
    reset: vi.fn(),
  }),
}));

const profile = demoProfileJson as LearnerProfile;
const route = {
  ...(demoRouteJson as unknown as RouteState),
  activeNodeId: "cloud-value-proposition",
};
const dynamicLesson = {
  ...(lessonFixtureJson as Lesson),
  nodeId: "cloud-value-proposition",
  title: "Propuesta de valor de la nube",
  content: "Elasticidad, agilidad y pago por uso.",
  activity: "Explica qué valor obtiene una empresa al evitar capacidad ociosa.",
  question: {
    ...(lessonFixtureJson as Lesson).question,
    id: "cloud-value-proposition-q1",
    prompt: "¿Qué beneficio representa ajustar capacidad según la demanda?",
    options: ["Elasticidad", "Contratos perpetuos"],
    correctOptionIndex: 0,
  },
} as Lesson;
const response: LessonResponse = {
  degraded: false,
  lesson: dynamicLesson,
  source: "aws_knowledge_mcp",
};

function setState(activeLesson: Lesson | null = null) {
  runtime.state = {
    ...initialSessionState,
    profile,
    route,
    activeLesson,
  } satisfies SessionState;
}

describe("dynamic lesson routes", () => {
  beforeEach(() => {
    runtime.dispatch.mockReset();
    runtime.lesson.mockReset();
    setState();
  });

  it("rejects a lesson node that is not part of the current route before fetching", async () => {
    render(
      <MemoryRouter initialEntries={["/lesson/not-in-my-route"]}>
        <Routes>
          <Route path="/lesson/:nodeId" element={<LessonPage />} />
          <Route path="/route" element={<p>Ruta vigente</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ruta vigente")).toBeVisible();
    expect(runtime.lesson).not.toHaveBeenCalled();
  });

  it("loads an arbitrary route lesson by nodeId", async () => {
    runtime.lesson.mockResolvedValueOnce(response);

    render(
      <MemoryRouter initialEntries={["/lesson/cloud-value-proposition"]}>
        <Routes>
          <Route path="/lesson/:nodeId" element={<LessonPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: dynamicLesson.title }),
    ).toBeVisible();
    expect(runtime.lesson).toHaveBeenCalledWith({
      profile,
      nodeId: "cloud-value-proposition",
    });
  });

  it("re-fetches an arbitrary lesson before rendering its assessment", async () => {
    runtime.lesson.mockResolvedValueOnce(response);

    render(
      <MemoryRouter initialEntries={["/assessment/cloud-value-proposition"]}>
        <Routes>
          <Route path="/assessment/:nodeId" element={<AssessmentPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(dynamicLesson.question.prompt),
    ).toBeVisible();
    await waitFor(() =>
      expect(runtime.lesson).toHaveBeenCalledWith({
        profile,
        nodeId: "cloud-value-proposition",
      }),
    );
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { LessonView } from "../../src/features/lesson/LessonView";
import lessonFixture from "../../src/contracts/generated/fixtures/iam-fundamentals-lesson.json";
import type { Lesson } from "../../src/contracts/generated/contracts";

describe("LessonView", () => {
  it("renders contract content, sources, and the assessment handoff", () => {
    render(
      <MemoryRouter>
        <LessonView lesson={lessonFixture as Lesson} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: lessonFixture.title }),
    ).toBeVisible();
    expect(screen.getByText(lessonFixture.activity)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Probar lo que entendí" }),
    ).toHaveAttribute(
      "href",
      `/assessment/${lessonFixture.nodeId}`,
    );
    expect(
      screen.getAllByRole("link", { name: /abrir .* pestaña nueva/i }),
    ).toHaveLength(lessonFixture.sourceRefs.length);
    expect(document.getElementById("sources")).toHaveAttribute(
      "aria-label",
      "Fuentes oficiales",
    );
  });

  it("makes fallback mode explicit", () => {
    render(
      <MemoryRouter>
        <LessonView lesson={lessonFixture as Lesson} degraded />
      </MemoryRouter>,
    );

    expect(screen.getByText("Modo respaldo")).toBeVisible();
  });

  it("uses topic-neutral learning labels", () => {
    const lesson = {
      ...(lessonFixture as Lesson),
      nodeId: "cloud-value-proposition",
      title: "Propuesta de valor de la nube",
    };

    render(
      <MemoryRouter>
        <LessonView lesson={lesson} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Idea clave" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Ponlo en práctica" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Quién actúa y qué puede hacer"),
    ).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssessmentForm } from "../../src/features/assessment/AssessmentForm";
import type { AssessmentQuestion } from "../../src/contracts/generated/contracts";

const question: AssessmentQuestion = {
  id: "iam-fundamentals-q1",
  prompt: "¿Cómo debe acceder una instancia EC2 a Amazon S3?",
  options: [
    "Guardar claves permanentes",
    "Usar un rol IAM",
    "Cifrar con KMS",
    "Hacer público el bucket",
  ],
  correctOptionIndex: 1,
  explanation: "El rol entrega credenciales temporales.",
};

describe("AssessmentForm", () => {
  it("requires an answer first and moves focus to its group", async () => {
    const user = userEvent.setup();
    render(<AssessmentForm question={question} onSubmit={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Comprobar respuesta" }),
    );

    const answerGroup = screen.getByRole("group", { name: question.prompt });
    expect(answerGroup).toHaveFocus();
    expect(screen.getByText(/elige la opción/i)).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("requires confidence after an answer and moves focus to confidence", async () => {
    const user = userEvent.setup();
    render(<AssessmentForm question={question} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Cifrar con KMS" }));
    await user.click(
      screen.getByRole("button", { name: "Comprobar respuesta" }),
    );

    expect(
      screen.getByRole("group", { name: /qué tan seguro estás/i }),
    ).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /indica tu nivel de confianza/i,
    );
  });

  it("submits the selected option and visible confidence", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AssessmentForm question={question} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("radio", { name: "Cifrar con KMS" }));
    await user.click(
      screen.getByRole("radio", { name: /^estoy seguro/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Comprobar respuesta" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      optionIndex: 2,
      confidence: "high",
    });
  });
});

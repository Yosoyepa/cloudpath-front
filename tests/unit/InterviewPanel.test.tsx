import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InterviewPanel } from "../../src/features/interview/InterviewPanel";

const baseProps = {
  status: "idle" as const,
  step: 0,
  total: 6,
  answer: "",
  transcript: "",
  preview: { nodes: [], edges: [] },
  onAnswer: vi.fn(),
  onConsent: vi.fn(),
  onUseText: vi.fn(),
  onWrittenSubmit: vi.fn(),
  onFinishVoice: vi.fn(),
};

describe("InterviewPanel", () => {
  it("asks for explicit consent before voice capture", async () => {
    const user = userEvent.setup();
    const onConsent = vi.fn();
    render(<InterviewPanel {...baseProps} onConsent={onConsent} />);

    expect(screen.getByText(/no guardamos el audio/i)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /permitir micrófono/i }),
    );
    expect(onConsent).toHaveBeenCalledOnce();
  });

  it("offers an equivalent written route", () => {
    render(
      <InterviewPanel
        {...baseProps}
        status="text"
        question={{
          prompt: "¿Qué quieres conseguir?",
          placeholder: "Tu objetivo",
        }}
      />,
    );

    expect(screen.getByRole("textbox")).toBeVisible();
    expect(screen.getByText(/señal 1 de 6/i)).toBeVisible();
  });

  it("offers a new voice session after voice fallback", async () => {
    const user = userEvent.setup();
    const onNewVoiceSession = vi.fn();
    render(
      <InterviewPanel
        {...baseProps}
        status="text"
        reason="La voz no pudo iniciar."
        question={{
          prompt: "¿Qué quieres conseguir?",
          placeholder: "Tu objetivo",
        }}
        onNewVoiceSession={onNewVoiceSession}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /iniciar nueva sesión de voz/i,
      }),
    );

    expect(onNewVoiceSession).toHaveBeenCalledOnce();
  });

  it("announces inline validation without discarding the question", () => {
    render(
      <InterviewPanel
        {...baseProps}
        status="text"
        question={{
          prompt: "¿Qué quieres conseguir?",
          placeholder: "Tu objetivo",
        }}
        validationError="Escribe una respuesta."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escribe una respuesta.",
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("explains that microphone permission happens before provider connection", () => {
    render(<InterviewPanel {...baseProps} status="requesting-token" />);

    expect(
      screen.getByText(/solo después prepararemos la conexión/i),
    ).toBeVisible();
  });

  it("locks manual exits while the route is being built", () => {
    render(
      <InterviewPanel
        {...baseProps}
        status="building-route"
        transcript="Tú: Quiero aprobar"
      />,
    );

    expect(screen.getByText(/estoy ordenando tu ruta/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /terminar y crear/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continuar por escrito/i }),
    ).not.toBeInTheDocument();
  });

  it("supports keyboard navigation between the mobile tabs", async () => {
    const user = userEvent.setup();
    render(<InterviewPanel {...baseProps} />);

    const mentorTab = screen.getByRole("tab", { name: "Mentor" });
    const routeTab = screen.getByRole("tab", { name: "Mi ruta" });
    mentorTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(routeTab).toHaveFocus();
    expect(routeTab).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(mentorTab).toHaveFocus();
    expect(mentorTab).toHaveAttribute("aria-selected", "true");
  });
});

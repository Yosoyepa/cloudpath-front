import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { cloudpathApi } from "../api/cloudpath";
import { interviewQuestions } from "../content/interviewQuestions";
import type {
  InterviewAnswer,
  ProfileRequest,
} from "../contracts/generated/contracts";
import { InterviewPanel } from "../features/interview/InterviewPanel";
import "../features/interview/interview.css";
import { projectInterviewRoute } from "../features/interview/interviewRoutePreview";
import {
  mergeComplete,
  mergeSignal,
  toProfileAnswers,
  writtenAnswerToSignal,
  type LearningSignals,
} from "../features/interview/interviewSignals";
import { useVoiceSession } from "../features/interview/useVoiceSession";
import { useSession } from "../state/SessionProvider";

export default function InterviewPage() {
  const navigate = useNavigate();
  const { dispatch } = useSession();
  const [forceText, setForceText] = useState(false);
  const [reason, setReason] = useState<string>();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [validationError, setValidationError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [signals, setSignals] = useState<LearningSignals>({});
  const signalsRef = useRef<LearningSignals>({});
  const transcriptRef = useRef("");
  const completionStartedRef = useRef(false);

  async function createProfile(
    finalAnswers: InterviewAnswer[],
    transcript: string,
  ) {
    setSubmitting(true);
    setReason("Estamos convirtiendo tus señales en una ruta.");
    const warning = window.setTimeout(
      () =>
        setReason(
          "La personalización está tardando más de lo usual. El modo respaldo sigue disponible.",
        ),
      8_000,
    );
    try {
      const response = await cloudpathApi.profile({
        transcript,
        answers: finalAnswers as NonNullable<ProfileRequest["answers"]>,
      });
      dispatch({ type: "profile/loaded", payload: response });
      dispatch({ type: "interview/transcript", payload: "" });
      transcriptRef.current = "";
      navigate("/route");
    } catch {
      completionStartedRef.current = false;
      setSubmitting(false);
      setForceText(true);
      setReason(
        "No pudimos crear el perfil todavía. Tus respuestas se conservan para intentarlo de nuevo.",
      );
    } finally {
      window.clearTimeout(warning);
    }
  }

  async function createProfileOnce(
    finalSignals: LearningSignals,
    transcript: string,
  ) {
    if (completionStartedRef.current) return;
    completionStartedRef.current = true;
    await createProfile(toProfileAnswers(finalSignals), transcript);
  }

  const voice = useVoiceSession({
    onTranscript: (transcript) => {
      transcriptRef.current = transcript;
      dispatch({ type: "interview/transcript", payload: transcript });
    },
    onFallback: (message) => {
      setForceText(true);
      setReason(message);
    },
    onSignal: (signal) => {
      setSignals((current) => {
        const next = mergeSignal(current, signal);
        signalsRef.current = next;
        return next;
      });
    },
    onAutoComplete: (complete) => {
      const finalSignals = mergeComplete(signalsRef.current, complete);
      signalsRef.current = finalSignals;
      setSignals(finalSignals);
      void createProfileOnce(finalSignals, transcriptRef.current);
    },
  });

  function submitWrittenAnswer() {
    const clean = answer.trim();
    if (!clean) {
      setValidationError(
        "Aún no has escrito una respuesta. Cuéntanos tu idea para registrar esta señal.",
      );
      return;
    }
    const currentQuestion = interviewQuestions[step];
    if (!currentQuestion) {
      return;
    }
    const nextAnswer: InterviewAnswer = {
      questionId: currentQuestion.id,
      answer: clean,
    };
    dispatch({ type: "interview/answered", payload: nextAnswer });
    const signal = writtenAnswerToSignal(currentQuestion.id, clean);
    if (signal) {
      const nextSignals = mergeSignal(signalsRef.current, signal);
      signalsRef.current = nextSignals;
      setSignals(nextSignals);
    }
    setAnswer("");
    setValidationError(undefined);
    if (step + 1 === interviewQuestions.length) {
      void createProfileOnce(signalsRef.current, transcriptRef.current);
      return;
    }
    setStep((current) => current + 1);
  }

  async function finishVoice() {
    await voice.finish();
    await createProfileOnce(signalsRef.current, transcriptRef.current);
  }

  async function useWrittenMode() {
    await voice.stop();
    setForceText(true);
    setReason(
      voice.transcript
        ? "La conversación se conserva como contexto. Continúa por escrito."
        : "Modo escrito activo. Responde a tu ritmo.",
    );
  }

  async function startNewVoiceSession() {
    await voice.restart();
    setForceText(false);
    setReason(undefined);
    await voice.start();
  }

  const status = submitting
    ? "submitting"
    : forceText
      ? "text"
      : voice.state.status;
  const preview = useMemo(() => projectInterviewRoute(signals), [signals]);

  return (
    <div className="interview-page">
      <InterviewPanel
        status={status}
        reason={reason ?? voice.state.reason}
        question={interviewQuestions[step]}
        step={step}
        total={interviewQuestions.length}
        answer={answer}
        transcript={voice.transcript}
        validationError={validationError}
        preview={preview}
        onAnswer={setAnswer}
        onConsent={() => void voice.start()}
        onUseText={() => void useWrittenMode()}
        onWrittenSubmit={submitWrittenAnswer}
        onFinishVoice={() => void finishVoice()}
        onNewVoiceSession={
          voice.state.status === "text"
            ? () => void startNewVoiceSession()
            : undefined
        }
      />
    </div>
  );
}

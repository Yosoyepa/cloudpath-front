import {
  GoogleGenAI,
  Modality,
  type FunctionResponse,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  cloudpathApi,
  getAnonymousSessionId,
  renewAnonymousSessionId,
} from "../../api/cloudpath";
import {
  transition,
  type InterviewMachineState,
} from "./interviewMachine";
import {
  startMicrophoneCapture,
  type MicrophoneCapture,
} from "./audio/capture";
import { PcmPlayback } from "./audio/playback";
import {
  parseCompleteCall,
  parseSignalCall,
  type CompleteLearningIntake,
  type LearningSignal,
} from "./interviewSignals";

interface VoiceSessionOptions {
  onTranscript: (transcript: string) => void;
  onFallback: (reason: string) => void;
  onSignal?: (signal: LearningSignal) => void;
  onAutoComplete?: (intake: CompleteLearningIntake) => void;
}

interface PendingToolResponse {
  response: FunctionResponse;
  completionAck: boolean;
}

type VoiceDiagnosticCode =
  | "VOICE_MIC_DENIED"
  | "VOICE_MIC_FAILED"
  | "VOICE_TOKEN_DEGRADED"
  | "VOICE_TOKEN_FAILED"
  | "VOICE_CONNECT_FAILED"
  | "VOICE_CONNECT_TIMEOUT"
  | "VOICE_BILLING_UNAVAILABLE"
  | "VOICE_QUOTA_EXHAUSTED"
  | "VOICE_SOCKET_ERROR"
  | "VOICE_SOCKET_CLOSED"
  | "VOICE_FINISH_SEND_FAILED";

type VoiceCloseCategory = "billing" | "quota" | "unknown";

interface VoiceDiagnostic {
  code: VoiceDiagnosticCode;
  state: InterviewMachineState["status"];
  elapsedMs: number;
  close?: {
    code?: number;
    category: VoiceCloseCategory;
    reason: "" | "[redacted]";
  };
}

const CONNECT_TIMEOUT_MS = 8_000;

export interface VoiceSessionController {
  state: InterviewMachineState;
  transcript: string;
  start: () => Promise<void>;
  restart: () => Promise<void>;
  finish: () => Promise<void>;
  stop: () => Promise<void>;
}

function appendLine(current: string, speaker: "Tú" | "Mentor", text: string) {
  const clean = text.trim();
  if (!clean) {
    return current;
  }
  return `${current}${current ? "\n" : ""}${speaker}: ${clean}`;
}

function boundedElapsed(startedAt: number | null): number {
  if (startedAt === null) return 0;
  return Math.min(120_000, Math.max(0, Math.round(performance.now() - startedAt)));
}

function classifyCloseReason(reason: string): VoiceCloseCategory {
  const normalized = reason.toLowerCase();
  const depletedCredit =
    (normalized.includes("prepayment") || normalized.includes("credit")) &&
    (normalized.includes("deplet") || normalized.includes("no credit"));
  if (depletedCredit) return "billing";
  if (
    normalized.includes("resource_exhausted") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit")
  ) {
    return "quota";
  }
  return "unknown";
}

function closeDiagnostic(event: CloseEvent): VoiceDiagnostic["close"] {
  const validCode =
    Number.isInteger(event.code) && event.code >= 1000 && event.code <= 4999
      ? event.code
      : undefined;
  return {
    ...(validCode === undefined ? {} : { code: validCode }),
    category: classifyCloseReason(event.reason),
    // A provider close reason is not trusted: it could contain request data.
    reason: event.reason ? "[redacted]" : "",
  };
}

function closeFallback(event: CloseEvent): {
  reason: string;
  code: VoiceDiagnosticCode;
} {
  switch (classifyCloseReason(event.reason)) {
    case "billing":
      return {
        reason:
          "Gemini Live no tiene créditos activos en este proyecto. Puedes continuar por escrito.",
        code: "VOICE_BILLING_UNAVAILABLE",
      };
    case "quota":
      return {
        reason:
          "Gemini Live alcanzó su cuota temporal. Puedes continuar por escrito.",
        code: "VOICE_QUOTA_EXHAUSTED",
      };
    default:
      return {
        reason: "La sesión de voz terminó. Puedes continuar por escrito.",
        code: "VOICE_SOCKET_CLOSED",
      };
  }
}

export function useVoiceSession({
  onTranscript,
  onFallback,
  onSignal = () => undefined,
  onAutoComplete = () => undefined,
}: VoiceSessionOptions): VoiceSessionController {
  const [state, setState] = useState<InterviewMachineState>({
    status: "idle",
  });
  const [transcript, setTranscript] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const captureRef = useRef<MicrophoneCapture | null>(null);
  const playbackRef = useRef(new PcmPlayback());
  const attemptedRef = useRef(false);
  const startInFlightRef = useRef(false);
  const fallbackNotifiedRef = useRef(false);
  const stoppingRef = useRef(false);
  const runIdRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const stateRef = useRef<InterviewMachineState>({ status: "idle" });
  const onTranscriptRef = useRef(onTranscript);
  const onFallbackRef = useRef(onFallback);
  const onSignalRef = useRef(onSignal);
  const onAutoCompleteRef = useRef(onAutoComplete);
  const pendingToolResponsesRef = useRef<PendingToolResponse[]>([]);
  const completionAcceptedRef = useRef(false);
  const completionAckSentRef = useRef(false);
  const postAckOutputSeenRef = useRef(false);
  const completionFinishingRef = useRef(false);
  const pendingCompletionRef = useRef<CompleteLearningIntake | null>(null);
  const completionFallbackTimerRef = useRef<number | undefined>(undefined);
  onTranscriptRef.current = onTranscript;
  onFallbackRef.current = onFallback;
  onSignalRef.current = onSignal;
  onAutoCompleteRef.current = onAutoComplete;

  const move = useCallback((event: Parameters<typeof transition>[1]) => {
    setState((current) => {
      const next = transition(current, event);
      stateRef.current = next;
      return next;
    });
  }, []);

  const diagnose = useCallback(
    (code: VoiceDiagnosticCode, event?: CloseEvent) => {
      if (!import.meta.env.DEV) return;
      const diagnostic: VoiceDiagnostic = {
        code,
        state: stateRef.current.status,
        elapsedMs: boundedElapsed(startedAtRef.current),
        ...(event ? { close: closeDiagnostic(event) } : {}),
      };
      // Never include tokens, transcripts, provider errors, or raw close reasons.
      console.debug("[CloudPath voice]", diagnostic);
    },
    [],
  );

  const updateTranscript = useCallback(
    (speaker: "Tú" | "Mentor", text: string) => {
      setTranscript((current) => {
        const next = appendLine(current, speaker, text);
        onTranscriptRef.current(next);
        return next;
      });
    },
    [],
  );

  const stop = useCallback(async () => {
    stoppingRef.current = true;
    startInFlightRef.current = false;
    runIdRef.current += 1;
    if (completionFallbackTimerRef.current !== undefined) {
      window.clearTimeout(completionFallbackTimerRef.current);
      completionFallbackTimerRef.current = undefined;
    }
    const capture = captureRef.current;
    captureRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    await Promise.allSettled([
      capture?.stop() ?? Promise.resolve(),
      playbackRef.current.close(),
    ]);
  }, []);

  const degrade = useCallback(
    async (
      reason: string,
      code: VoiceDiagnosticCode,
      closeEvent?: CloseEvent,
    ) => {
      if (stoppingRef.current || fallbackNotifiedRef.current) return;
      fallbackNotifiedRef.current = true;
      diagnose(code, closeEvent);
      await stop();
      move({ type: "SOCKET_DROPPED", reason });
      onFallbackRef.current(reason);
    },
    [diagnose, move, stop],
  );

  const finishCompletion = useCallback(() => {
    const complete = pendingCompletionRef.current;
    if (!complete || completionFinishingRef.current) return;
    completionFinishingRef.current = true;
    pendingCompletionRef.current = null;
    if (completionFallbackTimerRef.current !== undefined) {
      window.clearTimeout(completionFallbackTimerRef.current);
      completionFallbackTimerRef.current = undefined;
    }
    void (async () => {
      await playbackRef.current.waitForIdle(4_000);
      await stop();
      onAutoCompleteRef.current(complete);
    })();
  }, [stop]);

  const sendToolResponse = useCallback(
    (pending: PendingToolResponse) => {
      const session = sessionRef.current;
      if (!session) {
        if (pendingToolResponsesRef.current.length < 12) {
          pendingToolResponsesRef.current.push(pending);
        }
        return;
      }
      try {
        session.sendToolResponse({ functionResponses: [pending.response] });
        if (pending.completionAck) {
          completionAckSentRef.current = true;
          completionFallbackTimerRef.current = window.setTimeout(
            finishCompletion,
            6_000,
          );
        }
      } catch {
        void degrade(
          "No pudimos confirmar una señal de voz. Puedes continuar por escrito.",
          "VOICE_SOCKET_ERROR",
        );
      }
    },
    [degrade, finishCompletion],
  );

  const onMessage = useCallback(
    (message: LiveServerMessage) => {
      for (const call of message.toolCall?.functionCalls ?? []) {
        if (!call.name) continue;
        if (call.name === "record_learning_signal") {
          const signal = parseSignalCall(call.args);
          if (signal) onSignalRef.current(signal);
          sendToolResponse({
            response: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: { accepted: Boolean(signal) },
            },
            completionAck: false,
          });
        } else if (call.name === "complete_learning_intake") {
          const complete = parseCompleteCall(call.args);
          const wasDuplicate = completionAcceptedRef.current;
          if (complete && !wasDuplicate) {
            completionAcceptedRef.current = true;
            pendingCompletionRef.current = complete;
            move({ type: "BUILD_ROUTE" });
          }
          sendToolResponse({
            response: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: {
                accepted: Boolean(complete),
                duplicate: Boolean(complete && wasDuplicate),
              },
            },
            completionAck: Boolean(complete && !wasDuplicate),
          });
        } else {
          sendToolResponse({
            response: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: { accepted: false, error: "unknown_tool" },
            },
            completionAck: false,
          });
        }
      }

      const content = message.serverContent;
      const userText = content?.inputTranscription?.text;
      const mentorText = content?.outputTranscription?.text;
      if (userText) {
        updateTranscript("Tú", userText);
      }
      if (mentorText) {
        updateTranscript("Mentor", mentorText);
      }
      if (content?.interrupted) {
        playbackRef.current.clear();
      }
      if (message.data) {
        move({ type: "MODEL_SPEAKING" });
        void playbackRef.current.enqueue(message.data);
      }
      if (
        completionAckSentRef.current &&
        pendingCompletionRef.current &&
        Boolean(mentorText || message.data || content?.modelTurn)
      ) {
        postAckOutputSeenRef.current = true;
      }
      if (content?.turnComplete) {
        if (
          completionAckSentRef.current &&
          postAckOutputSeenRef.current
        ) {
          finishCompletion();
        } else {
          move({ type: "MODEL_DONE" });
        }
      }
    },
    [finishCompletion, move, sendToolResponse, updateTranscript],
  );

  const start = useCallback(async () => {
    if (startInFlightRef.current) return;
    if (attemptedRef.current) {
      onFallbackRef.current(
        "La sesión de voz ya se utilizó; continuamos por escrito.",
      );
      const next = { status: "text", reason: "voice_already_used" } as const;
      stateRef.current = next;
      setState(next);
      return;
    }
    startInFlightRef.current = true;
    fallbackNotifiedRef.current = false;
    stoppingRef.current = false;
    startedAtRef.current = performance.now();
    const runId = ++runIdRef.current;
    let phase: "microphone" | "token" | "connect" = "microphone";
    move({ type: "CONSENT" });
    try {
      const capture = await startMicrophoneCapture((data) => {
        if (stoppingRef.current || runId !== runIdRef.current) return;
        sessionRef.current?.sendRealtimeInput({
          audio: { data, mimeType: "audio/pcm;rate=16000" },
        });
      });
      if (stoppingRef.current || runId !== runIdRef.current) {
        await capture.stop();
        return;
      }
      captureRef.current = capture;

      // A token is requested only after browser microphone permission succeeds.
      attemptedRef.current = true;
      phase = "token";
      const token = await cloudpathApi.voiceToken(getAnonymousSessionId());
      if (stoppingRef.current || runId !== runIdRef.current) return;
      if (token.degraded) {
        await degrade(
          "La voz no está disponible. Conservamos el modo escrito.",
          "VOICE_TOKEN_DEGRADED",
        );
        return;
      }
      move({ type: "TOKEN_READY" });
      const ai = new GoogleGenAI({
        apiKey: token.token,
        // @google/genai 2.13.0 supports ephemeral auth_tokens/* on v1alpha.
        httpOptions: { apiVersion: "v1alpha" },
      });
      phase = "connect";
      let abandonLateSession = false;
      let connectTimeout: number | undefined;
      const connectPromise = ai.live.connect({
        model: token.model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onopen: () => {
            if (!stoppingRef.current && runId === runIdRef.current) {
              move({ type: "CONNECTED" });
            }
          },
          onmessage: onMessage,
          onerror: () => {
            void degrade(
              "La conexión de voz se interrumpió. Tus respuestas se conservan.",
              "VOICE_SOCKET_ERROR",
            );
          },
          onclose: (event) => {
            const fallback = closeFallback(event);
            void degrade(
              fallback.reason,
              fallback.code,
              event,
            );
          },
        },
      });
      let session: Session;
      try {
        session = await Promise.race([
          connectPromise.then((connected) => {
            if (abandonLateSession) connected.close();
            return connected;
          }),
          new Promise<never>((_, reject) => {
            connectTimeout = window.setTimeout(() => {
              abandonLateSession = true;
              reject(new Error("VOICE_CONNECT_TIMEOUT"));
            }, CONNECT_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (connectTimeout !== undefined) window.clearTimeout(connectTimeout);
      }
      if (stoppingRef.current || runId !== runIdRef.current) {
        session.close();
        return;
      }
      sessionRef.current = session;
      const queuedResponses = pendingToolResponsesRef.current.splice(0);
      for (const pending of queuedResponses) sendToolResponse(pending);
      if (stoppingRef.current || runId !== runIdRef.current) return;
      startInFlightRef.current = false;
      move({ type: "CONNECTED" });
    } catch (error) {
      const permissionDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");
      const connectTimedOut =
        error instanceof Error && error.message === "VOICE_CONNECT_TIMEOUT";
      const diagnosticCode: VoiceDiagnosticCode = permissionDenied
        ? "VOICE_MIC_DENIED"
        : connectTimedOut
          ? "VOICE_CONNECT_TIMEOUT"
          : phase === "token"
            ? "VOICE_TOKEN_FAILED"
            : phase === "connect"
              ? "VOICE_CONNECT_FAILED"
              : "VOICE_MIC_FAILED";
      await degrade(
        permissionDenied
          ? "No activamos el micrófono. Puedes responder por escrito."
          : connectTimedOut
            ? "La conexión de voz tardó demasiado. Puedes continuar por escrito."
          : "La voz no pudo iniciar. Puedes responder por escrito.",
        diagnosticCode,
      );
    }
  }, [degrade, move, onMessage, sendToolResponse]);

  const finish = useCallback(async () => {
    stoppingRef.current = true;
    try {
      sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
    } catch {
      diagnose("VOICE_FINISH_SEND_FAILED");
    }
    await stop();
  }, [diagnose, stop]);

  const restart = useCallback(async () => {
    await stop();
    renewAnonymousSessionId();
    attemptedRef.current = false;
    startInFlightRef.current = false;
    fallbackNotifiedRef.current = false;
    stoppingRef.current = false;
    startedAtRef.current = null;
    pendingToolResponsesRef.current = [];
    completionAcceptedRef.current = false;
    completionAckSentRef.current = false;
    postAckOutputSeenRef.current = false;
    completionFinishingRef.current = false;
    pendingCompletionRef.current = null;
    setTranscript("");
    onTranscriptRef.current("");
    const next = { status: "idle" } as const;
    stateRef.current = next;
    setState(next);
  }, [stop]);

  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );

  return { state, transcript, start, restart, finish, stop };
}

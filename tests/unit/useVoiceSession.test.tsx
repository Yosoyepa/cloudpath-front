import { act, renderHook } from "@testing-library/react";
import type { LiveCallbacks, LiveServerMessage } from "@google/genai";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  constructor: vi.fn(),
  voiceToken: vi.fn(),
  getSessionId: vi.fn(() => "anonymous-session"),
  startCapture: vi.fn(),
  playbackClose: vi.fn(async () => undefined),
  playbackClear: vi.fn(),
  playbackEnqueue: vi.fn(async () => undefined),
  playbackWaitForIdle: vi.fn(async () => undefined),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    live = { connect: mocks.connect };
    constructor(options: unknown) {
      mocks.constructor(options);
    }
  },
  Modality: { AUDIO: "AUDIO" },
}));

vi.mock("../../src/api/cloudpath", () => ({
  cloudpathApi: { voiceToken: mocks.voiceToken },
  getAnonymousSessionId: mocks.getSessionId,
}));

vi.mock("../../src/features/interview/audio/capture", () => ({
  startMicrophoneCapture: mocks.startCapture,
}));

vi.mock("../../src/features/interview/audio/playback", () => ({
  PcmPlayback: class {
    close = mocks.playbackClose;
    clear = mocks.playbackClear;
    enqueue = mocks.playbackEnqueue;
    waitForIdle = mocks.playbackWaitForIdle;
  },
}));

import { useVoiceSession } from "../../src/features/interview/useVoiceSession";

function token(degraded = false) {
  return {
    token: degraded ? "" : "secret-ephemeral-token",
    model: "gemini-live",
    expiresAt: "2026-07-24T12:00:00Z",
    maxUses: 1,
    degraded,
  };
}

function setupCapture(order?: string[]) {
  const stop = vi.fn(async () => undefined);
  mocks.startCapture.mockImplementation(async () => {
    order?.push("microphone");
    return { stop };
  });
  return stop;
}

function setupConnected(order?: string[]) {
  let callbacks: LiveCallbacks | undefined;
  const session = {
    close: vi.fn(),
    sendRealtimeInput: vi.fn(),
    sendToolResponse: vi.fn(),
  };
  mocks.connect.mockImplementation(async (options) => {
    order?.push("connect");
    callbacks = options.callbacks;
    callbacks?.onopen?.();
    return session;
  });
  return {
    session,
    callbacks: () => {
      if (!callbacks) throw new Error("callbacks not installed");
      return callbacks;
    },
  };
}

function message(value: object): LiveServerMessage {
  return value as unknown as LiveServerMessage;
}

describe("useVoiceSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCapture();
    mocks.voiceToken.mockResolvedValue(token());
  });

  it("gets microphone permission before requesting the one-use token", async () => {
    const order: string[] = [];
    setupCapture(order);
    mocks.voiceToken.mockImplementation(async () => {
      order.push("token");
      return token();
    });
    setupConnected(order);
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback: vi.fn() }),
    );

    await act(async () => result.current.start());

    expect(order).toEqual(["microphone", "token", "connect"]);
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "secret-ephemeral-token",
        httpOptions: { apiVersion: "v1alpha" },
      }),
    );
  });

  it("ignores a second start while startup is already in flight", async () => {
    let resolveToken!: (value: ReturnType<typeof token>) => void;
    mocks.voiceToken.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    );
    setupConnected();
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.start();
      await Promise.resolve();
      await result.current.start();
    });
    expect(mocks.voiceToken).toHaveBeenCalledOnce();
    expect(onFallback).not.toHaveBeenCalled();

    await act(async () => {
      resolveToken(token());
      await first;
    });
  });

  it("stops microphone capture when the token endpoint degrades", async () => {
    const stopCapture = setupCapture();
    mocks.voiceToken.mockResolvedValue(token(true));
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );

    await act(async () => result.current.start());

    expect(stopCapture).toHaveBeenCalledOnce();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe("text");
  });

  it("deduplicates socket error and close fallback and redacts close reason", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const live = setupConnected();
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );
    await act(async () => result.current.start());

    await act(async () => {
      live.callbacks().onclose?.(
        new CloseEvent("close", {
          code: 1008,
          reason: "secret-ephemeral-token and transcript",
        }),
      );
      live.callbacks().onerror?.(new ErrorEvent("error"));
      await Promise.resolve();
    });

    expect(onFallback).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(debug.mock.calls[0]);
    expect(serialized).toContain("VOICE_SOCKET_CLOSED");
    expect(serialized).toContain("[redacted]");
    expect(serialized).not.toContain("secret-ephemeral-token");
    expect(serialized).not.toContain("transcript");
    debug.mockRestore();
  });

  it("maps depleted provider credits to an actionable safe fallback", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const live = setupConnected();
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );
    await act(async () => result.current.start());

    await act(async () => {
      live.callbacks().onclose?.(
        new CloseEvent("close", {
          code: 1011,
          reason: "Your prepayment credits are depleted.",
        }),
      );
      await Promise.resolve();
    });

    expect(onFallback).toHaveBeenCalledWith(
      expect.stringMatching(/no tiene créditos activos/i),
    );
    expect(debug).toHaveBeenCalledWith(
      "[CloudPath voice]",
      expect.objectContaining({
        code: "VOICE_BILLING_UNAVAILABLE",
        close: expect.objectContaining({
          code: 1011,
          category: "billing",
          reason: "[redacted]",
        }),
      }),
    );
    expect(JSON.stringify(debug.mock.calls)).not.toContain("prepayment");
    debug.mockRestore();
  });

  it("falls back when the SDK connect promise never reaches setup complete", async () => {
    vi.useFakeTimers();
    mocks.connect.mockReturnValue(new Promise(() => undefined));
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );

    let startup!: Promise<void>;
    await act(async () => {
      startup = result.current.start();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
      await startup;
    });

    expect(onFallback).toHaveBeenCalledOnce();
    expect(onFallback).toHaveBeenCalledWith(
      expect.stringMatching(/tardó demasiado/i),
    );
    expect(result.current.state.status).toBe("text");
    vi.useRealTimers();
  });

  it("does not show fallback when an intentional finish closes the socket", async () => {
    let callbacks: LiveCallbacks | undefined;
    const session = {
      sendRealtimeInput: vi.fn(),
      sendToolResponse: vi.fn(),
      close: vi.fn(() =>
        callbacks?.onclose?.(
          new CloseEvent("close", { code: 1000, reason: "finished" }),
        ),
      ),
    };
    mocks.connect.mockImplementation(async (options) => {
      callbacks = options.callbacks;
      return session;
    });
    const onFallback = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({ onTranscript: vi.fn(), onFallback }),
    );
    await act(async () => result.current.start());

    await act(async () => result.current.finish());

    expect(session.sendRealtimeInput).toHaveBeenCalledWith({
      audioStreamEnd: true,
    });
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("flushes a tool response delivered before connect returns the session", async () => {
    const onSignal = vi.fn();
    const session = {
      close: vi.fn(),
      sendRealtimeInput: vi.fn(),
      sendToolResponse: vi.fn(),
    };
    mocks.connect.mockImplementation(async (options) => {
      options.callbacks.onmessage(
        message({
          toolCall: {
            functionCalls: [
              {
                id: "signal-early",
                name: "record_learning_signal",
                args: { kind: "weekly_minutes", value: "120" },
              },
            ],
          },
        }),
      );
      return session;
    });
    const { result } = renderHook(() =>
      useVoiceSession({
        onTranscript: vi.fn(),
        onFallback: vi.fn(),
        onSignal,
      }),
    );

    await act(async () => result.current.start());

    expect(onSignal).toHaveBeenCalledWith({
      kind: "weekly_minutes",
      value: 120,
    });
    expect(session.sendToolResponse).toHaveBeenCalledOnce();
    expect(session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        {
          id: "signal-early",
          name: "record_learning_signal",
          response: { accepted: true },
        },
      ],
    });
  });

  it("auto-completes once only after post-ack mentor output finishes", async () => {
    const live = setupConnected();
    const onAutoComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({
        onTranscript: vi.fn(),
        onFallback: vi.fn(),
        onAutoComplete,
      }),
    );
    await act(async () => result.current.start());

    await act(async () => {
      live.callbacks().onmessage(
        message({
          toolCall: {
            functionCalls: [
              {
                id: "complete-1",
                name: "complete_learning_intake",
                args: {
                  goal: "Aprobar CLF-C02",
                  weekly_minutes: 120,
                  experience_level: "beginner",
                  preferred_formats: ["practice"],
                },
              },
            ],
          },
        }),
      );
      live.callbacks().onmessage(
        message({ serverContent: { turnComplete: true } }),
      );
      await Promise.resolve();
    });
    expect(result.current.state.status).toBe("building-route");
    expect(onAutoComplete).not.toHaveBeenCalled();

    await act(async () => {
      live.callbacks().onmessage(
        message({
          serverContent: {
            outputTranscription: { text: "Estoy ordenando tu ruta." },
            turnComplete: true,
          },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.playbackWaitForIdle).toHaveBeenCalledOnce();
    expect(onAutoComplete).toHaveBeenCalledOnce();
    expect(live.session.close).toHaveBeenCalledOnce();
  });

  it("auto-completes after a bounded wait when post-ack output is missing", async () => {
    const live = setupConnected();
    const onAutoComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({
        onTranscript: vi.fn(),
        onFallback: vi.fn(),
        onAutoComplete,
      }),
    );
    await act(async () => result.current.start());
    vi.useFakeTimers();

    await act(async () => {
      live.callbacks().onmessage(
        message({
          toolCall: {
            functionCalls: [
              {
                id: "complete-without-handoff",
                name: "complete_learning_intake",
                args: {
                  goal: "Aprobar CLF-C02",
                  weekly_minutes: 120,
                  experience_level: "beginner",
                  preferred_formats: ["practice"],
                },
              },
            ],
          },
        }),
      );
      await vi.advanceTimersByTimeAsync(6_000);
      await Promise.resolve();
    });

    expect(onAutoComplete).toHaveBeenCalledOnce();
    expect(live.session.close).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("never completes from a spoken confirmation without the completion tool", async () => {
    const live = setupConnected();
    const onAutoComplete = vi.fn();
    const { result } = renderHook(() =>
      useVoiceSession({
        onTranscript: vi.fn(),
        onFallback: vi.fn(),
        onAutoComplete,
      }),
    );
    await act(async () => result.current.start());

    await act(async () => {
      live.callbacks().onmessage(
        message({
          serverContent: {
            outputTranscription: { text: "Perfecto, ya terminamos." },
            turnComplete: true,
          },
        }),
      );
      await Promise.resolve();
    });

    expect(onAutoComplete).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("listening");
  });
});

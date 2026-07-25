import { CloudPathApiError } from "./errors";

export type JsonValidator<T> = (value: unknown) => value is T;

export interface JsonRequestOptions
  extends Omit<RequestInit, "body" | "signal"> {
  body?: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  validate?: JsonValidator<unknown>;
}

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  return (configured || "http://localhost:8000").replace(/\/$/, "");
}

function responseCode(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "object" &&
    body.detail !== null &&
    "code" in body.detail &&
    typeof body.detail.code === "string"
  ) {
    return body.detail.code;
  }
  return fallback;
}

export async function requestJson<T>(
  path: string,
  options: JsonRequestOptions,
): Promise<T> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timeout = window.setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    options.timeoutMs,
  );

  try {
    const headers = new Headers(options.headers);
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new CloudPathApiError(
        `CloudPath API responded with ${response.status}`,
        responseCode(body, "request_failed"),
        response.status,
        body,
      );
    }
    if (options.validate && !options.validate(body)) {
      throw new CloudPathApiError(
        "CloudPath API response did not match its contract",
        "invalid_response",
        response.status,
        options.validate,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof CloudPathApiError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new CloudPathApiError(
        "CloudPath API request timed out or was cancelled",
        "request_timeout",
      );
    }
    throw new CloudPathApiError(
      "CloudPath API is unreachable",
      "network_error",
      null,
      error,
    );
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

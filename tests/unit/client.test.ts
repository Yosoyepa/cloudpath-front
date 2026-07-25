import { requestJson } from "../../src/api/client";
import { CloudPathApiError } from "../../src/api/errors";

describe("requestJson", () => {
  it("serializes JSON and sets the content type", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.body).toBe(JSON.stringify({ answer: 42 }));
      expect(new Headers(init?.headers).get("content-type")).toBe(
        "application/json",
      );
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestJson<{ ok: boolean }>("/api/example", {
        method: "POST",
        body: { answer: 42 },
        timeoutMs: 100,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("normalizes FastAPI detail codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ detail: { code: "lesson_not_found" } }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      requestJson("/api/lesson", { timeoutMs: 100 }),
    ).rejects.toMatchObject({
      code: "lesson_not_found",
      status: 404,
    });
  });

  it("rejects a response that violates its runtime contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ wrong: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      requestJson("/api/profile", {
        timeoutMs: 100,
        validate: (value): value is unknown =>
          typeof value === "object" &&
          value !== null &&
          "profile" in value,
      }),
    ).rejects.toBeInstanceOf(CloudPathApiError);
  });
});

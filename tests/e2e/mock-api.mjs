import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = 18000;
const allowedOrigin = "http://localhost:15173";
const fixtureRoot = new URL(
  "../../src/contracts/generated/fixtures/",
  import.meta.url,
);

async function fixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
}

const [profile, route] = await Promise.all([
  fixture("demo-profile.json"),
  fixture("demo-route.json"),
]);

function send(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers":
      "Content-Type, X-CloudPath-Session",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === "OPTIONS") {
    send(response, 204, {});
    return;
  }

  if (request.url === "/api/health") {
    send(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && request.url === "/api/profile") {
    send(response, 200, {
      profile,
      route,
      degraded: true,
      source: "deterministic",
    });
    return;
  }

  if (
    request.method === "POST" &&
    (request.url === "/api/lesson" || request.url === "/api/adapt")
  ) {
    send(response, 503, {
      detail: "Proveedor externo omitido en la prueba portable del frontend.",
    });
    return;
  }

  send(response, 404, { detail: "Not found" });
});

server.listen(port, host);

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);

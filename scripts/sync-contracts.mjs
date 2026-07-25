import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "json-schema-to-typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, "..");
const generatedDir = path.join(webDir, "src", "contracts", "generated");

const schemaNames = [
  "ProfileRequest",
  "ProfileResponse",
  "LessonRequest",
  "LessonResponse",
  "AdaptRequest",
  "AdaptResponse",
  "VoiceTokenResponse",
  "HealthResponse",
];

const fixtureNames = [
  "demo-profile.json",
  "demo-route.json",
  "demo-transcript.json",
  "high-confidence-wrong-attempt.json",
  "iam-fundamentals-lesson.json",
  "iam-vs-kms-intervention.json",
  "iam-vs-kms-lesson.json",
];

const dataNames = ["adaptation-matrix.json"];

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sourceDirectory() {
  const configured =
    optionValue("--source") ??
    process.env.CLOUDPATH_CONTRACTS_DIR ??
    path.resolve(webDir, "..", "contracts");
  return path.resolve(configured);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function contractTree() {
  try {
    return execFileSync(
      "git",
      ["rev-parse", "HEAD:product/contracts"],
      {
        cwd: path.resolve(webDir, "..", ".."),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return "external-snapshot";
  }
}

async function buildSnapshot(sourceDir) {
  const files = new Map();
  const hashes = {};

  for (const name of schemaNames) {
    const relative = `schemas/${name}.json`;
    const sourcePath = path.join(sourceDir, relative);
    const raw = await readFile(sourcePath, "utf8");
    const schema = JSON.parse(raw);
    hashes[relative] = sha256(raw);
    files.set(`schemas/${name}.json`, `${JSON.stringify(schema, null, 2)}\n`);
    const declaration = await compile(schema, name, {
      bannerComment: "",
      cwd: path.join(sourceDir, "schemas"),
      style: { singleQuote: false },
    });
    files.set(`types/${name}.ts`, declaration);
  }

  for (const name of fixtureNames) {
    const relative = `fixtures/${name}`;
    const raw = await readFile(path.join(sourceDir, relative), "utf8");
    const fixture = JSON.parse(raw);
    hashes[relative] = sha256(raw);
    files.set(relative, `${JSON.stringify(fixture, null, 2)}\n`);
  }

  for (const name of dataNames) {
    const raw = await readFile(path.join(sourceDir, name), "utf8");
    const data = JSON.parse(raw);
    hashes[name] = sha256(raw);
    files.set(`data/${name}`, `${JSON.stringify(data, null, 2)}\n`);
  }

  files.set(
    "contracts.ts",
    [
      "export type { InterviewAnswer, ProfileRequest } from \"./types/ProfileRequest\";",
      "export type {",
      "  Domain,",
      "  ExperienceLevel,",
      "  LearnerProfile,",
      "  LearningEdge,",
      "  LearningFormat,",
      "  LearningNode,",
      "  NodeStatus,",
      "  ProfileResponse,",
      "  RouteState,",
      "  SourceRef,",
      "} from \"./types/ProfileResponse\";",
      "export type { LessonRequest } from \"./types/LessonRequest\";",
      "export type {",
      "  AssessmentQuestion,",
      "  Lesson,",
      "  LessonResponse,",
      "} from \"./types/LessonResponse\";",
      "export type { AdaptRequest, Attempt, Confidence } from \"./types/AdaptRequest\";",
      "export type {",
      "  AdaptResponse,",
      "  AdaptationDecision,",
      "  InsertNodeOperation,",
      "  ReinforceNodeOperation,",
      "  ReorderAfterOperation,",
      "  ReplaceFormatOperation,",
      "  UnlockNodeOperation,",
      "} from \"./types/AdaptResponse\";",
      "import type {",
      "  InsertNodeOperation,",
      "  ReinforceNodeOperation,",
      "  ReorderAfterOperation,",
      "  ReplaceFormatOperation,",
      "  UnlockNodeOperation,",
      "} from \"./types/AdaptResponse\";",
      "export type AdaptationOperation =",
      "  | InsertNodeOperation",
      "  | ReinforceNodeOperation",
      "  | UnlockNodeOperation",
      "  | ReorderAfterOperation",
      "  | ReplaceFormatOperation;",
      "export type { VoiceTokenResponse } from \"./types/VoiceTokenResponse\";",
      "export type { HealthResponse, ProviderStatus } from \"./types/HealthResponse\";",
      "",
    ].join("\n"),
  );

  files.set(
    "manifest.json",
    `${JSON.stringify(
      {
        schemaVersion: 1,
        source: "product/contracts",
        sourceTree: contractTree(),
        files: Object.fromEntries(
          Object.entries(hashes).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      },
      null,
      2,
    )}\n`,
  );

  return files;
}

async function writeSnapshot(files) {
  for (const [relative, contents] of files) {
    const destination = path.join(generatedDir, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents, "utf8");
  }
}

async function checkSnapshot(files) {
  const problems = [];
  for (const [relative, expected] of files) {
    const destination = path.join(generatedDir, relative);
    try {
      const actual = await readFile(destination, "utf8");
      if (actual !== expected) {
        problems.push(`${relative} differs`);
      }
    } catch {
      problems.push(`${relative} is missing`);
    }
  }

  try {
    const existing = await readdir(generatedDir, { recursive: true });
    const expected = new Set(files.keys());
    for (const relative of existing) {
      const full = path.join(generatedDir, relative);
      try {
        await access(full);
      } catch {
        continue;
      }
      if (path.extname(relative) && !expected.has(relative)) {
        problems.push(`${relative} is stale`);
      }
    }
  } catch {
    problems.push("generated directory is missing");
  }

  if (problems.length > 0) {
    throw new Error(`Contract snapshot drift:\n- ${problems.join("\n- ")}`);
  }
}

const mode = process.argv.includes("--check") ? "check" : "write";
const sourceDir = sourceDirectory();
const snapshot = await buildSnapshot(sourceDir);

if (mode === "check") {
  await checkSnapshot(snapshot);
  process.stdout.write("Frontend contracts: PASS\n");
} else {
  await writeSnapshot(snapshot);
  process.stdout.write(`Frontend contracts: wrote ${snapshot.size} files\n`);
}

# Kimi frontend migration verification plan

**Goal:** Confirm that the standalone Vercel frontend contains the approved Kimi visual work while preserving the current CloudPath behavior, API boundary, state model, routes, accessibility, and deterministic fallbacks.

**Source of truth:** `/home/jandradeu/Documentos/hackathon/agentic-dev-hackathon-setup/product/web`

**Destination:** `/home/jandradeu/Documentos/hackathon/cloudpath-front`

## Visual direction

- Mission-control canvas using the existing CloudPath tokens: midnight canvas, matte surfaces, cyan active state, violet adaptation, orange gap, and green mastery.
- Space Grotesk for display, Inter for interface copy, and JetBrains Mono for signals and metadata.
- Route Ignition proves the adaptive route in the first viewport; the functional React Flow map remains the central product surface.
- Glow and motion communicate state only. Keyboard focus, text fallback, captions, and reduced-motion behavior remain visible.

## Migration boundary

The migration may change presentation components, CSS, local brand assets, and visual tests. It must not change:

- `src/api/**`
- `src/contracts/**`
- `src/state/**`
- route paths or URL parameters in `src/app/router.tsx`
- lesson/adaptation fallback semantics
- request timing, provider failover, or environment-variable names

## Task 1: Prove source parity

Compare the destination with the source of truth, excluding repository-only files and generated test artifacts:

```bash
diff -qr \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=.env.example \
  --exclude=.gitignore \
  --exclude=dist \
  --exclude=test-results \
  /home/jandradeu/Documentos/hackathon/cloudpath-front \
  /home/jandradeu/Documentos/hackathon/agentic-dev-hackathon-setup/product/web
```

Expected result: no output.

Confirm that the destination contains the Kimi landing and map implementations:

```bash
test -f src/features/landing/RouteIgnition.tsx
test -f src/features/route/LearningMap.tsx
test -f src/features/route/AdaptiveMapNode.tsx
test -f src/features/route/LearningEdge.tsx
```

## Task 2: Verify behavior and contracts

Install the locked dependency graph and run the narrow checks before the build:

```bash
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm typecheck
pnpm test
pnpm build
```

Acceptance criteria:

- generated contracts match their manifest;
- TypeScript reports no errors;
- all unit and integration tests pass;
- Vite produces the production bundle.

## Task 3: Verify the user-visible path

Install the Playwright browser only if it is not already available, then run:

```bash
pnpm exec playwright install chromium
pnpm smoke
```

Exercise the smoke path twice:

```text
/ → /interview → /route → /lesson/security-iam-fundamentals
→ /assessment/security-iam-fundamentals → /route/recalibrated
```

Capture desktop and mobile screenshots of the landing and route screens. Inspect browser console errors, overflow, focus visibility, responsive navigation, and reduced-motion rendering.

## Task 4: Review and handoff without push

Inspect:

```bash
git status --short
git diff --check
git diff --stat
git diff
```

Do not commit or push. Report:

- verified commit and branch;
- exact commands and outcomes;
- screenshots or failure evidence;
- whether the old deployed UI is a repository issue or a Vercel deployment/configuration issue;
- any residual risks.

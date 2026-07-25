# Static Kimi Design Production Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the exported `Web-Prototype` pixels and responsive hierarchy in the production React frontend without changing its API, session, routing, accessibility, or fallback behavior.

**Architecture:** `Web-Prototype` is the visual contract and `cloudpath-front` is the behavioral contract. The migration ports the shared brand shell and each static screen into its matching React route, replaces static placeholders with current typed data, and excludes the launcher, `.html` navigation, QA controls, and simulated provider behavior.

**Tech Stack:** React 19, React Router 7, TypeScript 7, Vite 8, React Flow, Motion, CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve `src/api/**`, `src/contracts/**`, `src/state/**`, and the route paths in `src/app/router.tsx`.
- Preserve explicit microphone consent, written fallback, request deduplication, JSON Schema validation, route-version checks, and deterministic lesson/adaptation fallbacks.
- Use bundled Space Grotesk, Inter, and JetBrains Mono; do not add remote fonts.
- Use exact semantic colors from `Web-Prototype/styles/cloudpath.css`.
- Never copy `scripts/cloudpath.js`, static responses, provider timers, `.html` links, or QA controls.
- Preserve the uncommitted source change in `Web-Prototype/cloudpath-landing.html`; the source directory remains read-only.
- Keep keyboard focus, native radios, text alternatives, reduced motion, and no-horizontal-overflow behavior.

---

### Task 1: Shared visual shell and assets

**Files:**
- Create: `src/components/AmbientBackground.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/styles/theme.css`
- Modify: `src/styles/base.css`
- Modify: `index.html`
- Create: `public/brand/cloudpath-logo.svg`
- Create: `public/brand/cloudpath-icon.svg`
- Create: `public/media/bg-mission-control.mp4`
- Create: `public/media/orb-idle.mp4`
- Create: `public/media/orb-listening.mp4`
- Create: `public/media/orb-speaking.mp4`
- Create: `public/media/orb-interpreting.mp4`
- Test: `tests/unit/foundation.test.tsx`

**Interfaces:**
- Consumes: React Router `Link` and the static asset files from `Web-Prototype`.
- Produces: `AmbientBackground`, `.site-header`, `.page-footer`, `.cp-container`, `.cp-section`, `.button-*`, and the complete wordmark shared by every route.

- [ ] **Step 1: Extend the foundation test**

Assert that the shell renders the CloudPath home link, product navigation, footer, and an inert ambient background while preserving the skip link.

- [ ] **Step 2: Run the narrow test and observe failure**

Run: `pnpm exec vitest run tests/unit/foundation.test.tsx`

Expected: FAIL because the footer and ambient layer do not exist.

- [ ] **Step 3: Port the shared visual contract**

Implement:

```tsx
export function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-background__glow" />
      <div className="ambient-background__grid" />
      <video autoPlay loop muted playsInline preload="metadata">
        <source src="/media/bg-mission-control.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
```

Use the full wordmark in the header, links to `/route`, the active lesson source section when available through normal navigation, the real GitHub repository, and a footer. Hide environmental video under reduced motion and preserve the CSS fallback.

- [ ] **Step 4: Run the narrow test**

Run: `pnpm exec vitest run tests/unit/foundation.test.tsx`

Expected: PASS.

### Task 2: Static landing at `/`

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Create: `src/features/landing/staticLanding.css`
- Modify: `tests/unit/RouteIgnition.test.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: shared shell classes and React Router `Link`.
- Produces: the static landing hero, certification proof, three-step explanation, principles, and final CTA. Both CTAs navigate to `/interview`.

- [ ] **Step 1: Change the landing assertions**

Assert the visible heading `Tu ruta a AWS no debería empezar con otra pestaña.`, the CTA `Diseñar mi ruta`, the active certification panel, and the three numbered proof sections.

- [ ] **Step 2: Run the landing tests and observe failure**

Run: `pnpm exec vitest run tests/unit/RouteIgnition.test.tsx`

Expected: FAIL against the current Route Ignition scene.

- [ ] **Step 3: Implement the exported composition**

Port `[data-od-id="hero"]`, certification, how-it-works, principles, CTA strip, and footer-adjacent spacing from `cloudpath-landing.html`. Use `Link` instead of `.html` anchors and do not render the launcher or sticky SVG route.

- [ ] **Step 4: Run the landing tests**

Run: `pnpm exec vitest run tests/unit/RouteIgnition.test.tsx`

Expected: PASS.

### Task 3: Interview control room

**Files:**
- Modify: `src/features/interview/InterviewPanel.tsx`
- Modify: `src/features/interview/VoiceOrb.tsx`
- Modify: `src/features/interview/ProgressiveRoutePreview.tsx`
- Modify: `src/features/interview/interview.css`
- Modify: `src/features/interview/progressiveRoutePreview.css`
- Modify: `tests/unit/InterviewPanel.test.tsx`
- Modify: `tests/unit/ProgressiveRoutePreview.test.tsx`

**Interfaces:**
- Consumes: the existing `InterviewPanelProps`, real voice status, transcript, normalized signals, and profile callbacks.
- Produces: a 340px mentor rail plus route-construction pane on desktop and Mentor/Mi ruta responsive presentation without introducing new state-machine transitions.

- [ ] **Step 1: Add structural assertions**

Keep the existing accessible controls and assert the timer/status pill, mentor pane, transcript, and route preview labels.

- [ ] **Step 2: Run interview tests and observe failure**

Run: `pnpm exec vitest run tests/unit/InterviewPanel.test.tsx tests/unit/ProgressiveRoutePreview.test.tsx`

- [ ] **Step 3: Port the layout around existing behavior**

Use the exported title, compact status chrome, orb frame, transcript and signal cards. Map the real statuses to the existing orb/video state and keep written form submission, consent, completion, validation, and provider messaging unchanged.

- [ ] **Step 4: Run interview tests**

Expected: PASS.

### Task 4: Map and route sidebar

**Files:**
- Modify: `src/pages/RoutePage.tsx`
- Modify: `src/features/route/LearningMap.tsx`
- Modify: `src/features/route/AdaptiveMapNode.tsx`
- Modify: `src/features/route/routeTextView.tsx`
- Modify: `src/styles/react-flow.css`
- Modify: `tests/unit/RoutePage.test.tsx`
- Modify: `tests/unit/LearningMap.test.tsx`

**Interfaces:**
- Consumes: `RouteState`, current learner profile, `onOpenNode`, existing React Flow layout, and the accessible list equivalent.
- Produces: the static route header, dynamic profile pills, map canvas, semantic node visuals, legend, explanation, and next-activity sidebar.

- [ ] **Step 1: Add route composition assertions**

Assert the real active-node CTA, explanation, semantic legend, and that locked nodes remain non-openable.

- [ ] **Step 2: Run route tests and observe failure**

Run: `pnpm exec vitest run tests/unit/RoutePage.test.tsx tests/unit/LearningMap.test.tsx`

- [ ] **Step 3: Port the exported route framing**

Render current data only. Keep React Flow, focusable node buttons, route-version summary, list toggle, and current node navigation. Exclude the simulated timeout and saved-plan controls.

- [ ] **Step 4: Run route tests**

Expected: PASS.

### Task 5: Reading-focused lesson

**Files:**
- Modify: `src/features/lesson/LessonView.tsx`
- Modify: `src/components/SourceCard.tsx`
- Modify: `src/features/lesson/lesson.css`
- Modify: `tests/unit/LessonView.test.tsx`

**Interfaces:**
- Consumes: typed `Lesson`, `SourceRef[]`, and `degraded`.
- Produces: an 880px reading column with immediate official-source badge, objective, concept/activity panels, evidence list, and assessment CTA.

- [ ] **Step 1: Preserve dynamic-data assertions**

Assert title, content, activity, every source, degraded state, and `/assessment/:nodeId`.

- [ ] **Step 2: Run lesson tests**

Run: `pnpm exec vitest run tests/unit/LessonView.test.tsx`

- [ ] **Step 3: Port the static hierarchy**

Use `lesson.title`, `lesson.content`, `lesson.activity`, and `lesson.sourceRefs`; never hardcode IAM/KMS for other nodes. Exclude MCP simulation controls.

- [ ] **Step 4: Run lesson tests**

Expected: PASS.

### Task 6: Compact assessment

**Files:**
- Modify: `src/pages/AssessmentPage.tsx`
- Modify: `src/features/assessment/AssessmentForm.tsx`
- Modify: `src/features/assessment/assessment.css`
- Modify: `tests/unit/AssessmentForm.test.tsx`

**Interfaces:**
- Consumes: typed assessment question and unchanged submission callback.
- Produces: the 760px exported hierarchy with vertical A–D choices, confidence panel, validation messages, and dynamic submit.

- [ ] **Step 1: Keep semantic-form tests**

Keep native radios, group names, validation/focus behavior, and the exact submission object.

- [ ] **Step 2: Run assessment tests**

Run: `pnpm exec vitest run tests/unit/AssessmentForm.test.tsx`

- [ ] **Step 3: Port styling and compact page chrome**

Change visual geometry only. Do not copy button-based `aria-pressed` selection or static feedback.

- [ ] **Step 4: Run assessment tests**

Expected: PASS.

### Task 7: Complete before/after recalibration

**Files:**
- Modify: `src/pages/RecalibratedPage.tsx`
- Modify: `src/pages/recalibrated.css`
- Modify: `tests/unit/RecalibratedPage.test.tsx`

**Interfaces:**
- Consumes: `lastAdaptation.routeBefore`, `routeAfter`, `decision`, `source`, `degraded`, and source references.
- Produces: exported update toast, expandable explanation, complete route comparison, evidence pills, intervention CTA, and rollback action.

- [ ] **Step 1: Add complete-comparison assertions**

Assert before/after route labels, inserted-node title, explanation control, provider state, source links, practice CTA, and rollback.

- [ ] **Step 2: Run recalibration tests**

Run: `pnpm exec vitest run tests/unit/RecalibratedPage.test.tsx`

- [ ] **Step 3: Render real route nodes in both panels**

Map the two route snapshots with semantic state text. Keep the existing request lifecycle, minimum display delay, stale-version handling, transactional application, and rollback callback.

- [ ] **Step 4: Run recalibration tests**

Expected: PASS.

### Task 8: Visual matrix and full regression

**Files:**
- Modify: `tests/e2e/visual-audit.spec.ts`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: portable mock API and deterministic seeded session.
- Produces: screenshots for all six routes at 1440×900 and 390×844 plus a complete judged-path smoke.

- [ ] **Step 1: Update production-copy selectors**

Keep all behavior assertions but align landing/visual selectors with the exported copy.

- [ ] **Step 2: Run all required checks**

```bash
pnpm contracts:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Expected: all commands exit 0.

- [ ] **Step 3: Inspect generated screenshots**

Compare each local route against its `Web-Prototype` screenshot at desktop and mobile. Confirm no overflow, broken images, console errors, illegible text, or missing focus states.

- [ ] **Step 4: Repeat smoke**

Run: `pnpm smoke`

Expected: the written interview → route → lesson → assessment → recalibration → intervention path passes a second time.

- [ ] **Step 5: Review the final diff**

```bash
git diff --check
git diff -- src/api src/contracts src/state src/app/router.tsx
git status --short
```

Expected: no diff in functional boundaries and no secrets.

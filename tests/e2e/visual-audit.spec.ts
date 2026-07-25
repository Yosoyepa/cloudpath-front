import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const STORAGE_KEY = "cloudpath.session.v1";
const visualDir = "test-results/visual-audit";

const seededSession = JSON.stringify({
  schemaVersion: 1,
  profile: JSON.parse(
    readFileSync(
      new URL(
        "../../src/contracts/generated/fixtures/demo-profile.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
  route: JSON.parse(
    readFileSync(
      new URL(
        "../../src/contracts/generated/fixtures/demo-route.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
  attempts: [],
});

async function expectHealthyViewport(page: Page, consoleErrors: string[]) {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter(
        (image) =>
          image instanceof HTMLImageElement &&
          (!image.complete || image.naturalWidth === 0),
      )
      .map((image) => image.getAttribute("src")),
  );

  expect(hasHorizontalOverflow).toBe(false);
  expect(brokenImages).toEqual([]);
  expect(consoleErrors).toEqual([]);
}

for (const viewport of [
  { name: "mobile-compact", width: 360, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-large", width: 430, height: 932 },
  { name: "small-tablet", width: 600, height: 960 },
  { name: "tablet-portrait", width: 820, height: 1180 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 },
] as const) {
  test(`auditoría visual de las seis pantallas en ${viewport.name}`, async ({
    browser,
  }) => {
    mkdirSync(visualDir, { recursive: true });
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      const sourceUrl = message.location().url;
      const expectedFallback =
        message.text().includes("status of 503") &&
        (sourceUrl.endsWith("/api/lesson") ||
          sourceUrl.endsWith("/api/adapt"));
      if (message.type() === "error" && !expectedFallback) {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Tu ruta a AWS no debería empezar con otra pestaña/i,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/landing-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await page.goto("/interview");
    await expect(
      page.getByRole("heading", {
        name: /Quiero entender cómo aprendes y qué tanto conoces AWS/i,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/interview-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: STORAGE_KEY, value: seededSession },
    );
    await page.goto("/route");
    await expect(
      page.getByRole("heading", { name: "Tu ruta Cloud Practitioner" }),
    ).toBeVisible();
    if (viewport.width <= 640) {
      await expect(page.locator(".route-text-view")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /ver mapa/i }),
      ).toBeVisible();
    } else {
      await expect(page.locator(".react-flow")).toBeVisible();
    }
    await page.screenshot({
      path: `${visualDir}/route-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await page
      .getByRole("link", { name: /Continuar con .*IAM/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /Fundamentos de IAM/i }),
    ).toBeVisible();
    await expect(page.getByText("Modo respaldo").first()).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/lesson-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await page
      .getByRole("link", { name: "Probar lo que entendí" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Una pregunta. Tu respuesta y tu confianza cuentan como evidencia.",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/assessment-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await page
      .getByRole("radio", {
        name: "Cifrar el bucket con una clave administrada en AWS KMS",
      })
      .check();
    await page.locator('input[name="confidence"][value="high"]').check();
    await page
      .getByRole("button", { name: "Comprobar respuesta" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Qué cambió en tu ruta" }),
    ).toBeVisible();
    await expect(page.getByText("Modo respaldo", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/recalibrated-${viewport.name}.png`,
      fullPage: true,
    });
    await expectHealthyViewport(page, consoleErrors);

    await context.close();
  });
}

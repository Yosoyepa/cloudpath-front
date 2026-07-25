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
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`auditoría visual portable en ${viewport.name}`, async ({ browser }) => {
    mkdirSync(visualDir, { recursive: true });
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Tu error cambia el camino/i }),
    ).toBeVisible();
    await page.screenshot({
      path: `${visualDir}/landing-${viewport.name}.png`,
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
    if (viewport.name === "mobile") {
      await expect(page.getByRole("list")).toBeVisible();
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

    await context.close();
  });
}

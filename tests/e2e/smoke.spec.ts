import { expect, test, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const STORAGE_KEY = "cloudpath.session.v1";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../src/contracts/generated/fixtures/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

const seededSession = JSON.stringify({
  schemaVersion: 1,
  profile: fixture("demo-profile.json"),
  route: fixture("demo-route.json"),
  attempts: [],
});

async function seedDemoSession(page: Page) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: seededSession },
  );
}

const writtenAnswers = [
  "Aprobar CLF-C02 para cambiar de rol",
  "He usado S3 y EC2 en proyectos personales",
  "150 minutos por semana",
  "Dentro de ocho semanas",
  "Practicando y explicando en voz alta",
  "Demasiada teoría sin comprobar lo aprendido",
] as const;

async function runWrittenIntake(browser: Browser, run: number) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  let profileRequest: {
    answers?: Array<{ questionId?: string; answer?: string }>;
  } | undefined;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/profile") && request.method() === "POST") {
      profileRequest = request.postDataJSON() as typeof profileRequest;
    }
  });

  await test.step(`entrevista escrita real ${run}`, async () => {
    await page.goto("/interview");
    await page
      .getByRole("button", { name: "Responder por escrito" })
      .click();

    for (const [index, answer] of writtenAnswers.entries()) {
      await page.getByRole("textbox").fill(answer);
      await page
        .getByRole("button", {
          name:
            index === writtenAnswers.length - 1
              ? "Crear mi perfil"
              : "Continuar",
        })
        .click();
    }

    await expect(
      page.getByRole("heading", { name: "Tu ruta Cloud Practitioner" }),
    ).toBeVisible();
    expect(profileRequest).toBeDefined();
    expect(profileRequest?.answers?.map((answer) => answer.questionId)).toEqual(
      expect.arrayContaining([
        "goal",
        "weekly_minutes",
        "experience_level",
        "preferred_formats",
      ]),
    );
  });

  await context.close();
}

async function runJudgedPath(browser: Browser, run: number) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await seedDemoSession(page);

  await test.step(`recorrido determinista ${run}: ruta y lección`, async () => {
    await page.goto("/route");
    await expect(
      page.getByRole("heading", { name: "Tu ruta Cloud Practitioner" }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Continuar con .*IAM/i })
      .click();
    await expect(
      page.getByRole("heading", {
        name: /Fundamentos de IAM/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Modo respaldo").first()).toBeVisible();

    await page
      .getByRole("link", { name: "Probar lo que entendí" })
      .click();
  });

  await test.step(`recorrido determinista ${run}: evaluación`, async () => {
    await expect(
      page.getByRole("heading", {
        name: "Una pregunta. Tu respuesta y tu confianza cuentan como evidencia.",
      }),
    ).toBeVisible();
    await page
      .getByRole("radio", {
        name: "Cifrar el bucket con una clave administrada en AWS KMS",
      })
      .check();
    await page.locator('input[name="confidence"][value="high"]').check();
    await page
      .getByRole("button", { name: "Comprobar respuesta" })
      .click();
  });

  await test.step(`recorrido determinista ${run}: recalibración`, async () => {
    await expect(page.getByText("Señal provisional aplicada")).toBeVisible();
    await expect(page.getByText("-15 dominio")).toBeVisible();
    await expect(
      page.getByText("Modo respaldo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "IAM frente a KMS: control de acceso y cifrado no son lo mismo",
        { exact: true },
      ),
    ).toBeVisible();

    const interventionCta = page.getByRole("link", {
      name: /Iniciar práctica guiada/i,
    });
    await expect(interventionCta).toBeVisible();
    await expect(
      page.getByRole("link", { name: "What is AWS Key Management Service?" }),
    ).toBeVisible();

    await interventionCta.click();
    await expect(
      page.getByRole("heading", {
        name: /IAM frente a KMS: quién puede entrar y qué queda ilegible/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Modo respaldo").first()).toBeVisible();
    await expect(page.getByText("AWS Documentation").first()).toBeVisible();
  });

  await context.close();
}

test("el camino juzgado funciona dos veces con el respaldo local", async ({
  browser,
}) => {
  await runWrittenIntake(browser, 1);
  await runWrittenIntake(browser, 2);
  await runJudgedPath(browser, 1);
  await runJudgedPath(browser, 2);
});

test("la landing conserva CTA y ancho útil en desktop y mobile reducido", async ({
  browser,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Tu ruta a AWS no debería empezar con otra pestaña/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Diseñar mi ruta/i }).first(),
    ).toBeVisible();
    await expect(page.locator(".static-landing__steps")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(
      hasHorizontalOverflow,
      `${viewport.width}x${viewport.height} no debe tener overflow horizontal`,
    ).toBe(false);

    await context.close();
  }
});

test("el título de la landing intercambia sus letras al pasar el cursor", async ({
  page,
}) => {
  await page.goto("/");
  const heading = page.getByRole("heading", {
    name: "Tu ruta a AWS no debería empezar con otra pestaña.",
  });
  const firstLetter = heading.locator(".landing-title-primary").first();
  const accentLetter = heading
    .locator(".landing-title-word--accent .landing-title-primary")
    .first();

  expect(
    await heading.locator(".landing-title-letter").evaluateAll((letters) =>
      letters.filter((letter) => {
        const letterBounds = letter.getBoundingClientRect();
        const secondaryBounds = (
          letter.querySelector(".landing-title-secondary") as HTMLElement
        ).getBoundingClientRect();
        return (
          secondaryBounds.top < letterBounds.bottom - 0.5 &&
          secondaryBounds.bottom > letterBounds.top + 0.5
        );
      }).length,
    ),
  ).toBe(0);
  await expect
    .poll(() =>
      accentLetter.evaluate((element) => getComputedStyle(element).color),
    )
    .toBe("rgb(196, 181, 253)");

  await heading.hover();
  await expect(heading).toHaveClass(/is-swapped/);
  await expect
    .poll(() =>
      firstLetter.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");

  await page.mouse.move(0, 0);
  await expect(heading).not.toHaveClass(/is-swapped/);
});

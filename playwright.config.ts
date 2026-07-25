import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: "http://localhost:15173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: [
    {
      command:
        "uv run --directory ../api uvicorn cloudpath_api.main:app --host 127.0.0.1 --port 18000",
      url: "http://127.0.0.1:18000/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        CLOUDPATH_DEMO_MODE: "true",
        CLOUDPATH_ALLOWED_ORIGINS: '["http://localhost:15173"]',
      },
    },
    {
      command: "pnpm exec vite --port 15173",
      url: "http://localhost:15173",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://127.0.0.1:18000",
      },
    },
  ],
});

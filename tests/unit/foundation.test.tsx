import { render, screen } from "@testing-library/react";

import { App } from "../../src/app/App";

describe("CloudPath foundation", () => {
  it("renders the product name and primary navigation", () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: /cloudpath, inicio/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Mi ruta" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Fuentes" })).toHaveAttribute(
      "href",
      "/lesson/security-iam-fundamentals#sources",
    );
    expect(screen.getByText("© 2026 CloudPath")).toBeVisible();
    expect(
      document.querySelector(".ambient-background"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});

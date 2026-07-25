import { render, screen } from "@testing-library/react";

import { App } from "../../src/app/App";

describe("CloudPath foundation", () => {
  it("renders the product name and primary navigation", () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: /cloudpath, inicio/i }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /construir mi ruta/i }),
    ).toHaveLength(2);
  });
});

import { render, screen } from "@testing-library/react";

import { ProgressiveRoutePreview } from "../../src/features/interview/ProgressiveRoutePreview";

it("renders canonical nodes and an accessible provisional label", () => {
  render(
    <ProgressiveRoutePreview
      building={false}
      preview={{
        nodes: [
          { id: "cloud-value-proposition", title: "Valor de la nube", format: "video" },
          { id: "cloud-deployment-models", title: "Modelos de despliegue", format: "practice" },
        ],
        edges: [
          {
            source: "cloud-value-proposition",
            target: "cloud-deployment-models",
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("region", { name: "Ruta provisional" })).toBeVisible();
  expect(screen.getByText("Valor de la nube")).toBeVisible();
  expect(screen.getByText("Modelos de despliegue")).toBeVisible();
  expect(screen.getByText(/2 pasos estimados/i)).toBeVisible();
});

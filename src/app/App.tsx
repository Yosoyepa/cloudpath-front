import { RouterProvider } from "react-router-dom";

import { SessionProvider } from "../state/SessionProvider";
import { router } from "./router";

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}

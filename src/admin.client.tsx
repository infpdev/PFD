// admin.client.tsx
import { hydrateRoot } from "react-dom/client";
import Admin from "./pages/Admin";
import { BrowserRouter } from "react-router-dom";

hydrateRoot(
  document.getElementById("root")!,
  <BrowserRouter basename="/pf/admin">
    <Admin />
  </BrowserRouter>,
);

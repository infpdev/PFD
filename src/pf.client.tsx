import { createRoot } from "react-dom/client";
import Pf from "./pages/Pf";

const rootEl = document.getElementById("pf-root");

if (rootEl) {
  createRoot(rootEl).render(<Pf />);
}

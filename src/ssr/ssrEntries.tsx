// admin.ssr.tsx
import { renderToString } from "react-dom/server";
import Admin from "../pages/Admin";
import { StaticRouter } from "react-router-dom/server";

export function renderAdmin(url: string) {
  return renderToString(
    <StaticRouter location={url} basename="/pf/admin">
      <Admin />
    </StaticRouter>,
  );
}

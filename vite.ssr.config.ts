import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path, { resolve } from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  build: {
    sourcemap: true, // should be true
    ssr: "src/ssr/ssrEntries.tsx",
    outDir: "dist/server",
    rollupOptions: {
      // noExternal forces Vite to bundle and transform these deps
      // so CSS imports are handled properly
      external: [], // optional, you can keep it empty
    },
  },
  ssr: {
    // these packages will be *inlined* and transformed for SSR
    noExternal: [
      "@mui/x-data-grid", // the grid package
      "@mui/x-data-grid/**", // all internal modules
      "react-helmet-async",
    ],
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

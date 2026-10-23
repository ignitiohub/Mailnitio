import { defineConfig } from "tsup";

// Workspace packages ship TypeScript source, so they are bundled; every npm package stays external and is
// resolved from node_modules at runtime (inlining CommonJS packages such as pg breaks the ESM bundle).
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  noExternal: [/^@mailnitio\//],
});

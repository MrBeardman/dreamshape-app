// Bundles server/index.ts into dist-server/index.js, a plain Node ES module that
// `node dist-server/index.js` can run. Dependencies stay external (they come from node_modules,
// installed by `npm install` on the host); only our own TypeScript is compiled.
import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync("dist-server", { recursive: true, force: true });

await build({
  entryPoints: ["server/index.ts"],
  outfile: "dist-server/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  sourcemap: true,
  logLevel: "info",
});

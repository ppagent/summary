import { build } from "tsup";

await build({
  entry: ["src/plugin.ts"],
  target: "esnext",
  platform: "node",
  format: "esm",
  outDir: "dist",
  bundle: true,
  dts: true,
  clean: true,
  minify: true,
  sourcemap: false
})
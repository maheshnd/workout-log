// Post-build: bundle sw/sw.ts and inject the precache manifest into out/sw.js.
import { build } from "esbuild";
import { injectManifest } from "workbox-build";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "gym-sw-"));
const swSrc = join(tmp, "sw.js");

await build({
  entryPoints: ["sw/sw.ts"],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  outfile: swSrc,
  define: { "process.env.NODE_ENV": '"production"' },
});

const { count, size, warnings } = await injectManifest({
  swSrc,
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: ["**/*.{html,js,css,woff2,png,svg,webmanifest,json}"],
  globIgnores: ["sw.js", "**/*.txt"],
  // Hashed Next.js assets don't need a revision.
  dontCacheBustURLsMatching: /_next\/static\//,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});
warnings.forEach((w) => console.warn(w));
console.log(`sw.js: precached ${count} files, ${(size / 1024).toFixed(1)} KB`);

// GitHub Pages hides folders starting with "_" (like _next/) without this.
writeFileSync("out/.nojekyll", "");
rmSync(tmp, { recursive: true, force: true });

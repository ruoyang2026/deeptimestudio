// Regenerates the web-optimized Triassic GLBs into assets/triassic/.
//
// "Safe tier" pipeline (visually near-lossless at the Discovery canvas scale):
//   - quantize geometry (KHR_mesh_quantization, native to three.js)
//   - WebP textures (base color keeps its authored resolution; the
//     metallic-roughness maps collapse to a few KB once WebP-compressed)
//   - gentle 50% mesh simplification (error tolerance guards the silhouette)
//
// The source models are the authoring copies from the trisea scene. They are
// kept OUT of public/ so the browser can only reach them through the guarded
// /api/models route.
//
// Usage:
//   node scripts/optimize-triassic-web.mjs
//   node scripts/optimize-triassic-web.mjs "D:/project/3d/trisea/models/triassic"

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(process.argv[2] ?? "D:/project/3d/trisea/models/triassic");
const outDir = join(root, "assets", "triassic");

const FILES = [
  "Nothosaurus_Sp.glb",
  "diver.glb",
  "Mixosaurus1.glb",
  "Mixosaurus2.glb",
  "Sinosaurosphargis.glb",
];

mkdirSync(outDir, { recursive: true });

let failed = false;
for (const name of FILES) {
  const src = join(srcDir, name);
  if (!existsSync(src)) {
    console.error(`[optimize] MISSING ${src}`);
    failed = true;
    continue;
  }
  const dest = join(outDir, name);
  console.log(`[optimize] ${name} -> assets/triassic/${name}`);
  const result = spawnSync(
    "npx",
    [
      "--yes", "@gltf-transform/cli", "optimize", src, dest,
      "--compress", "quantize",
      "--texture-compress", "webp",
      "--texture-size", "1024",
      "--simplify-ratio", "0.5",
      "--simplify-error", "0.001",
    ],
    { stdio: "inherit", shell: true },
  );
  if (result.status !== 0) {
    console.error(`[optimize] FAILED ${name} (exit ${result.status})`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`[optimize] done -> ${outDir}`);

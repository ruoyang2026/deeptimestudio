#!/usr/bin/env node
/**
 * probe_images.js
 *
 * Reads the real pixel dimensions of every species photo and writes
 * them into data/trilobites/species.json. The rendered
 * <img> tags can then set width/height attributes so browsers reserve the
 * space up front — eliminating CLS (Core Web Vitals).
 *
 * Usage: node scripts/probe_images.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SPECIES_FILE = path.join(ROOT, "data", "trilobites", "species.json");
const PUBLIC = path.join(ROOT, "public");

function webpSize(buf) {
  if (buf.slice(0, 4).toString() !== "RIFF" || buf.slice(8, 12).toString() !== "WEBP") return null;
  const fourcc = buf.slice(12, 16).toString();
  if (fourcc === "VP8X") {
    return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  }
  if (fourcc === "VP8L") {
    const b = buf.slice(21, 25);
    return [1 + (((b[1] & 0x3f) << 8) | b[0]), 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6))];
  }
  if (fourcc === "VP8 ") {
    return [buf.readUInt16LE(26), buf.readUInt16LE(28)];
  }
  return null;
}

function probe(file) {
  const full = path.join(PUBLIC, file);
  if (!fs.existsSync(full)) return null;
  const buf = fs.readFileSync(full);
  const size = webpSize(buf);
  return size ? { width: size[0], height: size[1] } : null;
}

function uniqueFiles(species) {
  const seen = new Set();
  const list = [];
  for (const s of species) {
    for (const img of s.images) {
      if (!seen.has(img.file)) {
        seen.add(img.file);
        list.push(img.file);
      }
    }
  }
  return list;
}

const species = JSON.parse(fs.readFileSync(SPECIES_FILE, "utf8"));
let probed = 0, missing = 0;

for (const s of species.species) {
  for (const img of s.images) {
    const p = probe(img.file);
    if (p) {
      img.width = p.width;
      img.height = p.height;
      probed++;
    } else {
      missing++;
    }
  }
}
fs.writeFileSync(SPECIES_FILE, JSON.stringify(species, null, 2) + "\n");
console.log(`species.json: probed ${probed} images (missing ${missing})`);

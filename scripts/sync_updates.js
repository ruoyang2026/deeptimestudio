#!/usr/bin/env node
/**
 * sync_updates.js
 *
 * Maintains data/updates.json (the site's "What's New" log) by diffing the
 * current content against a stored snapshot (data/.updates-snapshot.json).
 *
 * Detected changes:
 *   species_added  - new species record (new /species/<slug> page)
 *   images_added   - new photograph(s) added to an existing species
 *   unlocked       - species newly added to data/trilobites/drillable.json
 *   fashion_added  - new fashion product in data/fashion.json
 *
 * Usage (run from project root):
 *   node scripts/sync_updates.js
 *
 * First run establishes a baseline snapshot and records nothing (so an
 * existing catalogue is not reported as "all new"). Subsequent runs append
 * dated, idempotent entries. New content → run this → rebuild.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SPECIES_FILE = path.join(ROOT, "data", "trilobites", "species.json");
const DRILLABLE_FILE = path.join(ROOT, "data", "trilobites", "drillable.json");
const FASHION_FILE = path.join(ROOT, "data", "fashion.json");
const UPDATES_FILE = path.join(ROOT, "data", "updates.json");
const SNAPSHOT_FILE = path.join(ROOT, "data", ".updates-snapshot.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fingerprint(entry) {
  return [entry.date, entry.kind, entry.count, (entry.slugs || []).join(",")].join("|");
}

const species = readJson(SPECIES_FILE).species;
const drillable = readJson(DRILLABLE_FILE).slugs;
const fashion = readJson(FASHION_FILE).products;

const speciesBySlug = new Map(species.map((s) => [s.slug, s]));
const drillableSet = new Set(drillable);
const fashionBySlug = new Map(fashion.map((p) => [p.slug, p]));

let updates = { last_generated: "", entries: [] };
if (fs.existsSync(UPDATES_FILE)) {
  updates = readJson(UPDATES_FILE);
}

let snapshot = null;
if (fs.existsSync(SNAPSHOT_FILE)) {
  snapshot = readJson(SNAPSHOT_FILE);
}

if (!snapshot) {
  writeJson(SNAPSHOT_FILE, {
    generated_at: new Date().toISOString(),
    species: Object.fromEntries(
      species.map((s) => [s.slug, s.images.map((i) => i.file)])
    ),
    drillable: [...drillableSet].sort(),
    fashion: Object.fromEntries(
      fashion.map((p) => [p.slug, p.gallery.map((g) => g.src)])
    ),
  });
  updates.last_generated = new Date().toISOString();
  writeJson(UPDATES_FILE, updates);
  console.log("Baseline snapshot created; no diff entries recorded.");
  process.exit(0);
}

const date = today();
const added = { species_added: [], images_added: [], unlocked: [], fashion_added: [] };
const addedFiles = {};

for (const s of species) {
  const files = s.images.map((i) => i.file);
  const prev = snapshot.species ? snapshot.species[s.slug] : undefined;
  if (prev === undefined) {
    added.species_added.push(s.slug);
  } else {
    const newFiles = files.filter((f) => !prev.includes(f));
    if (newFiles.length) {
      added.images_added.push(s.slug);
      addedFiles[s.slug] = newFiles;
    }
  }
}

for (const slug of [...drillableSet].sort()) {
  const prev = snapshot.drillable || [];
  if (!prev.includes(slug)) added.unlocked.push(slug);
}

for (const p of fashion) {
  const prev = snapshot.fashion ? snapshot.fashion[p.slug] : undefined;
  if (prev === undefined) added.fashion_added.push(p.slug);
}

const newEntries = [];
for (const kind of Object.keys(added)) {
  const slugs = added[kind];
  if (!slugs.length) continue;
  const entry = {
    id: `${date}-${String(updates.entries.length + newEntries.length + 1).padStart(4, "0")}`,
    date,
    kind,
    count: kind === "images_added" ? Object.values(addedFiles).flat().length : slugs.length,
    slugs,
    detail: describe(kind, slugs, addedFiles),
  };
  newEntries.push(entry);
}

// Idempotency: drop anything already recorded for this date/kind/slugs.
const existing = new Set(updates.entries.map((e) => fingerprint(e)));
const fresh = newEntries.filter((e) => !existing.has(fingerprint(e)));

if (fresh.length) {
  updates.entries = [...updates.entries, ...fresh].sort((a, b) =>
    a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
  );
  console.log(`Recorded ${fresh.length} update entr${fresh.length === 1 ? "y" : "ies"}:`);
  for (const e of fresh) {
    console.log(`  ${e.id}  ${e.kind}  count=${e.count}`);
  }
} else {
  console.log("No new changes since the last snapshot.");
}

updates.last_generated = new Date().toISOString();
writeJson(UPDATES_FILE, updates);

writeJson(SNAPSHOT_FILE, {
  generated_at: new Date().toISOString(),
  species: Object.fromEntries(species.map((s) => [s.slug, s.images.map((i) => i.file)])),
  drillable: [...drillableSet].sort(),
  fashion: Object.fromEntries(fashion.map((p) => [p.slug, p.gallery.map((g) => g.src)])),
});

function describe(kind, slugs, files) {
  if (kind === "species_added") return `${slugs.length} new species added`;
  if (kind === "images_added") {
    const total = Object.values(files).flat().length;
    return `${total} new photograph${total === 1 ? "" : "s"} added to ${slugs.length} species`;
  }
  if (kind === "unlocked") return `${slugs.length} species unlocked for browsing`;
  if (kind === "fashion_added") return `${slugs.length} new fashion piece${slugs.length === 1 ? "" : "s"}`;
  return "";
}

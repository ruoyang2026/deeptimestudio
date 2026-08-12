import speciesDb from "../data/trilobites/species.json";
import drillableDb from "../data/trilobites/drillable.json";
import coversDb from "../data/trilobites/covers.json";
import { SITE_URL } from "./site";

export type TrilobiteImage = {
  file: string;
  width: number;
  height: number;
  caption?: string;
  colorfulness?: number;
};

export type Trilobite = {
  id: string;
  slug: string;
  page: number;
  order: string;
  scientific_name: string;
  classification: string;
  genus: string;
  genus_author: string;
  genus_etymology: string;
  species: string;
  species_author: string;
  species_etymology: string;
  age: string;
  distribution: string;
  synonyms: string;
  diagnosis: string;
  characters: string;
  remarks: string;
  captions: string;
  images: TrilobiteImage[];
  cover: string | null;
};

type DbShape = {
  total_species: number;
  species: Trilobite[];
};

const db = speciesDb as unknown as DbShape;
export const trilobites: Trilobite[] = db.species;

type DrillableDb = { total: number; slugs: string[] };
const drillableSet = new Set((drillableDb as DrillableDb).slugs);

export function isDrillable(slug: string): boolean {
  return drillableSet.has(slug);
}

export const DRILLABLE_TOTAL = (drillableDb as DrillableDb).total;

export const GEOLOGIC_PERIODS = [
  "Cambrian",
  "Ordovician",
  "Silurian",
  "Devonian",
  "Carboniferous",
  "Permian",
];

export function periodsForAge(age: string): string[] {
  if (!age) return [];
  const lower = age.toLowerCase();
  return GEOLOGIC_PERIODS.filter((p) => lower.includes(p.toLowerCase()));
}

export function topPeriod(age: string): string {
  return periodsForAge(age)[0] || "";
}

export function firstRegion(distribution: string): string {
  if (!distribution) return "";
  const parts = distribution.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  return parts[0] || "";
}

export function speciesImageAlt(name: string, age: string, distribution: string): string {
  const period = topPeriod(age);
  const region = firstRegion(distribution);
  let alt = `${name}, a trilobite fossil`;
  if (period) alt = `${name}, a ${period} trilobite fossil`;
  if (region) alt += ` from ${region}`;
  return `${alt}.`;
}

export { SITE_URL, SITE_NAME } from "./site";

export function getAges(): { age: string; count: number }[] {
  return GEOLOGIC_PERIODS.map((age) => ({
    age,
    count: trilobites.filter((t) => periodsForAge(t.age).includes(age)).length,
  }));
}

export function getOrders(): { order: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of trilobites) {
    const key = t.order || "Unclassified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([order, count]) => ({ order, count }))
    .sort((a, b) => b.count - a.count);
}

export function getBySlug(slug: string): Trilobite | undefined {
  return trilobites.find((t) => t.slug === slug);
}

export function getByOrder(order: string): Trilobite[] {
  return trilobites.filter((t) => t.order === order);
}

export function searchTrilobites(query: string): Trilobite[] {
  const q = query.trim().toLowerCase();
  if (!q) return trilobites;
  return trilobites.filter((t) => {
    const haystack = [
      t.scientific_name,
      t.genus,
      t.species,
      t.order,
      t.classification,
      t.distribution,
      t.age,
      t.diagnosis,
      t.remarks,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getPrevNext(slug: string): {
  prev?: Trilobite;
  next?: Trilobite;
} {
  const idx = trilobites.findIndex((t) => t.slug === slug);
  if (idx < 0) return {};
  let prev: Trilobite | undefined;
  for (let i = idx - 1; i >= 0; i--) {
    if (isDrillable(trilobites[i].slug)) {
      prev = trilobites[i];
      break;
    }
  }
  let next: Trilobite | undefined;
  for (let i = idx + 1; i < trilobites.length; i++) {
    if (isDrillable(trilobites[i].slug)) {
      next = trilobites[i];
      break;
    }
  }
  return { prev, next };
}

export function imgSrc(path: string | null | undefined): string {
  return path ? `/${path}` : "";
}

type Coverable = { slug: string; cover: string | null };

const COMPLETE_SPECIMEN_RE = /complete\s+(dorsal\s+)?(shield|exoskeleton|carapace|specimen)|enrolled|pyritized|pyritised|exoskeleton/i;
const RECONSTRUCTION_RE = /reconstruction|restoration|close-?up|reconstruction\b/i;

/**
 * Literature scans (black-white) are recognized by a 4-digit year
 * ("Öpik 1963", "Peng Shanchi 2020") or a specimen number ("NIGP123836",
 * "USNM 8577"). Size annotations such as "3 mm" / "6 mm" are collector
 * photos and must NOT be treated as literature.
 */
const LITERATURE_RE = /\b(?:18|19|20)\d{2}\b|[A-Z]{2,}\s*\d+\b/;

/** Heuristic score for how "cover-worthy" an image is (higher is better). */
function coverScore(img: TrilobiteImage): number {
  const caption = (img.caption || "").trim();
  if (!caption) return 0;
  let score = 0;

  // Collector photos (no literature year / specimen number) are preferred
  // over black-white literature scans. Size annotations (mm/cm) are fine.
  if (!LITERATURE_RE.test(caption)) score += 100;
  // Slightly reward colorful collector photos over grayscale reconstructions.
  score += Math.min((img.colorfulness ?? 0) / 10, 5);
  // Reward complete / real specimens; penalize reconstruction / restoration art.
  if (COMPLETE_SPECIMEN_RE.test(caption)) score += 10;
  if (RECONSTRUCTION_RE.test(caption)) score -= 15;

  return score;
}

/**
 * Pick the homepage card cover for a species:
 *   1. an explicit override in data/trilobites/covers.json wins,
 *   2. otherwise the image whose caption is a collector photo (no 4-digit
 *      year / specimen number), ranked by colorfulness and "complete
 *      specimen" wording,
 *   3. falling back to the first image.
 * Returns a path like "trilobites/<slug>/NN.webp" (or null when none).
 */
export function getCover(t: Coverable): string | null {
  const override = (coversDb as { covers: Record<string, string> }).covers[t.slug];
  if (override) return `trilobites/${t.slug}/${override}`;

  const species = trilobites.find((s) => s.slug === t.slug);
  if (!species || !species.images.length) return t.cover;

  const scored = species.images
    .map((img, i) => ({ img, i, score: coverScore(img) }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  return scored[0].img.file;
}

import speciesDb from "../data/ammonites/species.json";
import drillableDb from "../data/ammonites/drillable.json";
import coversDb from "../data/ammonites/covers.json";
import { SITE_URL } from "./site";

export type AmmoniteImage = {
  file: string;
  width: number;
  height: number;
  caption?: string;
};

export type Ammonite = {
  id: string;
  slug: string;
  page: number | null;
  order: string;
  scientific_name: string;
  classification: string;
  genus: string;
  genus_author: string;
  species: string;
  species_author: string;
  species_etymology: string;
  age: string;
  distribution: string;
  synonyms: string;
  diagnosis: string;
  remarks: string;
  images: AmmoniteImage[];
  cover: string | null;
};

type DbShape = {
  total_species: number;
  species: Ammonite[];
};

const db = speciesDb as unknown as DbShape;
export const ammonites: Ammonite[] = db.species;

type DrillableDb = { total: number; slugs: string[] };
const drillableSet = new Set((drillableDb as DrillableDb).slugs);
export function isDrillable(slug: string): boolean {
  return drillableSet.has(slug);
}

export const DRILLABLE_TOTAL = (drillableDb as DrillableDb).total;

export const AMMONITE_AGES = [
  "Devonian",
  "Carboniferous",
  "Triassic",
  "Jurassic",
  "Cretaceous",
];

export function periodsForAge(age: string): string[] {
  if (!age) return [];
  const lower = age.toLowerCase();
  return AMMONITE_AGES.filter((p) => lower.includes(p.toLowerCase()));
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
  let alt = `${name}, an ammonite fossil`;
  if (period) alt = `${name}, a ${period} ammonite fossil`;
  if (region) alt += ` from ${region}`;
  return `${alt}.`;
}

export { SITE_URL, SITE_NAME } from "./site";

export function getAges(): { age: string; count: number }[] {
  return AMMONITE_AGES.map((age) => ({
    age,
    count: ammonites.filter((t) => periodsForAge(t.age).includes(age)).length,
  }));
}

export function getOrders(): { order: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of ammonites) {
    const key = t.order || "Unclassified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([order, count]) => ({ order, count }))
    .sort((a, b) => b.count - a.count);
}

export function getBySlug(slug: string): Ammonite | undefined {
  return ammonites.find((t) => t.slug === slug);
}

export function getByOrder(order: string): Ammonite[] {
  return ammonites.filter((t) => t.order === order);
}

export function searchAmmonites(query: string): Ammonite[] {
  const q = query.trim().toLowerCase();
  if (!q) return ammonites;
  return ammonites.filter((t) => {
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
  prev?: Ammonite;
  next?: Ammonite;
} {
  const idx = ammonites.findIndex((t) => t.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? ammonites[idx - 1] : undefined,
    next: idx < ammonites.length - 1 ? ammonites[idx + 1] : undefined,
  };
}

/**
 * Ammonite images are hotlinked from their sources (Wikimedia Commons,
 * open-access journals, USGS) — the GitHub connector cannot push binary
 * files, so absolute http(s) URLs pass through unchanged. A bare filename
 * is treated as a local public/ path, like the trilobite archive.
 */
export function imgSrc(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `/${path}`;
}

/** Absolute URL for an image, for Open Graph and JSON-LD. */
export function absImg(path: string | null | undefined): string {
  const s = imgSrc(path);
  if (!s) return "";
  return s.startsWith("http") ? s : `${SITE_URL}${s}`;
}

type Coverable = { slug: string; cover: string | null };

export function getCover(t: Coverable): string | null {
  const override = (coversDb as { covers: Record<string, string> }).covers[t.slug];
  if (override) return `ammonites/${t.slug}/${override}`;
  return t.cover;
}

import speciesDb from "../data/amphibians/species.json";
import drillableDb from "../data/amphibians/drillable.json";
import coversDb from "../data/amphibians/covers.json";
import { SITE_URL } from "./site";

export type AmphibianImage = {
  file: string;
  width: number;
  height: number;
  caption?: string;
};

export type Amphibian = {
  id: string;
  slug: string;
  page: number | null;
  order: string;
  scientific_name: string;
  classification: string;
  genus: string;
  authority: string;
  original_combination: string;
  species: string;
  age: string;
  distribution: string;
  diagnosis: string;
  remarks: string;
  captions: string;
  images: AmphibianImage[];
  cover: string | null;
};

type DbShape = {
  total_species: number;
  species: Amphibian[];
};

const db = speciesDb as unknown as DbShape;
export const amphibians: Amphibian[] = db.species;

type DrillableDb = { total: number; slugs: string[] };
const drillableSet = new Set((drillableDb as DrillableDb).slugs);

export function isDrillable(slug: string): boolean {
  return drillableSet.has(slug);
}

export const DRILLABLE_TOTAL = (drillableDb as DrillableDb).total;

export const AMPHIBIAN_AGES = [
  "Permian",
  "Triassic",
  "Jurassic",
  "Cretaceous",
  "Paleogene",
  "Miocene",
  "Pliocene",
  "Pleistocene",
  "Recent",
];

export function periodsForAge(age: string): string[] {
  if (!age) return [];
  const lower = age.toLowerCase();
  return AMPHIBIAN_AGES.filter((p) => lower.includes(p.toLowerCase()));
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
  let alt = `${name}, an amphibian fossil`;
  if (period) alt = `${name}, a ${period} amphibian fossil`;
  if (region) alt += ` from ${region}`;
  return `${alt}.`;
}

export { SITE_URL, SITE_NAME } from "./site";

export function getAges(): { age: string; count: number }[] {
  return AMPHIBIAN_AGES.map((age) => ({
    age,
    count: amphibians.filter((t) => periodsForAge(t.age).includes(age)).length,
  }));
}

export function getOrders(): { order: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of amphibians) {
    const key = t.order || "Unclassified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([order, count]) => ({ order, count }))
    .sort((a, b) => b.count - a.count);
}

export function getBySlug(slug: string): Amphibian | undefined {
  return amphibians.find((t) => t.slug === slug);
}

export function getByOrder(order: string): Amphibian[] {
  return amphibians.filter((t) => t.order === order);
}

export function searchAmphibians(query: string): Amphibian[] {
  const q = query.trim().toLowerCase();
  if (!q) return amphibians;
  return amphibians.filter((t) => {
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
  prev?: Amphibian;
  next?: Amphibian;
} {
  const idx = amphibians.findIndex((t) => t.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? amphibians[idx - 1] : undefined,
    next: idx < amphibians.length - 1 ? amphibians[idx + 1] : undefined,
  };
}

export function imgSrc(path: string | null | undefined): string {
  return path ? `/${path}` : "";
}

type Coverable = { slug: string; cover: string | null };

export function getCover(t: Coverable): string | null {
  const override = (coversDb as { covers: Record<string, string> }).covers[t.slug];
  if (override) return `amphibians/${t.slug}/${override}`;
  return t.cover;
}
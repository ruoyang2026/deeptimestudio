import speciesDb from "../data/triassic-marine/species.json";
import drillableDb from "../data/triassic-marine/drillable.json";
import coversDb from "../data/triassic-marine/covers.json";
import { SITE_URL } from "./site";

export type TriassicMarineImage = {
  file: string;
  width: number;
  height: number;
  caption?: string;
};

export type TriassicMarine = {
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
  images: TriassicMarineImage[];
  cover: string | null;
};

type DbShape = {
  total_species: number;
  species: TriassicMarine[];
};

const db = speciesDb as unknown as DbShape;
export const triassicMarine: TriassicMarine[] = db.species;

type DrillableDb = { total: number; slugs: string[] };
const drillableSet = new Set((drillableDb as DrillableDb).slugs);

export function isDrillable(slug: string): boolean {
  return drillableSet.has(slug);
}

export const TRIASSIC_MARINE_DRILLABLE_TOTAL = (drillableDb as DrillableDb).total;

export const TRIASSIC_MARINE_AGES = ["Triassic"];

export function periodsForAge(age: string): string[] {
  if (!age) return [];
  const lower = age.toLowerCase();
  return TRIASSIC_MARINE_AGES.filter((p) => lower.includes(p.toLowerCase()));
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
  let alt = `${name}, a marine reptile fossil`;
  if (period) alt = `${name}, a ${period} marine reptile fossil`;
  if (region) alt += ` from ${region}`;
  return `${alt}.`;
}

export { SITE_URL, SITE_NAME } from "./site";

export function getAges(): { age: string; count: number }[] {
  return TRIASSIC_MARINE_AGES.map((age) => ({
    age,
    count: triassicMarine.filter((t) => periodsForAge(t.age).includes(age)).length,
  }));
}

export function getOrders(): { order: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of triassicMarine) {
    const key = t.order || "Unclassified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([order, count]) => ({ order, count }))
    .sort((a, b) => b.count - a.count);
}

export function getBySlug(slug: string): TriassicMarine | undefined {
  return triassicMarine.find((t) => t.slug === slug);
}

export function getByOrder(order: string): TriassicMarine[] {
  return triassicMarine.filter((t) => t.order === order);
}

export function searchTriassicMarine(query: string): TriassicMarine[] {
  const q = query.trim().toLowerCase();
  if (!q) return triassicMarine;
  return triassicMarine.filter((t) => {
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
  prev?: TriassicMarine;
  next?: TriassicMarine;
} {
  const idx = triassicMarine.findIndex((t) => t.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? triassicMarine[idx - 1] : undefined,
    next: idx < triassicMarine.length - 1 ? triassicMarine[idx + 1] : undefined,
  };
}

export function imgSrc(path: string | null | undefined): string {
  return path ? `/${path}` : "";
}

type Coverable = { slug: string; cover: string | null };

export function getCover(t: Coverable): string | null {
  const override = (coversDb as { covers: Record<string, string> }).covers[t.slug];
  if (override) return `triassic-marine/${t.slug}/${override}`;
  return t.cover;
}
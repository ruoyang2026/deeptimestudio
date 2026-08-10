import speciesDb from "../data/trilobites/species.json";

export type TrilobiteImage = {
  file: string;
  width: number;
  height: number;
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
  return {
    prev: idx > 0 ? trilobites[idx - 1] : undefined,
    next: idx < trilobites.length - 1 ? trilobites[idx + 1] : undefined,
  };
}

export function imgSrc(path: string | null | undefined): string {
  return path ? `/${path}` : "";
}

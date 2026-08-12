import updatesDb from "../data/updates.json";

export type UpdateKind =
  | "species_added"
  | "images_added"
  | "unlocked"
  | "fashion_added";

export type UpdateEntry = {
  id: string;
  date: string;
  kind: UpdateKind;
  count: number;
  slugs?: string[];
  detail?: string;
};

type UpdatesDb = {
  last_generated: string;
  entries: UpdateEntry[];
};

const db = updatesDb as unknown as UpdatesDb;

export const updates: UpdateEntry[] = db.entries;
export const UPDATES_LAST_GENERATED = db.last_generated;

export function getUpdates(): UpdateEntry[] {
  return [...updates].sort((a, b) =>
    a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)
  );
}

export function getLatestUpdates(n: number): UpdateEntry[] {
  return getUpdates().slice(0, n);
}

export function lastModifiedForSlug(slug: string): string | undefined {
  let best: string | undefined;
  for (const e of updates) {
    if (e.slugs && e.slugs.includes(slug)) {
      if (!best || e.date > best) best = e.date;
    }
  }
  return best;
}

export function lastModifiedForFashionSlug(slug: string): string | undefined {
  return lastModifiedForSlug(slug);
}

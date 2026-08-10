# Trilobite Visual Database

A searchable visual database of **513 trilobite species** compiled from the
*Illustration Guide to Trilobites* visual database. Built with Next.js, static
generation and Vercel — no backend required.

## Site

- **Homepage** (`/`): card matrix of all species, filterable by order (10 orders)
  and geological age (6 periods), and searchable by species, genus, age or region.
- **Species detail** (`/species/[slug]`): full formatted record — classification,
  genus/species etymology, age, distribution, synonyms, diagnosis, remarks and
  all specimen photographs.
- Static export: every species page is prerendered at build time (SSG).

## Unlocked (drillable) species

All **513** species are visible on the homepage (photographs included), but only
**120** are unlocked for drill-down. Locked cards are tinted light gray and
show a "Locked" badge; clicking one opens a dialog pointing to the shop.

The unlocked list lives in `data/trilobites/drillable.json` (array of `slug`s).
It is selected **proportionally by geological period** so every period keeps a
browseable share (small periods get a guaranteed minimum):

| Period | Total | Unlocked |
|---|---|---|
| Cambrian | 317 | 74 |
| Ordovician | 126 | 29 |
| Silurian | 32 | 7 |
| Devonian | 38 | 8 |
| Carboniferous | 2 | 1 |
| Permian | 1 | 1 |
| **Total** | **513** | **120** |

Within a period, unlocked species sort ahead of locked ones on the homepage so
filtering by an age shows the browsable material first.

To change the unlock policy, edit `data/trilobites/drillable.json` (keep
`total` in sync) — no other code changes are needed.

## Run locally

```bash
npm install
npm run dev
```

## Database

The structured database lives in `data/trilobites/species.json`. Each species
record contains:

| Field | Description |
|---|---|
| `id`, `slug`, `page` | identifiers + source PDF page number |
| `order` | taxonomic order (Agnostida, Asaphida, …) |
| `scientific_name` | full binomial |
| `classification` | Order / Suborder / Superfamily / Family |
| `genus`, `genus_author`, `genus_etymology` | genus block |
| `species`, `species_author`, `species_etymology` | species block |
| `age` | geological age range |
| `distribution` | main localities |
| `synonyms`, `diagnosis`, `characters`, `remarks` | textual content |
| `captions` | specimen photo captions |
| `images[]`, `cover` | photo file paths (`trilobites/<slug>/<n>.webp`) |

Photos are stored in `public/trilobites/<slug>/` (WebP, ~2500 images).

## Reproduce the database from the PDF

```bash
python scripts/extract_trilobites.py "path/to/visual-database-full.pdf" \
    --out data/trilobites --public public/trilobites
```

The script extracts per-page structured text + photographs from the PDF,
writing `data/trilobites/species.json` and photos under `public/trilobites/`.
It is resumable (pages whose images already exist are skipped), so re-running
after parser fixes only re-parses text fields.

## Export a standalone database bundle

For distribution or independent sale of the database:

```bash
python scripts/export_database.py --root . --out dist
```

Produces `dist/trilobite-database/` with `species.json`, all images and a
README — a fully self-contained package.

Note: the export script copies photos from `public/trilobites/`, so run the
extractor first (or ensure the photos exist there).

## Project structure

```
app/
  page.tsx                    homepage (waterfall cards + search + order filter)
  species/[slug]/page.tsx     species detail page
  layout.tsx                  root layout + schema.org metadata
lib/
  trilobites.ts               data accessors (search, filter, pagination)
data/
  trilobites/
    species.json              the structured database
public/
  trilobites/<slug>/          species photographs (WebP)
scripts/
  extract_trilobites.py       PDF -> database extractor
  export_database.py          standalone database bundle exporter
styles/globals.css
```

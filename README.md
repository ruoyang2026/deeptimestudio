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
**250** are unlocked for drill-down. Locked cards are tinted light gray and
show a "Locked" badge; clicking one opens a dialog pointing to the shop.

The unlocked list lives in `data/trilobites/drillable.json` (array of `slug`s).
It is selected **proportionally by geological period** so every period keeps a
browseable share (small periods get a guaranteed minimum):

| Period | Total | Unlocked |
|---|---|---|
| Cambrian | 317 | 155 |
| Ordovician | 123 | 60 |
| Silurian | 32 | 15 |
| Devonian | 38 | 17 |
| Carboniferous | 2 | 2 |
| Permian | 1 | 1 |
| **Total** | **513** | **250** |

Within a period, unlocked species sort ahead of locked ones on the homepage so
filtering by an age shows the browsable material first.

To change the unlock policy, edit `data/trilobites/drillable.json` (keep
`total` in sync) — no other code changes are needed.

## Sitemap

`app/sitemap.ts` generates `/sitemap.xml` at build time for SEO. It includes:

- Homepage `/`
- The **250** unlocked species pages (`/species/<slug>`, derived from
  `data/trilobites/drillable.json` at build time)
- The fashion collection page `/fossil-fashion-design-inspiration`
- All fashion product pages (`/fashion/<slug>`, derived from
  `data/fashion.json`)
- The What's New page `/updates`

### Update mechanism

The species entries in the sitemap are **driven by `drillable.json`** — no
manual list to maintain. Adding or removing a `slug` in
`data/trilobites/drillable.json` automatically adds/removes the corresponding
`/species/<slug>` URL on the next `npm run build`.

To push a sitemap change live:

1. Edit `data/trilobites/drillable.json` (keep `total` in sync with the array).
2. Rebuild & redeploy (`npm run build`), which regenerates both the species
   pages (`generateStaticParams`) and `/sitemap.xml`.
3. Optionally submit the new sitemap in Google Search Console for faster
   re-crawling.

`public/robots.txt` points crawlers to `/sitemap.xml`.

`lastmod` on each entry comes from `data/updates.json` (see "What's New"
below): whenever a species gains images or is added, its detail page URL
carries the real modification date so crawlers re-pick changed pages.

## What's New (update log)

`/updates` is an automatically maintained changelog of every content change,
driven by `data/updates.json`:

| Kind | Meaning |
|---|---|
| `species_added` | a new species record (new `/species/<slug>` page) |
| `images_added` | new photograph(s) added to an existing species |
| `fashion_added` | a new fashion product in `data/fashion.json` |

### How updates are recorded

`scripts/sync_updates.js` diffs the current content against a stored snapshot
(`data/.updates-snapshot.json`) and appends dated entries to
`data/updates.json`. It runs automatically as a `prebuild` step, and can also
be run manually: `npm run sync:updates`.

Workflow — record a content change:

1. Add species records / images under `data/trilobites/` +
   `public/trilobites/<slug>/`, or add a product to `data/fashion.json`.
2. Run `npm run build` (or `npm run sync:updates` alone). The script detects
   the changes and appends one entry per change type (first run only
   establishes the baseline and records nothing).
3. Deploy. The `/updates` page and the sitemap `lastmod` reflect the changes.

The latest 3 entries also appear in the sidebar "Latest additions" block on
every page.

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
  updates/page.tsx            What's New (auto changelog)
  layout.tsx                  root layout + schema.org metadata
  sitemap.ts                  /sitemap.xml (driven by drillable.json + updates.json)
public/
  trilobites/<slug>/          species photographs (WebP)
  robots.txt                  crawler rules -> /sitemap.xml
lib/
  trilobites.ts               data accessors (search, filter, pagination)
  fashion.ts                  fashion data accessors (reads data/fashion.json)
  updates.ts                  update-log accessors (reads data/updates.json)
data/
  trilobites/
    species.json              the structured database
  fashion.json                fashion products
  updates.json                auto-maintained What's New log
  .updates-snapshot.json      diff baseline for the update log (generated)
scripts/
  extract_trilobites.py       PDF -> database extractor
  export_database.py          standalone database bundle exporter
  sync_updates.js             update-log diff (npm run sync:updates)
styles/globals.css
```

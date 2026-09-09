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

Homepage card covers are auto-picked from the species' own photos: collector
photos (captions without a 4-digit year or specimen number) ranked by
colorfulness and complete-specimen wording are preferred over black-white
literature scans; size annotations such as "3 mm" do not disqualify a photo.
`covers.json` overrides take highest priority. See
`docs/cover-selection-rules.md`.

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

## Batch-ingest species cards from PDFs (extract_species_cards.py)

The **Amphibians archive** (and any future per-species batch) is built with a
generic CLI that turns a folder of per-species PDFs into website cards +
drill-down detail pages in one step. It is data-driven: card grid
(`app/components/AmphibiansArchive.tsx`) and detail pages
(`app/amphibians/[slug]/page.tsx`) read `data/amphibians/*.json`, so after
this step the new species appear on the live site with no component changes.

### Input convention

Each species is a 2-page PDF named `species_NN_*.pdf`:

```
output_extract/
  species_01_Chunerpeton_tianyiensis_Gao_et_Shubin_2003.pdf
  species_02_Regalerpeton_weichangensis_...2009.pdf
  ...
```

- **Page 1** — taxonomy text fields (Family / Genus / Authority /
  Original Combination / Age / Locality / Diagnosis / Remarks).
- **Page 2** — one embedded fossil figure image.

The structured text is **not parsed from the PDF**; it comes from a companion
`species_data_*.json` (per batch), which holds one record per species with
`species[]` entries (`id`, `species`, `family`, `genus`, `age`, `locality`,
`diagnosis`, `remark`, `photo.caption`). The CLI matches each JSON species to
its PDF via the `species_NN_` filename prefix.

### Usage

```bash
python scripts/extract_species_cards.py \
    --collection amphibians \
    --pdf-dir "D:/fossil/.../output_extract" \
    --species-json "D:/fossil/.../species_data_pages80_117.json" \
    --id-prefix b
```

or via npm:

```bash
npm run ingest:species -- --collection amphibians \
    --pdf-dir "..." --species-json "..." --id-prefix b
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--collection` | yes | — | archive name → `public/<c>/` + `data/<c>/` |
| `--pdf-dir` | yes | — | directory containing `species_NN_*.pdf` |
| `--species-json` | yes | — | species data JSON (per batch) |
| `--id-prefix` | no | `a` | record id prefix, avoids React key collisions across batches (use a new letter per batch) |
| `--append` | no | on | append to existing `species.json` (default) |
| `--replace` | no | off | rebuild `species.json` from scratch |
| `--max-dim` | no | `1600` | longest edge (px) of saved cover WebP |
| `--skip-images` | no | off | only update JSON, don't re-extract images |
| `--title` / `--source` | no | — | override `species.json` metadata |

### What it produces

```
public/amphibians/<slug>/01.webp   precisely-cropped fossil figure (card cover)
data/amphibians/species.json       species records (8 -> 21 ... appended)
data/amphibians/drillable.json     all species unlocked (drillable)
data/amphibians/covers.json        cover overrides
```

- **Image precision**: the embedded figure on page 2 often has white margins
  around the fossil; the script trims those borders (`trim_white_margins`)
  so the card shows only the figure ("精准切割"), then downscales to WebP.
- **Slug** = binomial only, dropping author & `?` (e.g.
  `Chunerpeton tianyiensis Gao et Shubin, 2003` → `chunerpeton-tianyiensis`,
  `Sinerpeton? fengshanensis ...` → `sinerpeton-fengshanensis`).
- **Append mode** merges new records into the existing DB, skipping slugs
  that already exist — the archive accumulates across batches.
- **ids** are namespaced by `--id-prefix` so multiple batches on one page
  don't collide in React `key`s (first batch `a…`, second `b…`, …).

### After-ingest checklist

1. If the new batch introduces ages outside the current filter list, add
   them to `AMPHIBIAN_AGES` in `lib/amphibians.ts` (e.g. Jurassic/Permian
   for the caudata batch).
2. Add a `What's New` entry in `data/updates.json`
   (`kind: "amphibians_added"`, count, slugs).
3. `npm run build` — the new `/amphibians/<slug>` pages and `/sitemap.xml`
   entries are generated automatically from the JSON.
4. Commit & deploy (Vercel picks up the push).

## Custom amphibian covers (optimize_amphibian_covers.py)

The batch-ingest script crops each PDF's page-2 figure generically. Some
species need a hand-tuned cover (a specific page, a local colour photo, a
rotated landscape shot, or a precise body crop). `optimize_amphibian_covers.py`
handles those cases as a reusable CLI:

```bash
# generate the custom 02.webp covers for the configured species
python scripts/optimize_amphibian_covers.py

# also flip data/amphibians/covers.json to 02.webp (+ add page-3 image to
# jeholotriton-paradoxus in species.json)
python scripts/optimize_amphibian_covers.py --apply-data
```

### Supported modes (per-species, in `JOBS`)

| Mode | Effect |
|------|--------|
| `full` | use the whole page-2/3 figure (trimmed) as cover |
| `color_rotate` | crop the colourful photo region and rotate 90° (landscape → portrait) |
| `left_color` | crop only the left colour photo from a two-panel figure |
| `body_density` | precisely crop the fossil body by ink density (drop blank margins & sparse annotations) |

Each processed species gets a `public/amphibians/<slug>/02.webp`; the card
cover is switched via `data/amphibians/covers.json` (`slug -> 02.webp`), and
— when the new image should also appear on the detail page — it is appended
to `species.json` `images[]`.

### Customising

To tune a cover for another species, add an entry to the `JOBS` dict at the
top of the script:

```python
JOBS = {
    "my-species": {
        "pdf": "species_NN_...pdf",
        "page": 1,            # 0-based page index (1 = page 2)
        "mode": "body_density",
    },
}
```

Dependencies: `pip install pymupdf numpy pillow`.

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
  extract_species_cards.py    batch PDF -> species cards/detail CLI (amphibians etc.)
  optimize_amphibian_covers.py  custom per-species cover crops (rotate/left/body)
  export_database.py          standalone database bundle exporter
  probe_images.js             write real pixel dimensions into species.json
  probe_colorfulness.py       colorfulness score for cover selection
  relink_captions.py          per-image captions from the source PDF
  sync_updates.js             update-log diff (npm run sync:updates)
styles/globals.css
```

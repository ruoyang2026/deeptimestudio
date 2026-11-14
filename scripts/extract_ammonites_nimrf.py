#!/usr/bin/env python3
"""Ingest the NIMRF Ammonite Visual Database Vol. 1 PDF into the ammonites archive.

The PDF is a single book file. Pages 3-21 hold the table of contents; each
species then occupies one or two following pages:

  * 2-page species: page 1 = text record, page 2 = fossil photo(s) + caption
  * 1-page species: text record, photo(s) and caption on the same page

Outputs:
  public/ammonites/<slug>/NN.webp       fossil photos (WebP, trimmed)
  data/ammonites/species.json           species records (append, de-duped by slug)
  data/ammonites/drillable.json         all species unlocked
  data/ammonites/covers.json            cover override for the new records

Usage:
  python scripts/extract_ammonites_nimrf.py \
      --pdf "D:/fossil/visual database/NIMRF Ammonite Visual Database Vol. 1_dewatermarked.pdf" \
      --append

  python scripts/extract_ammonites_nimrf.py --pdf "..." --dry-run
"""

import argparse
import io
import json
import os
import re
import unicodedata

import fitz
import numpy as np
from PIL import Image

TOC_FIRST_PAGE = 3
TOC_LAST_PAGE = 21
DEFAULT_CONTENT_END = 1170
DEFAULT_MAX_DIM = 1600
DEFAULT_QUALITY = 85
DEFAULT_TRIM_THRESHOLD = 245
MIN_IMAGE_PIXELS = 4000

FOOTER_RE = re.compile(
    r"NIMRF Ammonite Visual Database Vol\. 1\s*[·.]\s*\d+\s*/\s*\d+"
)

AGE_FIX = {
    "Callovian Stage": "Middle Jurassic, Callovian Stage",
    "Yujiang Stage": "Early Cretaceous, Yujiang Stage",
    "T2²–T3": "Middle–Late Triassic (T2²–T3)",
    "Mcjs": "",
}


# ---------------------------------------------------------------- text helpers
def slugify(name):
    """Binomial -> lowercase hyphen slug (drops authority and punctuation)."""
    m = re.match(r"^([A-Z][a-z]+)\??\s+([a-z]+\??)\b", name)
    if m:
        return f"{m.group(1).lower()}-{m.group(2).rstrip('?').lower()}"
    s = unicodedata.normalize("NFKD", name)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-")
    return s or "species"


def clean_value(value):
    value = (value or "").strip()
    if value.lower() == "not verified":
        return ""
    return re.sub(r"\s+", " ", value)


def normalize_age(age):
    age = (age or "").strip()
    if age in AGE_FIX:
        return AGE_FIX[age]
    return age


def split_etymology(block):
    parts = re.split(r"\n\s*Etymology:", block, maxsplit=1)
    line = parts[0].strip()
    etymology = clean_value(parts[1]) if len(parts) > 1 else ""
    return line, etymology


def split_name_line(line, fallback_genus=""):
    tokens = line.split()
    if not tokens:
        return fallback_genus, ""
    genus = tokens[0]
    author = clean_value(" ".join(tokens[1:]))
    return genus, author


def extract_fields(text, fallback_name):
    """Parse the structured record from one species info page."""
    t = FOOTER_RE.sub("", text)
    t = re.sub(r"Main\s*\ndistribution", "Main distribution", t)
    t = re.sub(r"Diagnosis\s*\nCharacters", "Diagnosis", t)

    def grab(label, next_label=None):
        if next_label:
            pat = (
                r"(?m)^" + re.escape(label) + r"\s*$\n(.*?)(?=^"
                + re.escape(next_label) + r"\s*$)"
            )
        else:
            pat = r"(?m)^" + re.escape(label) + r"\s*$\n(.*)$"
        m = re.search(pat, t, re.S)
        return m.group(1).strip() if m else ""

    order_family = grab("Order / Family", "Genus")
    genus_block = grab("Genus", "Species")
    species_block = grab("Species", "Age")
    age = grab("Age", "Main distribution")
    distribution = grab("Main distribution", "Synonyms")
    synonyms = grab("Synonyms", "Diagnosis")
    diagnosis = grab("Diagnosis", "Remarks")
    remarks = grab("Remarks")

    genus_line, genus_etymology = split_etymology(genus_block)
    species_line, species_etymology = split_etymology(species_block)

    genus, genus_author = split_name_line(genus_line)
    species_tokens = species_line.split()
    epithet = species_tokens[1] if len(species_tokens) > 1 else ""
    species_author = clean_value(" ".join(species_tokens[2:]))

    inline_caption = ""
    marker = remarks.find("Specimen held at")
    if marker >= 0:
        inline_caption = re.sub(r"\s+", " ", remarks[marker:]).strip()
        remarks = remarks[:marker].strip()

    distribution = clean_value(distribution)
    if not distribution:
        m = re.search(r"collected at (.+?)(?:\.\s|\.$)", remarks, re.I | re.S)
        if m:
            distribution = re.sub(r"\s+", " ", m.group(1)).strip()

    return {
        "scientific_name": fallback_name,
        "classification": re.sub(r"\s+", " ", order_family).strip(),
        "order": "Ammonoidea",
        "genus": genus,
        "genus_author": genus_author,
        "genus_etymology": genus_etymology,
        "species": epithet,
        "species_author": species_author,
        "species_etymology": species_etymology,
        "age": normalize_age(age),
        "distribution": distribution,
        "synonyms": clean_value(synonyms),
        "diagnosis": clean_value(diagnosis),
        "remarks": clean_value(remarks),
        "inline_caption": inline_caption,
    }


def page_captions(page_text, is_info_page):
    """Split a photo page into one caption per figure."""
    t = FOOTER_RE.sub("", page_text).strip()
    if is_info_page:
        idx = t.find("Specimen held at")
        if idx < 0:
            return []
        t = t[idx:]
    chunks = re.split(r"(?=Specimen held at)", t)
    return [re.sub(r"\s+", " ", c).strip() for c in chunks if c.strip()]


# ---------------------------------------------------------------- image helpers
def trim_white_margins(img, threshold=DEFAULT_TRIM_THRESHOLD):
    a = np.asarray(img.convert("RGB")).astype(int)
    rows = np.where((a.sum(axis=2) < threshold * 3).any(axis=1))[0]
    if rows.size == 0:
        return img
    cols = np.where((a.sum(axis=2) < threshold * 3).any(axis=0))[0]
    if cols.size == 0:
        return img
    pad = 6
    box = (
        max(0, int(cols[0]) - pad),
        max(0, int(rows[0]) - pad),
        min(img.width, int(cols[-1]) + pad + 1),
        min(img.height, int(rows[-1]) + pad + 1),
    )
    return img.crop(box)


def image_blocks(page):
    return [b for b in page.get_text("dict")["blocks"] if b.get("type") == 1 and b.get("image")]


# ---------------------------------------------------------------- main pipeline
def parse_toc(doc):
    raw = "".join(
        doc[i].get_text() for i in range(TOC_FIRST_PAGE - 1, TOC_LAST_PAGE)
    )
    items = re.findall(r"([^\n]+)\n\.{3,}\n\s*(\d+)\n", raw)
    seen = set()
    out = []
    for name, page in items:
        name = name.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        out.append((name, int(page)))
    return out


def build_records(doc, toc, content_end, public_dir, collection, id_prefix,
                  max_dim, quality, dry_run):
    records = []
    missing_images = []
    gaps = []

    for idx, (name, start) in enumerate(toc):
        end = toc[idx + 1][1] - 1 if idx + 1 < len(toc) else content_end
        if end < start:
            end = start
        info_page = doc[start - 1]
        fields = extract_fields(info_page.get_text(), name)
        slug = slugify(name)
        inline_caption = fields.pop("inline_caption")

        figs = []  # (page_number, bbox, image_bytes, caption)
        for pno in range(start, end + 1):
            page = doc[pno - 1]
            blocks = sorted(
                image_blocks(page),
                key=lambda b: (round(b["bbox"][1]), round(b["bbox"][0])),
            )
            if not blocks:
                continue
            if pno == start and inline_caption:
                caps = [inline_caption]
            else:
                caps = page_captions(page.get_text(), is_info_page=(pno == start))
            for i, b in enumerate(blocks):
                if b["width"] * b["height"] < MIN_IMAGE_PIXELS:
                    continue
                cap = caps[i] if i < len(caps) else (caps[-1] if caps else "")
                figs.append((pno, b["bbox"], b["image"], cap))

        if not figs:
            missing_images.append(name)
            gaps.append(len(toc) - len(records))
            continue

        images_meta = []
        out_dir = os.path.join(public_dir, collection, slug)
        if not dry_run:
            os.makedirs(out_dir, exist_ok=True)

        for i, (pno, _bbox, raw, caption) in enumerate(figs, start=1):
            try:
                img = Image.open(io.BytesIO(raw)).convert("RGB")
            except Exception as exc:  # pragma: no cover - defensive
                print(f"  [warn] {name}: cannot read image p{pno}: {exc}")
                continue
            img = trim_white_margins(img)
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            fname = f"{i:02d}.webp"
            if not dry_run:
                img.save(
                    os.path.join(out_dir, fname), "WEBP", quality=quality, method=6
                )
            images_meta.append(
                {
                    "file": f"{collection}/{slug}/{fname}",
                    "width": img.width,
                    "height": img.height,
                    "caption": caption,
                }
            )

        if not images_meta:
            missing_images.append(name)
            continue

        record = {
            "id": f"{id_prefix}{len(records) + 1:03d}",
            "slug": slug,
            "page": start,
            "order": fields["order"],
            "scientific_name": fields["scientific_name"],
            "classification": fields["classification"],
            "genus": fields["genus"],
            "genus_author": fields["genus_author"],
            "genus_etymology": fields["genus_etymology"],
            "species": fields["species"],
            "species_author": fields["species_author"],
            "species_etymology": fields["species_etymology"],
            "age": fields["age"],
            "distribution": fields["distribution"],
            "synonyms": fields["synonyms"],
            "diagnosis": fields["diagnosis"],
            "remarks": fields["remarks"],
            "images": images_meta,
            "cover": images_meta[0]["file"],
        }
        records.append(record)

        if (idx + 1) % 50 == 0 or idx + 1 == len(toc):
            print(f"  parsed {idx + 1}/{len(toc)} species")

    return records, missing_images


def load_existing(path):
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"title": "", "version": "", "source": "", "species": []}


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def main():
    parser = argparse.ArgumentParser(
        prog="extract_ammonites_nimrf.py",
        description="Ingest NIMRF Ammonite Visual Database Vol. 1 into the ammonites archive",
    )
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--collection", default="ammonites")
    parser.add_argument("--id-prefix", default="nim")
    parser.add_argument("--content-end", type=int, default=DEFAULT_CONTENT_END)
    parser.add_argument("--max-dim", type=int, default=DEFAULT_MAX_DIM)
    parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    parser.add_argument("--append", action="store_true", default=True)
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(project_root, "public")
    data_dir = os.path.join(project_root, "data", args.collection)

    print(f"Opening {args.pdf}")
    doc = fitz.open(args.pdf)
    toc = parse_toc(doc)
    print(f"TOC species: {len(toc)} (pages {toc[0][1]}-{toc[-1][1]})")

    records, missing = build_records(
        doc,
        toc,
        args.content_end,
        public_dir,
        args.collection,
        args.id_prefix,
        args.max_dim,
        args.quality,
        args.dry_run,
    )
    print(f"Records with images: {len(records)}")
    if missing:
        print(f"Missing images ({len(missing)}): {missing[:10]}")
    total_images = sum(len(r["images"]) for r in records)
    print(f"Images: {total_images}")

    if args.dry_run:
        print("Dry run: no files written.")
        return

    species_path = os.path.join(data_dir, "species.json")
    existing = load_existing(species_path)
    existing_species = existing.get("species", []) if not args.replace else []
    existing_slugs = {r["slug"] for r in existing_species}
    merged = list(existing_species)
    added = 0
    for rec in records:
        if rec["slug"] in existing_slugs:
            continue
        merged.append(rec)
        existing_slugs.add(rec["slug"])
        added += 1

    source = existing.get("source", "")
    nimrf_note = (
        "NIMRF Ammonite Visual Database Vol. 1 (National Rock, Mineral and Fossil "
        "Specimen Resource Sharing Platform, nimrf.net.cn)"
    )
    if nimrf_note not in source:
        source = f"{source} | {nimrf_note}" if source else nimrf_note

    db = {
        "title": existing.get("title") or f"{args.collection} — Species Database",
        "version": "1.2",
        "source": source,
        "total_species": len(merged),
        "species": merged,
    }
    save_json(species_path, db)
    print(f"species.json: +{added} new, total {len(merged)} -> {species_path}")

    drillable = {
        "note": "All species are unlocked (drillable).",
        "total": len(merged),
        "slugs": [r["slug"] for r in merged],
    }
    save_json(os.path.join(data_dir, "drillable.json"), drillable)

    covers_path = os.path.join(data_dir, "covers.json")
    covers_db = {"note": "Species covers.", "covers": {}}
    if os.path.isfile(covers_path):
        with open(covers_path, encoding="utf-8") as f:
            covers_db = json.load(f)
    for rec in records:
        covers_db["covers"][rec["slug"]] = "01.webp"
    save_json(covers_path, covers_db)

    print(f"drillable.json + covers.json updated ({len(merged)} species)")


if __name__ == "__main__":
    main()

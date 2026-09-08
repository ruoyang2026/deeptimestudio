"""Extract precisely-cropped species figure images from per-species PDFs.

Each PDF in all_species1 has 2 pages:
  page 1: taxonomy info (not used here — data comes from species_data json)
  page 2: one embedded figure image (page was rendered to image).

The embedded image contains the figure plus white margins (and sometimes a
footer). We crop the white borders so the website shows only the figure
("精准切割"), then save WebP to public/amphibians/<slug>/01.webp.
"""

import json
import os
import re
import sys
import unicodedata

import fitz  # PyMuPDF
import numpy as np
from PIL import Image

SRC_DIR = r"D:\fossil\三叶虫\visual-database-ordovician\all_species1"
SPECIES_JSON = r"D:\fossil\三叶虫\chinese_book_project\species_data_pages54_79.json"
PUBLIC_DIR = r"C:\Users\ThinkPad\.openclaw\web-social\deeptimestudio\public\amphibians"
DATA_DIR = r"C:\Users\ThinkPad\.openclaw\web-social\deeptimestudio\data\amphibians"
MAX_DIM = 1600
TRIM_THRESHOLD = 245  # pixels brighter than this are treated as blank margin


def slugify(name):
    """Slug from binomial only (drop authority): 'Macropelobates linquensis (Yang, 1977)' -> 'macropelobates-linquensis'."""
    m = re.match(r"^([A-Z][a-z]+)\s+([a-z]+\??)\b", name)
    if m:
        epithet = m.group(2).rstrip("?")
        return f"{m.group(1).lower()}-{epithet.lower()}"
    s = unicodedata.normalize("NFKD", name)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-")
    return s or "species"


def trim_white_margins(img, threshold=TRIM_THRESHOLD):
    """Crop blank white borders around the figure (precise cut)."""
    a = np.asarray(img.convert("RGB")).astype(int)
    nonwhite = (a.sum(axis=2) < threshold * 3).any(axis=1)  # rows with any dark pixel
    rows = np.where(nonwhite)[0]
    if rows.size == 0:
        return img
    y0, y1 = rows[0], rows[-1]
    cols = np.where((a.sum(axis=2) < threshold * 3).any(axis=0))[0]
    x0, x1 = cols[0], cols[-1]
    # small pad so the crop does not touch content edge
    pad = 6
    box = (max(0, x0 - pad), max(0, y0 - pad),
           min(img.width, x1 + pad + 1), min(img.height, y1 + pad + 1))
    return img.crop(box)


def extract_species_images(species_list):
    """Extract image from each species PDF, return slug -> image meta."""
    results = {}
    for sp in species_list:
        sp_id = sp["id"]
        photo = sp.get("photo") or {}
        caption = (photo.get("caption") or "") if photo else ""
        # map species id -> pdf file by scanning dir (id prefix in filename)
        pdf_file = None
        for f in os.listdir(SRC_DIR):
            if f.lower().endswith(".pdf") and re.match(rf"species_{sp_id:02d}_", f):
                pdf_file = f
                break
        if not pdf_file:
            print(f"  [skip] id={sp_id} {sp['species']} — no pdf in all_species1")
            continue
        slug = slugify(sp["species"].split(" (")[0])
        doc = fitz.open(os.path.join(SRC_DIR, pdf_file))
        page = doc[1]  # page 2 = figure
        ims = page.get_images(full=True)
        if not ims:
            print(f"  [skip] id={sp_id} {pdf_file} — no image on page 2")
            continue
        xref = ims[0][0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n > 4:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img = trim_white_margins(img)

        # downscale to max dim
        w, h = img.size
        if max(w, h) > MAX_DIM:
            scale = MAX_DIM / float(max(w, h))
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        out_dir = os.path.join(PUBLIC_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        fname = "01.webp"
        img.save(os.path.join(out_dir, fname), "WEBP", quality=84, method=6)
        results[slug] = {
            "file": f"amphibians/{slug}/{fname}",
            "width": img.width,
            "height": img.height,
            "caption": caption,
        }
        print(f"  [ok] id={sp_id} {pdf_file} -> {slug}/{fname} {img.size} (src {pix.width}x{pix.height})")
    return results


def build_species_db(species_list, images):
    """Build data/amphibians/species.json from the species_data JSON + images."""
    records = []
    for sp in species_list:
        slug = slugify(sp["species"].split(" (")[0])
        img = images.get(slug)
        if not img:
            continue
        photo = sp.get("photo") or {}
        records.append({
            "id": f"a{sp['id']:03d}",
            "slug": slug,
            "page": photo.get("source_pdf_page"),
            "order": sp.get("family", ""),
            "scientific_name": sp["species"],
            "classification": sp.get("family", ""),
            "genus": sp.get("genus", ""),
            "authority": sp.get("authority", ""),
            "original_combination": sp.get("original_combination", ""),
            "species": sp["species"],
            "age": sp.get("age", ""),
            "distribution": sp.get("locality", ""),
            "diagnosis": sp.get("diagnosis", ""),
            "remarks": sp.get("remark", ""),
            "captions": photo.get("caption", ""),
            "images": [img],
            "cover": img["file"],
        })
    db = {
        "title": "Fossil Amphibians — Species Database (Ordovician companion)",
        "version": "1.0",
        "source": "Chinese book pages 54-79 (amphibian chapter)",
        "total_species": len(records),
        "species": records,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, "species.json"), "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)
    # drillable: all amphibian species are unlocked
    drillable = {"note": "All amphibian species are unlocked (drillable).", "total": len(records),
                 "slugs": [r["slug"] for r in records]}
    with open(os.path.join(DATA_DIR, "drillable.json"), "w", encoding="utf-8") as f:
        json.dump(drillable, f, ensure_ascii=False, indent=1)
    # covers: first image wins
    covers = {"note": "Amphibian covers.", "covers": {r["slug"]: "01.webp" for r in records}}
    with open(os.path.join(DATA_DIR, "covers.json"), "w", encoding="utf-8") as f:
        json.dump(covers, f, ensure_ascii=False, indent=1)
    return db


def main():
    with open(SPECIES_JSON, encoding="utf-8") as f:
        data = json.load(f)
    species_list = data["species"]
    print(f"Species in JSON: {len(species_list)}")
    images = extract_species_images(species_list)
    print(f"Images extracted: {len(images)}")
    db = build_species_db(species_list, images)
    print(f"DB total_species: {db['total_species']} -> {DATA_DIR}")


if __name__ == "__main__":
    main()
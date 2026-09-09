"""Extract precisely-cropped species figure images from per-species PDFs.

Each PDF in a batch dir has 2 pages:
  page 1: taxonomy info (not used here — data comes from species_data json)
  page 2: one embedded figure image (page was rendered to image).

The embedded image contains the figure plus white margins (and sometimes a
footer). We crop the white borders so the website shows only the figure
("精准切割"), then save WebP to public/amphibians/<slug>/01.webp.

This script APPENDS new species to the existing data/amphibians files so the
archive accumulates (e.g. 8 -> 21). Existing records are preserved.
"""

import json
import os
import re
import sys
import unicodedata

import fitz  # PyMuPDF
import numpy as np
from PIL import Image

# 新批次（追加）：
SRC_DIR = r"D:\fossil\三叶虫\chinese_book_project\output_extract"
SPECIES_JSON = r"D:\fossil\三叶虫\chinese_book_project\species_data_pages80_117.json"
PUBLIC_DIR = r"C:\Users\ThinkPad\.openclaw\web-social\deeptimestudio\public\amphibians"
DATA_DIR = r"C:\Users\ThinkPad\.openclaw\web-social\deeptimestudio\data\amphibians"
MAX_DIM = 1600
TRIM_THRESHOLD = 245  # pixels brighter than this are treated as blank margin


def slugify(name):
    """Slug from binomial only (drop authority): 'Chunerpeton tianyiensis Gao et Shubin, 2003' -> 'chunerpeton-tianyiensis'.
    Handles '?' after genus or epithet: 'Sinerpeton? fengshanensis ...' -> 'sinerpeton-fengshanensis'."""
    m = re.match(r"^([A-Z][a-z]+)\??\s+([a-z]+\??)\b", name)
    if m:
        genus = m.group(1).lower()
        epithet = m.group(2).rstrip("?")
        return f"{genus}-{epithet.lower()}"
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
            print(f"  [skip] id={sp_id} {sp['species']} — no pdf in output_extract")
            continue
        slug = slugify(sp["species"])
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
    """Build new species records from species_data JSON + images."""
    records = []
    for sp in species_list:
        slug = slugify(sp["species"])
        img = images.get(slug)
        if not img:
            continue
        photo = sp.get("photo") or {}
        records.append({
            "id": f"b{sp['id']:03d}",  # 'b' 前缀避免与旧批次 id (a*) 冲突
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
    return records


def _load_existing(db_path, total_key="total_species"):
    if os.path.isfile(db_path):
        with open(db_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("species", [])
    return []


def _save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def main():
    with open(SPECIES_JSON, encoding="utf-8") as f:
        data = json.load(f)
    species_list = data["species"]
    print(f"Species in JSON: {len(species_list)}")
    images = extract_species_images(species_list)
    print(f"Images extracted: {len(images)}")
    new_records = build_species_db(species_list, images)
    print(f"New records built: {len(new_records)}")

    # 追加合并现有数据
    species_path = os.path.join(DATA_DIR, "species.json")
    existing = _load_existing(species_path)
    existing_slugs = {r["slug"] for r in existing}
    # 避免重复：新记录若 slug 已存在则跳过
    merged = list(existing)
    for rec in new_records:
        if rec["slug"] not in existing_slugs:
            merged.append(rec)
            existing_slugs.add(rec["slug"])

    db = {
        "title": "Fossil Amphibians — Species Database",
        "version": "1.1",
        "source": "Chinese book (amphibian + caudata/anthracosauria chapters)",
        "total_species": len(merged),
        "species": merged,
    }
    _save_json(species_path, db)
    print(f"species.json total: {len(merged)} -> {species_path}")

    # drillable: all amphibian species are unlocked
    drillable = {"note": "All amphibian species are unlocked (drillable).", "total": len(merged),
                 "slugs": [r["slug"] for r in merged]}
    _save_json(os.path.join(DATA_DIR, "drillable.json"), drillable)

    # covers: first image wins
    covers = {"note": "Amphibian covers.", "covers": {r["slug"]: "01.webp" for r in merged}}
    _save_json(os.path.join(DATA_DIR, "covers.json"), covers)
    print(f"drillable + covers updated: {len(merged)} species")


if __name__ == "__main__":
    main()
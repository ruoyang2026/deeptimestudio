#!/usr/bin/env python
"""Relink every species photo to its own caption from the source PDF.

The original extractor merged all per-image captions into a single `captions`
string, so every figure on a detail page showed the same concatenated text.
This script re-reads the PDF and assigns each caption text span to the image
it belongs to (vertical nearest-above image, resolved by horizontal overlap),
then writes `images[i].caption` on every species record.

Mirrors pdf-translate's caption-ownership logic (layout.py / flow.py):
  - span-level boxes keep side-by-side captions separate
  - caption belongs to the image whose bottom edge is just above the text
  - largest horizontal overlap breaks ties for same-row figures

Usage: python scripts/relink_captions.py [--pdf PATH]
       default PDF: D:\\fossil\\三叶虫\\visual-database-full.pdf
"""
import argparse
import json
import sys
import io

import fitz

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def caption_cutoff(page):
    """y coordinate above which the text table lives; below is image captions."""
    top = None
    for im in page.get_images(full=True):
        xref = im[0]
        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue
        for r in rects:
            if top is None or r.y0 < top:
                top = r.y0
    return 10 ** 9 if top is None else top - 4


def page_image_list(page, doc):
    """Ordered placed images, mirroring extract_images() numbering order."""
    seen = set()
    out = []
    for im in page.get_images(full=True):
        xref = im[0]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            raw = doc.extract_image(xref)
        except Exception:
            continue
        if len(raw["image"]) < 500:
            continue
        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue
        if not rects:
            continue
        rect = max(rects, key=lambda r: r.width * r.height)
        out.append({"xref": xref, "rect": (rect.x0, rect.y0, rect.x1, rect.y1)})
    return out


def caption_owner(line_bbox, imgs):
    """Vertical nearest-above image, resolved by horizontal overlap."""
    x0, y0, x1, y1 = line_bbox
    TOL = 4.0
    cand = [im for im in imgs if im["rect"][3] <= y0 + TOL]
    if not cand:
        cand = imgs

    def score(im):
        ix0, iy0, ix1, iy1 = im["rect"]
        vgap = y0 - iy1
        overlap = min(x1, ix1) - max(x0, ix0)
        return (overlap, -vgap)

    return max(cand, key=score)


def caption_spans(page, cutoff):
    """Caption text spans (y >= cutoff), footer/page-number excluded."""
    spans = []
    d = page.get_text("dict")
    for blk in d["blocks"]:
        if blk["type"] != 0:
            continue
        for line in blk["lines"]:
            for sp in line["spans"]:
                bbox = sp["bbox"]
                if bbox[1] < cutoff:
                    continue
                text = sp["text"].replace("\xa0", " ").strip()
                if not text:
                    continue
                if "Illustration Guide to Trilobites" in text:
                    continue
                if text.isdigit() and len(text) <= 4 and bbox[1] > 780:
                    continue
                spans.append((bbox, text))
    spans.sort(key=lambda s: (s[0][1], s[0][0]))
    return spans


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=r"D:\fossil\三叶虫\visual-database-full.pdf")
    ap.add_argument("--species", default="data/trilobites/species.json")
    ap.add_argument("--dry-run", action="store_true", help="print a sample and exit")
    args = ap.parse_args()

    with open(args.species, encoding="utf-8") as f:
        db = json.load(f)

    doc = fitz.open(args.pdf)
    changed = 0
    empty = 0

    for rec in db["species"]:
        page = doc[rec["page"] - 1]
        cutoff = caption_cutoff(page)
        imgs = page_image_list(page, doc)

        if len(imgs) != len(rec["images"]):
            print(f"[WARN] {rec['slug']} page={rec['page']}: "
                  f"image count mismatch ({len(imgs)} placed vs {len(rec['images'])} stored) — skipped")
            continue

        owners = {}
        for bbox, text in caption_spans(page, cutoff):
            owner = caption_owner(bbox, imgs)
            owners.setdefault(id(owner), []).append(text)

        for i, img in enumerate(imgs):
            caps = owners.get(id(img), [])
            caption = " ".join(caps) if caps else ""
            if caption != rec["images"][i].get("caption", ""):
                changed += 1
            rec["images"][i]["caption"] = caption
            if not caption:
                empty += 1

    doc.close()

    if args.dry_run:
        sample = [s for s in db["species"] if s["slug"] in (
            "ammagnostus-wangcunensis", "elrathia-kingii", "dicranurus-monstrosus")]
        for s in sample:
            print(f"\n== {s['slug']} page={s['page']} (#{len(s['images'])} imgs) ==")
            for i, img in enumerate(s["images"]):
                print(f"  img[{i}] {img['file'].split('/')[-1]}: {img.get('caption', '')[:110]}")
        print(f"\n[dry-run] {changed} image captions would change; {empty} images stay empty")
        return

    with open(args.species, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)

    print(f"Relinked {changed} image captions; {empty} images have no caption.")


if __name__ == "__main__":
    main()

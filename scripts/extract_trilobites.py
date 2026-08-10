"""Extract structured trilobite species database from the visual-database PDF.

Usage:
    python scripts/extract_trilobites.py <pdf_path> --out data/trilobites

Produces:
    data/trilobites/species.json            -- standalone structured database
    data/trilobites/images/<slug>/<n>.webp  -- extracted photos (WebP)

The database JSON is self-contained and can be exported/sold independently.
"""

import argparse
import io
import json
import os
import re
import sys
import unicodedata

import fitz  # PyMuPDF
from PIL import Image


def clean(text):
    t = text.replace("\u00a0", " ")
    t = unicodedata.normalize("NFKC", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# ---------------------------------------------------------------------------
# Page layout analysis (span-level tokens sorted by y then x):
#   - Labels are bold short tokens at left edge (x < 110) or right edge
#     (x > 300). Some labels are merged with their value into one span
#     (e.g. "Author Dalman J. W.", "Main locality Hunan, ...").
#   - Values at x < 300 are LEFT-column; values at x > 300 are RIGHT-column.
#
# Field anchors (y positions of labels):
#   Order/Family  -> classification (left values just below, before genus row)
#   Author (#1)   -> genus name (left, "Genus X") + genus author (right)
#   Genus         -> next Etymology = genus etymology
#   Etymology     -> etymology value (left)
#   Author (#2)   -> species name (left, "X. epithet") + species author
#   Species       -> next Etymology = species etymology
#   Age           -> age value (left) sits between species etymology and the
#                    Main/distribution anchor
#   Main / distribution / "Main locality X" -> distribution value (right)
#   Synonyms      -> synonyms value(s)
#   Diagnosis/Characters -> diagnosis value(s)
#   Remarks/Other -> remarks value
# ---------------------------------------------------------------------------

RIGHT_MIN_X = 300.0


def page_tokens(page):
    d = page.get_text("dict")
    tokens = []
    for block in d["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            y0 = line["bbox"][1]
            for span in line["spans"]:
                text = clean(span["text"])
                if not text:
                    continue
                bold = bool(span["flags"] & 16)
                tokens.append((round(y0, 1), round(span["bbox"][0], 1), bold, text))
    tokens.sort(key=lambda t: (t[0], t[1]))
    return tokens


def split_merged(tokens):
    """Split merged label+value spans into (label, value) token pairs.

    Handles: 'Author X', 'Main locality X', 'Main distribution X',
    'EtymologyX', 'distribution X'. Returns a new token list.
    """
    out = []
    for y, x, bold, t in tokens:
        if not bold:
            out.append((y, x, bold, t))
            continue
        m = re.match(r"^Author\s+(.+)$", t)
        if m:
            out.append((y, x, True, "Author"))
            out.append((y, x, False, m.group(1)))
            continue
        m = re.match(r"^Main\s+locality\s*(.*)$", t)
        if m:
            out.append((y, x, True, "Main locality"))
            if m.group(1).strip():
                out.append((y, x, False, m.group(1)))
            continue
        m = re.match(r"^Main\s+distribution\s*(.*)$", t)
        if m:
            out.append((y, x, True, "Main distribution"))
            if m.group(1).strip():
                out.append((y, x, False, m.group(1)))
            continue
        m = re.match(r"^Etymology(.+)$", t)
        if m and m.group(1).strip():
            out.append((y, x, True, "Etymology"))
            out.append((y, x, False, m.group(1)))
            continue
        m = re.match(r"^distribution(.+)$", t)
        if m and m.group(1).strip():
            out.append((y, x, True, "distribution"))
            out.append((y, x, False, m.group(1)))
            continue
        out.append((y, x, bold, t))
    return out


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
    if top is None:
        return 10 ** 9
    return top - 4


def find_anchor_ys(tokens, predicate):
    ys = sorted(set(y for (y, x, b, t) in tokens if predicate(t, b)))
    return ys


def parse_page(page):
    tokens = split_merged(page_tokens(page))
    cutoff = caption_cutoff(page)

    species = None
    order = None
    body = []

    for y, x, bold, t in tokens:
        if "Illustration Guide to Trilobites" in t:
            m = re.search(r"Trilobites\s+‡?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*$", t)
            if m and not order:
                order = clean(m.group(1))
            continue
        if t.isdigit() and len(t) <= 4 and y > 780:
            continue
        if species is None and y < 100 and bold:
            species = clean(t)
            continue
        body.append((y, x, bold, t))

    # ---- anchors ----
    y_cls = find_anchor_ys(body, lambda t, b: t == "Order/Family")
    y_cls = y_cls[0] if y_cls else None
    author_ys = find_anchor_ys(body, lambda t, b: t == "Author")
    y_a1 = author_ys[0] if len(author_ys) >= 1 else None
    y_a2 = author_ys[1] if len(author_ys) >= 2 else None
    etym_ys = find_anchor_ys(body, lambda t, b: t == "Etymology")
    y_ge = etym_ys[0] if etym_ys else None
    y_se = etym_ys[1] if len(etym_ys) >= 2 else None
    y_age = find_anchor_ys(body, lambda t, b: t == "Age")
    y_age = y_age[0] if y_age else None
    dist_ys = find_anchor_ys(body, lambda t, b: t in ("Main", "distribution", "Main locality", "Main distribution"))
    y_dist = dist_ys[0] if dist_ys else None
    y_syn = find_anchor_ys(body, lambda t, b: t == "Synonyms")
    y_syn = y_syn[0] if y_syn else None
    y_dia = find_anchor_ys(body, lambda t, b: t in ("Diagnosis", "Characteristics"))
    y_dia = y_dia[0] if y_dia else None
    y_rem = find_anchor_ys(body, lambda t, b: t in ("Remarks", "Other"))
    y_rem = y_rem[0] if y_rem else None

    fields = {
        "classification": "", "genus": "", "genus_author": "",
        "genus_etymology": "", "species": "", "species_author": "",
        "species_etymology": "", "age": "", "distribution": "",
        "synonyms": "", "diagnosis": "", "characters": "", "remarks": "",
        "captions": "",
    }

    def add(key, text):
        text = clean(text)
        if not text:
            return
        if fields[key]:
            fields[key] = clean(fields[key] + " " + text)
        else:
            fields[key] = text

    species_y = None
    species_done = False

    KNOWN_LABELS = {
        "Order/Family", "Author", "Genus", "Species", "Etymology", "Age",
        "Main", "distribution", "Main locality", "Main distribution",
        "Synonyms", "Diagnosis", "Characters", "Characteristics", "Remarks",
        "Other", "locality",
    }

    for y, x, bold, t in body:
        if y >= cutoff:
            add("captions", t)
            continue

        if bold and t in KNOWN_LABELS:
            continue  # labels are used only as anchors

        # ---------- right column ----------
        if x >= RIGHT_MIN_X:
            if y_a1 is not None and abs(y - y_a1) <= 6 and not fields["genus_author"]:
                fields["genus_author"] = clean(t)
                continue
            if y_a2 is not None and abs(y - y_a2) <= 6 and not fields["species_author"]:
                fields["species_author"] = clean(t)
                continue
            if y_dist is not None and y >= y_dist - 4:
                add("distribution", t)
                continue
            add("captions", t)
            continue

        # ---------- left column ----------
        # classification
        if y_cls is not None and y_a1 is not None and y >= y_cls - 4 and y < y_a1:
            add("classification", t)
            continue
        # genus name
        m = re.match(r"^Genus\s+(.+)$", t)
        if m and (y_a1 is None or abs(y - y_a1) <= 10):
            fields["genus"] = clean(m.group(1))
            continue
        # species name: abbreviated "X. epithet" row, on or just above the
        # second Author row (species name token always abbreviates the genus)
        if not species_done and re.match(r"^[A-Z]\.\s", t) and (y_a2 is None or abs(y - y_a2) <= 12):
            fields["species"] = clean(t)
            species_y = y
            species_done = True
            continue
        # species name fallback: plain token exactly on the second Author row
        if not species_done and y_a2 is not None and abs(y - y_a2) <= 2 and not re.match(r"^Genus\s", t):
            fields["species"] = clean(t)
            species_y = y
            species_done = True
            continue
        # species name continuation (same row)
        if species_done and species_y is not None and abs(y - species_y) <= 2:
            add("species", t)
            continue
        # genus etymology near first Etymology label
        if y_ge is not None and abs(y - y_ge) <= 8 and not fields["genus_etymology"]:
            add("genus_etymology", t)
            continue
        # species etymology: from second Etymology label up to the age row
        if y_se is not None and y_dist is not None and y >= y_se - 4 and y < y_dist - 6 and fields["genus_etymology"]:
            add("species_etymology", t)
            continue
        # species author (wrapped, left column, just below Author #2 label)
        if y_a2 is not None and y >= y_a2 and y <= y_a2 + 12 and species_done:
            add("species_author", t)
            continue
        # age value: on the row of the distribution/Main anchor
        if y_dist is not None and y >= y_dist - 6 and y <= y_dist + 4:
            add("age", t)
            continue
        # synonyms: values near the Synonyms label
        if y_syn is not None and y >= y_syn - 30 and y <= y_syn + 10:
            add("synonyms", t)
            continue
        # diagnosis: after synonyms block until remarks
        if y_dia is not None and y_rem is not None and y_syn is not None and y >= y_syn + 8 and y < y_rem - 4:
            add("diagnosis", t)
            continue
        # remarks
        if y_rem is not None and y >= y_rem - 4 and y < cutoff:
            add("remarks", t)
            continue

        add("captions", t)

    # empty-placeholder cleanup
    for k in ("synonyms", "diagnosis", "characters", "remarks", "distribution"):
        if fields[k] in ("/", "/ "):
            fields[k] = ""

    # genus fallback: some pages render the genus row without the "Genus "
    # prefix (e.g. subgenera). Derive it from the species name when missing.
    if not fields["genus"] and species:
        m = re.match(r"^([A-Z][A-Za-z]*(?:\s+\([A-Za-z]+\))?)\s+[a-z]", species)
        if m:
            fields["genus"] = clean(m.group(1))
    if not fields["genus"] and fields["species"]:
        m = re.match(r"^([A-Z][A-Za-z]*(?:\s+\([A-Za-z]+\))?)\s+[a-z]", fields["species"])
        if m:
            fields["genus"] = clean(m.group(1))

    return species, order, fields


def extract_images(page, doc, out_dir, max_dim=1600):
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    names = []
    seen = set()
    idx = 0
    for im in page.get_images(full=True):
        xref = im[0]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            raw = doc.extract_image(xref)
        except Exception:
            continue
        img_bytes = raw["image"]
        if len(img_bytes) < 500:
            continue
        try:
            pil = Image.open(io.BytesIO(img_bytes))
        except Exception:
            continue
        if pil.mode not in ("RGB", "RGBA"):
            pil = pil.convert("RGB")
        w, h = pil.size
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            pil = pil.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        if pil.mode == "RGBA":
            pil = pil.convert("RGB")
        idx += 1
        fname = f"{idx:02d}.webp"
        pil.save(os.path.join(out_dir, fname), "WEBP", quality=82, method=6)
        names.append({"file": fname, "width": w, "height": h})
    return names


def slugify(name):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return s or "species"


def _build_rec(page_no, species, order, fields, base, images):
    return {
        "id": f"t{page_no:04d}",
        "slug": base,
        "page": page_no,
        "order": order or "",
        "scientific_name": species or "",
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
        "characters": fields["characters"],
        "remarks": fields["remarks"],
        "captions": fields["captions"],
        "images": images,
        "cover": f"trilobites/{base}/01.webp" if images else None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default="data/trilobites", help="where to write species.json")
    ap.add_argument("--public", default="public/trilobites", help="where to write images")
    ap.add_argument("--start-page", type=int, default=3)
    ap.add_argument("--max-dim", type=int, default=1600)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    root = os.path.abspath(args.out)
    pub_root = os.path.abspath(args.public)
    os.makedirs(root, exist_ok=True)

    records = []
    used = {}

    for page_idx in range(args.start_page - 1, len(doc)):
        page = doc[page_idx]
        page_no = page_idx + 1
        species, order, fields = parse_page(page)

        base = slugify(species or f"page{page_no:03d}")
        used[base] = used.get(base, 0) + 1
        if used[base] > 1:
            base = f"{base}-{page_no}"

        img_dir = os.path.join(pub_root, base)
        # resume: skip pages whose images were already extracted
        if os.path.isdir(img_dir) and os.listdir(img_dir):
            images = []
            for f in sorted(os.listdir(img_dir)):
                images.append({"file": f"trilobites/{base}/{f}", "width": 0, "height": 0})
            rec = _build_rec(page_no, species, order, fields, base, images)
            records.append(rec)
            continue
        images = extract_images(page, doc, img_dir, max_dim=args.max_dim)

        rec = _build_rec(page_no, species, order, fields, base, images)
        records.append(rec)

    db = {
        "title": "Illustration Guide to Trilobites — Visual Database",
        "version": "1.0",
        "source_pdf": os.path.basename(args.pdf),
        "total_species": len(records),
        "species": records,
    }

    with open(os.path.join(root, "species.json"), "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)

    print(f"Extracted {len(records)} species -> {root}")


if __name__ == "__main__":
    main()

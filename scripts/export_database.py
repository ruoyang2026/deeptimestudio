"""Package the trilobite database into a standalone, distributable bundle.

The database (structured JSON + photos) lives in the repo split across two
locations:
    data/trilobites/species.json       structured text data
    public/trilobites/<slug>/<n>.webp  photographs

This script assembles both into a single self-contained folder that can be
distributed or sold independently:

    <target>/trilobite-database/
        README.txt
        species.json
        images/<slug>/<n>.webp

Usage:
    python scripts/export_database.py --out dist
"""

import argparse
import json
import os
import shutil

DB_REL = os.path.join("data", "trilobites", "species.json")
PUB_REL = os.path.join("public", "trilobites")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repo root (default: cwd)")
    ap.add_argument("--out", default="dist", help="output directory")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    db_path = os.path.join(root, DB_REL)
    if not os.path.exists(db_path):
        raise SystemExit(f"not found: {db_path}")

    db = json.load(open(db_path, encoding="utf-8"))
    bundle = os.path.abspath(os.path.join(args.out, "trilobite-database"))
    images_dir = os.path.join(bundle, "images")
    os.makedirs(images_dir, exist_ok=True)

    # copy photographs, preserving the per-species subfolder
    copied = 0
    missing = 0
    for rec in db["species"]:
        for im in rec.get("images", []):
            rel = im["file"]                      # e.g. trilobites/<slug>/<n>.webp
            src = os.path.join(root, "public", rel)
            parts = rel.split("/")               # ["trilobites", "<slug>", "<n>.webp"]
            if len(parts) >= 3:
                sub = parts[1]
            else:
                sub = rec["slug"]
            dst = os.path.join(images_dir, sub, os.path.basename(rel))
            if os.path.exists(src):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                copied += 1
            else:
                missing += 1

    # rewrite image paths to the bundle layout
    for rec in db["species"]:
        for im in rec.get("images", []):
            rel = im["file"]
            parts = rel.split("/")
            sub = parts[1] if len(parts) >= 3 else rec["slug"]
            im["file"] = f"images/{sub}/{os.path.basename(rel)}"
        if rec.get("cover"):
            rel = rec["cover"]
            parts = rel.split("/")
            sub = parts[1] if len(parts) >= 3 else rec["slug"]
            rec["cover"] = f"images/{sub}/{os.path.basename(rel)}"

    with open(os.path.join(bundle, "species.json"), "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)

    readme = """Trilobite Visual Database
=========================

A structured database of trilobite species compiled from the
"Illustration Guide to Trilobites" visual database.

Contents
--------
species.json   All {total} species as structured JSON (fields below)
images/        {imgs} photographs, one folder per species, WebP format

species.json schema (per species record)
----------------------------------------
id, slug, page, order, scientific_name, classification,
genus, genus_author, genus_etymology,
species, species_author, species_etymology,
age, distribution, synonyms, diagnosis, characters, remarks,
captions, images[], cover

License / attribution
---------------------
The images are compiled for educational and reference purposes. Original
copyrights belong to the respective institutions and collectors. This is a
compiled collection designed to serve as a centralized database for
researchers and enthusiasts.
""".format(total=db.get("total_species"), imgs=copied)

    with open(os.path.join(bundle, "README.txt"), "w", encoding="utf-8") as f:
        f.write(readme)

    print(f"Exported {db.get('total_species')} species, {copied} images -> {bundle}")
    if missing:
        print(f"WARNING: {missing} image references could not be found.")


if __name__ == "__main__":
    main()

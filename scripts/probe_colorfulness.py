#!/usr/bin/env python
"""Compute a colorfulness score for every species photo and store it in
species.json (images[i].colorfulness).

Higher values mean more colorful images (collector photos); values near 0 mean
grayscale images (black-white literature scans). Used as a tie-breaker when
choosing homepage card covers (see docs/cover-selection-rules.md).

Usage: python scripts/probe_colorfulness.py [--species PATH]
"""
import argparse
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image, ImageStat


def colorfulness(path):
    try:
        im = Image.open(path)
    except Exception:
        return None
    im.thumbnail((120, 120))
    r, g, b = ImageStat.Stat(im).mean
    return round(abs(r - g) + abs(g - b) + abs(b - r), 1)


def probe_one(job):
    img_file, path = job
    return img_file, colorfulness(path)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--species", default="data/trilobites/species.json")
    args = ap.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    species_path = os.path.join(root, args.species)

    with open(species_path, encoding="utf-8") as f:
        db = json.load(f)

    jobs = []
    for s in db["species"]:
        for img in s["images"]:
            jobs.append((img["file"], os.path.join(root, "public", img["file"])))

    with ProcessPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(probe_one, jobs))

    by_file = {}
    for s in db["species"]:
        for img in s["images"]:
            by_file[img["file"]] = img

    n = 0
    for img_file, cf in results:
        if cf is not None and img_file in by_file:
            by_file[img_file]["colorfulness"] = cf
            n += 1

    with open(species_path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)
    print(f"colorfulness written for {n} images -> {args.species}")


if __name__ == "__main__":
    main()

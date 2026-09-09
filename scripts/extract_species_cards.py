#!/usr/bin/env python3
"""批量从 PDF 生成网页物种卡片数据 + 精准裁剪化石图（CLI）。

把一批"每物种 2 页"的 PDF（第 1 页字段信息、第 2 页一张嵌入化石图）转成
Deep Time Studio 的物种数据库与卡片封面图：

  public/<collection>/<slug>/01.webp   卡片封面（白边裁剪的化石图）
  data/<collection>/species.json       物种数据库（追加合并，页面卡片+下钻数据源）
  data/<collection>/drillable.json     全部可下钻
  data/<collection>/covers.json        封面覆盖

用法：
  python scripts/extract_species_cards.py \
      --collection amphibians \
      --pdf-dir "D:/.../output_extract" \
      --species-json "D:/.../species_data_pages80_117.json" \
      --id-prefix b \
      --append

参数：
  --collection   归档名（输出到 public/<collection>/ 与 data/<collection>/）
  --pdf-dir      含 species_NN_*.pdf 的目录
  --species-json 物种数据 JSON（含 species[].{id,species,family,...,photo}）
  --id-prefix    记录 id 前缀（避免多批次 key 冲突，如 b 或 c）
  --append       追加到现有 species.json（默认）
  --replace      重建 species.json（清空旧数据）
  --max-dim      图片最长边像素（默认 1600）
  --skip-images  只更新 JSON，不重新提取图片（可选）

说明：
  - PDF 文件名需含 "species_<NN>_" 前缀，NN 对应该物种在 JSON 中的 id
  - 第 2 页嵌入图会做白边裁剪（精准切割）再缩放为 WebP
  - slug 取自学名二名法（去掉作者与 ? 后缀）
"""

import argparse
import json
import os
import re
import unicodedata

import fitz  # PyMuPDF
import numpy as np
from PIL import Image

DEFAULT_MAX_DIM = 1600
DEFAULT_TRIM_THRESHOLD = 245  # pixels brighter than this are treated as blank margin


# ---------------------------------------------------------------- slug & crop
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


def trim_white_margins(img, threshold=DEFAULT_TRIM_THRESHOLD):
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


# ---------------------------------------------------------------- extraction
def find_pdf(pdf_dir, sp_id):
    """按 id 前缀在目录中找 PDF 文件。"""
    for f in os.listdir(pdf_dir):
        if f.lower().endswith(".pdf") and re.match(rf"species_{int(sp_id):02d}_", f):
            return f
    return None


def extract_species_images(species_list, pdf_dir, collection, public_dir, max_dim):
    """从每个物种 PDF 提取并精准裁剪化石图，返回 slug -> image meta。"""
    results = {}
    for sp in species_list:
        sp_id = sp["id"]
        photo = sp.get("photo") or {}
        caption = (photo.get("caption") or "") if photo else ""
        pdf_file = find_pdf(pdf_dir, sp_id)
        if not pdf_file:
            print(f"  [skip] id={sp_id} {sp['species']} — no pdf in {pdf_dir}")
            continue
        slug = slugify(sp["species"])
        doc = fitz.open(os.path.join(pdf_dir, pdf_file))
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
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        out_dir = os.path.join(public_dir, collection, slug)
        os.makedirs(out_dir, exist_ok=True)
        fname = "01.webp"
        img.save(os.path.join(out_dir, fname), "WEBP", quality=84, method=6)
        results[slug] = {
            "file": f"{collection}/{slug}/{fname}",
            "width": img.width,
            "height": img.height,
            "caption": caption,
        }
        print(f"  [ok] id={sp_id} {pdf_file} -> {collection}/{slug}/{fname} {img.size} (src {pix.width}x{pix.height})")
    return results


# ---------------------------------------------------------------- db build
def build_species_db(species_list, images, id_prefix):
    """Build species records from species_data JSON + images."""
    records = []
    for sp in species_list:
        slug = slugify(sp["species"])
        img = images.get(slug)
        if not img:
            continue
        photo = sp.get("photo") or {}
        records.append({
            "id": f"{id_prefix}{sp['id']:03d}",
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


def _load_existing(db_path):
    if os.path.isfile(db_path):
        with open(db_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("species", [])
    return []


def _save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- main
def main():
    parser = argparse.ArgumentParser(
        prog="extract_species_cards.py",
        description="批量从 PDF 生成物种卡片数据 + 精准裁剪化石图",
    )
    parser.add_argument("--collection", required=True, help="归档名（输出到 public/<c>/ 与 data/<c>/）")
    parser.add_argument("--pdf-dir", required=True, help="含 species_NN_*.pdf 的目录")
    parser.add_argument("--species-json", required=True, help="物种数据 JSON 路径")
    parser.add_argument("--id-prefix", default="a", help="记录 id 前缀（避免批次冲突，如 b/c）")
    parser.add_argument("--append", action="store_true", help="追加到现有 species.json（默认）")
    parser.add_argument("--replace", action="store_true", help="重建 species.json（清空旧数据）")
    parser.add_argument("--max-dim", type=int, default=DEFAULT_MAX_DIM, help="图片最长边像素")
    parser.add_argument("--skip-images", action="store_true", help="只更新 JSON，不重新提取图片")
    parser.add_argument("--title", default=None, help="species.json title（可选）")
    parser.add_argument("--source", default=None, help="species.json source 说明（可选）")
    args = parser.parse_args()

    # 项目根目录 = 脚本上一级
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(project_root, "public")
    data_dir = os.path.join(project_root, "data", args.collection)

    with open(args.species_json, encoding="utf-8") as f:
        data = json.load(f)
    species_list = data["species"]
    print(f"Species in JSON: {len(species_list)}")

    if args.skip_images:
        images = {}
    else:
        images = extract_species_images(
            species_list, args.pdf_dir, args.collection, public_dir, args.max_dim
        )
        print(f"Images extracted: {len(images)}")

    new_records = build_species_db(species_list, images, args.id_prefix)
    print(f"New records built: {len(new_records)}")

    species_path = os.path.join(data_dir, "species.json")
    if args.replace:
        merged = list(new_records)
    else:
        existing = _load_existing(species_path)
        existing_slugs = {r["slug"] for r in existing}
        merged = list(existing)
        for rec in new_records:
            if rec["slug"] not in existing_slugs:
                merged.append(rec)
                existing_slugs.add(rec["slug"])

    db = {
        "title": args.title or f"{args.collection} — Species Database",
        "version": "1.1",
        "source": args.source or "",
        "total_species": len(merged),
        "species": merged,
    }
    _save_json(species_path, db)
    print(f"species.json total: {len(merged)} -> {species_path}")

    # drillable: all species are unlocked
    drillable = {"note": "All species are unlocked (drillable).", "total": len(merged),
                 "slugs": [r["slug"] for r in merged]}
    _save_json(os.path.join(data_dir, "drillable.json"), drillable)

    # covers: first image wins
    covers = {"note": "Species covers.", "covers": {r["slug"]: "01.webp" for r in merged}}
    _save_json(os.path.join(data_dir, "covers.json"), covers)
    print(f"drillable + covers updated: {len(merged)} species")


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""自定义 Amphibian 封面裁剪（精准切割 / 旋转 / 局部彩图）。

针对个别物种的 PDF 图做定制封面：
  - jeholotriton-paradoxus : 追加第 3 页图 + 封面切到它
  - urumqia-liudaowanensis : 裁彩色横照并旋转 90° 成竖版封面
  - pangerpeton-sinensis   : 裁左半彩图做封面
  - procynops-miocenicus   : 按内容密度精准切割生物主体做封面

输出:
  public/amphibians/<slug>/02.webp
  并更新 data/amphibians/covers.json（4 个 slug -> 02.webp）
  以及 jeholotriton 的 species.json images 追加 02.webp

用法:
  python scripts/optimize_amphibian_covers.py [--apply-data]

依赖: pip install pymupdf numpy pillow
"""

import argparse
import json
import os
import sys

import fitz
import numpy as np
from PIL import Image

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = r"D:\fossil\三叶虫\chinese_book_project\output_extract"
PUBLIC = os.path.join(PROJECT, "public", "amphibians")
DATA = os.path.join(PROJECT, "data", "amphibians")
MAX_DIM = 1600

# 每个物种: (pdf 文件名, 提取页序号[0-based], slug, 处理方式, 可选 pdf_dir)
JOBS = {
    "jeholotriton-paradoxus": {
        "pdf": "species_10_Jeholotriton_paradoxus_Wang_2000.pdf",
        "page": 2,  # 第 3 页
        "mode": "full",
    },
    "urumqia-liudaowanensis": {
        "pdf": "species_15_Urumqia_liudaowanensis_Zhang_Li_et_Wang_1984.pdf",
        "page": 1,  # 第 2 页
        "mode": "color_rotate",
    },
    "pangerpeton-sinensis": {
        "pdf": "species_11_Pangerpeton_sinensis_Wang_et_Evans_2006.pdf",
        "page": 1,
        "mode": "left_color",
    },
    "procynops-miocenicus": {
        "pdf": "species_07_Procynops_miocenicus_Young_1965.pdf",
        "page": 1,
        "mode": "body_density",
    },
    # output3 批次（新 5 种，temnospondyls）
    "gobiops-desertus": {
        "pdf": "species_01_Gobiops_desertus_Shishkin_1991.pdf",
        "page": 1, "mode": "body_density",
        "pdf_dir": r"D:\fossil\三叶虫\chinese_book_project\output_extract\output3",
    },
    "sinobrachyops-placenticephalus": {
        "pdf": "species_02_Sinobrachyops_placenticephalus_Dong_1985.pdf",
        "page": 2, "mode": "full",  # 第 3 页图更有内容
        "pdf_dir": r"D:\fossil\三叶虫\chinese_book_project\output_extract\output3",
    },
    "anakamacops-petrolicus": {
        "pdf": "species_03_Anakamacops_petrolicus_Li_et_Cheng_1999.pdf",
        "page": 2, "mode": "full",  # 第 3 页图有彩
        "pdf_dir": r"D:\fossil\三叶虫\chinese_book_project\output_extract\output3",
    },
    "yuanansuchus-laticeps": {
        "pdf": "species_04_Yuanansuchus_laticeps_Liu_et_Wang_2005.pdf",
        "page": 2, "mode": "full",  # 第 3 页图有彩
        "pdf_dir": r"D:\fossil\三叶虫\chinese_book_project\output_extract\output3",
    },
    "parotosuchus-turfanensis": {
        "pdf": "species_05_Parotosuchus_turfanensis_Young_1966_Wang_Zhang_et_Sun_2008.pdf",
        "page": 2, "mode": "body_density",  # 图几乎空白，精准切割
        "pdf_dir": r"D:\fossil\三叶虫\chinese_book_project\output_extract\output3",
    },
}


def extract_page_img(pdf_path, page_idx):
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    ims = page.get_images(full=True)
    if not ims:
        raise RuntimeError(f"no image on page {page_idx + 1} of {pdf_path}")
    xref = ims[0][0]
    pix = fitz.Pixmap(doc, xref)
    if pix.n > 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def trim_white(img, threshold=245, pad=4):
    a = np.asarray(img.convert("RGB")).astype(int)
    nonwhite = a.sum(axis=2) < threshold * 3
    rows = np.where(nonwhite.any(axis=1))[0]
    if rows.size == 0:
        return img
    cols = np.where(nonwhite.any(axis=0))[0]
    box = (max(0, cols[0] - pad), max(0, rows[0] - pad),
           min(img.width, cols[-1] + pad + 1), min(img.height, rows[-1] + pad + 1))
    return img.crop(box)


def colorful_bbox(img, sat_thresh=40):
    a = np.asarray(img.convert("RGB")).astype(int)
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = mx - mn
    mask = (sat > sat_thresh) & (a.mean(axis=2) < 245)
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    if rows.size == 0 or cols.size == 0:
        return None
    return (int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1]))


def body_bbox(img, ink_thresh=730, frac=0.02, pad=10):
    """按内容密度找主体区域（排除稀疏标注/边框）。"""
    a = np.asarray(img.convert("RGB")).astype(int)
    mask = a.sum(axis=2) < ink_thresh
    colsum = mask.sum(axis=0)
    thr = colsum.max() * frac
    body_cols = np.where(colsum > thr)[0]
    if body_cols.size == 0:
        return (0, 0, img.width, img.height)
    x0, x1 = int(body_cols[0]), int(body_cols[-1])
    submask = mask[:, x0:x1 + 1]
    rowsum = submask.sum(axis=1)
    rthr = rowsum.max() * frac
    body_rows = np.where(rowsum > rthr)[0]
    if body_rows.size == 0:
        return (x0, 0, x1, img.height)
    y0, y1 = int(body_rows[0]), int(body_rows[-1])
    return (max(0, x0 - pad), max(0, y0 - pad),
            min(img.width, x1 + pad), min(img.height, y1 + pad))


def save_webp(img, slug, fname):
    w, h = img.size
    if max(w, h) > MAX_DIM:
        sc = MAX_DIM / float(max(w, h))
        img = img.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    out_dir = os.path.join(PUBLIC, slug)
    os.makedirs(out_dir, exist_ok=True)
    img.save(os.path.join(out_dir, fname), "WEBP", quality=84, method=6)
    return f"{slug}/{fname}"


def save_cover(img, slug):
    """封面专用图（不影响详情页 images[]）。"""
    return save_webp(img, slug, "cover.webp")


def process(slug, job):
    pdf_dir = job.get("pdf_dir", PDF_DIR)
    img = extract_page_img(os.path.join(pdf_dir, job["pdf"]), job["page"])
    mode = job["mode"]

    if mode == "full":
        out = trim_white(img)
    elif mode == "color_rotate":
        bb = colorful_bbox(img)
        if not bb:
            raise RuntimeError(f"{slug}: no colorful region")
        crop = img.crop(bb)
        out = trim_white(crop.transpose(Image.ROTATE_90))
    elif mode == "left_color":
        bb = colorful_bbox(img)
        if not bb:
            raise RuntimeError(f"{slug}: no colorful region")
        crop = img.crop(bb)
        out = trim_white(crop)
    elif mode == "body_density":
        bb = body_bbox(img)
        crop = img.crop(bb)
        out = trim_white(crop)
    else:
        raise ValueError(f"unknown mode {mode}")

    rel = save_cover(out, slug)
    print(f"  [ok] {slug}/cover.webp -> {rel} {out.size}")
    return rel


def main():
    ap = argparse.ArgumentParser(prog="optimize_amphibian_covers.py")
    ap.add_argument("--apply-data", action="store_true",
                    help="更新 covers.json（默认只生成图片）")
    args = ap.parse_args()

    for slug, job in JOBS.items():
        try:
            process(slug, job)
        except Exception as e:
            print(f"  [fail] {slug}: {e}")

    if args.apply_data:
        # covers.json -> cover.webp（封面专用，不影响详情页 images[]）
        covers_path = os.path.join(DATA, "covers.json")
        covers = json.load(open(covers_path, encoding="utf-8"))
        for slug in JOBS:
            covers["covers"][slug] = "cover.webp"
        json.dump(covers, open(covers_path, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("covers.json updated -> cover.webp")


if __name__ == "__main__":
    main()
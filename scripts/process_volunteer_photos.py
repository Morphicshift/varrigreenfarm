#!/usr/bin/env python3
"""Volunteer photo pipeline for the Varri Green Farm site.

- Every image in photos/volunteers/upload/ is resized into
  large/ (1600px long edge) and thumbs/ (400px square, center crop),
  saved as JPEG q80 with all EXIF/GPS metadata removed, then the upload
  file is deleted (originals are not kept in the repo).
- large/ is the source of truth: a thumb with no matching large file is
  removed (so deleting just the large file deletes the photo); a large
  file with no thumb gets its thumb rebuilt.
- photos/volunteers/list.json is regenerated (sorted array of file names).

Usage: python3 scripts/process_volunteer_photos.py [--src DIR] [--keep-src]
"""
import argparse, json, os, re, sys
from PIL import Image, ImageOps

try:  # optional: iPhone HEIC uploads
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "photos", "volunteers")
UPLOAD, THUMBS, LARGE = (os.path.join(BASE, d) for d in ("upload", "thumbs", "large"))
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tif", ".tiff")
LARGE_EDGE, THUMB_EDGE, QUALITY = 1600, 400, 80


def clean_name(fn):
    stem = os.path.splitext(os.path.basename(fn))[0].lower()
    stem = re.sub(r"[^a-z0-9_-]+", "-", stem).strip("-_") or "photo"
    return stem


def unique(stem):
    name, i = stem + ".jpg", 2
    while os.path.exists(os.path.join(LARGE, name)):
        name, i = f"{stem}-{i}.jpg", i + 1
    return name


def load_rgb(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)  # apply camera rotation before stripping EXIF
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    return im.convert("RGB")


def save(im, path):
    # Fresh save with no exif/icc/xmp args -> no metadata carried over.
    im.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def make_thumb(im, path):
    save(ImageOps.fit(im, (THUMB_EDGE, THUMB_EDGE), Image.LANCZOS, centering=(0.5, 0.4)), path)


def process(src, name):
    im = load_rgb(src)
    big = im.copy()
    big.thumbnail((LARGE_EDGE, LARGE_EDGE), Image.LANCZOS)
    save(big, os.path.join(LARGE, name))
    make_thumb(im, os.path.join(THUMBS, name))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=UPLOAD)
    ap.add_argument("--keep-src", action="store_true")
    a = ap.parse_args()
    for d in (THUMBS, LARGE, UPLOAD):
        os.makedirs(d, exist_ok=True)
    added = 0
    for fn in sorted(os.listdir(a.src)):
        p = os.path.join(a.src, fn)
        if not os.path.isfile(p) or not fn.lower().endswith(EXTS):
            continue
        name = unique(clean_name(fn))
        try:
            process(p, name)
            added += 1
        except Exception as e:
            print(f"SKIP {fn}: {e}", file=sys.stderr)
            continue
        if not a.keep_src:
            os.remove(p)
    larges = {f for f in os.listdir(LARGE) if f.lower().endswith(".jpg")}
    removed = 0
    for f in os.listdir(THUMBS):
        if f not in larges:
            os.remove(os.path.join(THUMBS, f)); removed += 1
    rebuilt = 0
    for f in larges:
        if not os.path.exists(os.path.join(THUMBS, f)):
            make_thumb(load_rgb(os.path.join(LARGE, f)), os.path.join(THUMBS, f)); rebuilt += 1
    names = sorted(larges)
    with open(os.path.join(BASE, "list.json"), "w") as fh:
        json.dump(names, fh, separators=(",", ":"))
        fh.write("\n")
    print(f"added={added} orphan_thumbs_removed={removed} thumbs_rebuilt={rebuilt} total={len(names)}")


if __name__ == "__main__":
    main()

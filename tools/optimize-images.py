#!/usr/bin/env python3
"""Make web-ready photos from assets-src/photos/ into assets/img/.

    pip install pillow
    python3 tools/optimize-images.py      (brand icons and og-image: tools/brand-assets.py)

- assets-src/photos/<name>.jpg → assets/img/<name>-<width>.webp (480/800/1200/1440/1800,
  never wider than the source) + one <name>-800.jpg fallback
"""
import json
import os
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "photos"
OUT = ROOT / "assets" / "img"
WIDTHS = [480, 800, 1200, 1440, 1800]


def photos():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for src in sorted(SRC.glob("*.jpg")):
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        widths = [w for w in WIDTHS if w < im.width] + [min(im.width, WIDTHS[-1])]
        widths = sorted(set(widths))
        for w in widths:
            h = round(im.height * w / im.width)
            r = im.resize((w, h), Image.LANCZOS) if w != im.width else im
            r.save(OUT / f"{src.stem}-{w}.webp", quality=78, method=6)
            if w == min(800, widths[-1]):  # one JPEG fallback for browsers without WebP
                r.save(OUT / f"{src.stem}-{w}.jpg", quality=80, optimize=True, progressive=True)
        manifest[src.stem] = {"w": im.width, "h": im.height, "widths": widths}
        print(f"{src.stem}: {widths}")
    (ROOT / "assets-src" / "images.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    photos()

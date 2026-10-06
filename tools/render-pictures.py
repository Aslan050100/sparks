#!/usr/bin/env python3
"""Fill in responsive markup for every <picture data-img="name"> in the HTML pages.

    python3 tools/render-pictures.py

Keeps the alt text and data-* attributes, rewrites <source>/<img> from
assets-src/images.json (written by tools/optimize-images.py). Safe to re-run
after replacing photos.

    <picture data-img="dj" data-sizes="50vw" [data-eager]><img alt="…"></picture>
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "assets-src" / "images.json").read_text())
PAGES = [ROOT / "index.html"]

PICTURE = re.compile(r'<picture data-img="(?P<name>[^"]+)"(?P<attrs>[^>]*)>.*?</picture>', re.S)


def render(m):
    name, attrs = m["name"], m["attrs"]
    img = MANIFEST[name]
    alt = re.search(r'alt="([^"]*)"', m[0])[1]
    sizes = re.search(r'data-sizes="([^"]*)"', attrs)[1]
    eager = "data-eager" in attrs
    widths = img["widths"]
    fallback = min(800, widths[-1])
    srcset = ", ".join(f"assets/img/{name}-{w}.webp {w}w" for w in widths)
    loading = 'fetchpriority="high" decoding="async"' if eager else 'loading="lazy" decoding="async"'
    return (
        f'<picture data-img="{name}"{attrs}>'
        f'<source type="image/webp" srcset="{srcset}" sizes="{sizes}">'
        f'<img src="assets/img/{name}-{fallback}.jpg" width="{img["w"]}" height="{img["h"]}" alt="{alt}" {loading}>'
        f"</picture>"
    )


for page in PAGES:
    html = page.read_text()
    out, n = PICTURE.subn(render, html)
    page.write_text(out)
    print(f"{page.name}: {n} pictures")

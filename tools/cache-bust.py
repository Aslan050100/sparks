#!/usr/bin/env python3
"""Stamp asset URLs in the HTML pages with a content hash (?v=…) so browsers and
hosting caches always pick up a changed CSS/JS/og-image right after a deploy.

    python3 tools/cache-bust.py      (run after editing css/style.css, js/main.js or og-image.jpg)
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "privacy/index.html", "404.html"]
ASSETS = ["css/style.css", "js/main.js", "og-image.jpg"]


def version(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


for page in PAGES:
    path = ROOT / page
    html = path.read_text()
    for rel in ASSETS:
        v = version(rel)
        # matches css/style.css, ../css/style.css, /css/style.css and absolute og:image URLs, with or without ?v=
        html = re.sub(rf'((?:\.\./|/|https://[^"]+/)?{re.escape(rel)})(\?v=[0-9a-f]+)?"', rf'\1?v={v}"', html)
    path.write_text(html)
    print(page)

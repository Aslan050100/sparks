#!/usr/bin/env python3
"""Generate optimized web assets into src/static/.

Run once after changing anything in assets-src/:
    pip install pillow fonttools brotli
    DRUK_FONT=/path/to/DrukWideCyr-Bold.otf python3 tools/prepare-assets.py

Outputs:
  fonts/   subset WOFF2 (Latin + Cyrillic + Kazakh + ₸)
  img/     photos in AVIF + WebP at several widths, logo, icons
  og/      Open Graph images 1200x630 for each language
"""
import json
import os
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "src" / "static"
DRUK = os.environ.get("DRUK_FONT")

UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,"
    "U+0400-045F,U+0490-0491,U+0492-0493,U+049A-049B,U+04A2-04A3,U+04AE-04B1,"
    "U+04BA-04BB,U+04D8-04D9,U+04E8-04E9,U+0406,U+0456,"
    "U+2013-2014,U+2018-201E,U+2022,U+2026,U+2039-203A,U+20B8,U+2116,U+2122,U+2192,U+2713"
)


def build_font(src, dest):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "locl"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = TTFont(src)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, dest, opts)
    print("font", dest.relative_to(ROOT), dest.stat().st_size // 1024, "KB")


PHOTO_WIDTHS = [480, 800, 1200]


def build_photos():
    manifest = {}
    out = OUT / "img"
    out.mkdir(parents=True, exist_ok=True)
    for p in sorted((SRC / "photos").glob("*.jpg")):
        im = Image.open(p).convert("RGB")
        widths = [w for w in PHOTO_WIDTHS if w < im.width] + [im.width]
        widths = sorted(set(min(w, 1200) for w in widths))
        for w in widths:
            h = round(im.height * w / im.width)
            r = im.resize((w, h), Image.LANCZOS) if w != im.width else im
            r.save(out / f"{p.stem}-{w}.avif", quality=58, speed=4)
            r.save(out / f"{p.stem}-{w}.webp", quality=80, method=6)
        manifest[p.stem] = {"w": im.width, "h": im.height, "widths": widths}
        print("photo", p.stem, widths)
    return manifest


def build_logo():
    out = OUT / "img"
    logo = Image.open(SRC / "logo" / "sparks-logo.png").convert("RGBA")
    logo = logo.crop(logo.getbbox())
    info = {}
    logo_widths = [240, 360, 480]
    for w in logo_widths:
        h = round(logo.height * w / logo.width)
        r = logo.resize((w, h), Image.LANCZOS)
        r.save(out / f"logo-{w}.webp", quality=84, method=6)
        r.save(out / f"logo-{w}.avif", quality=60)
    info["logo"] = {"w": logo.width, "h": logo.height, "widths": logo_widths}

    # Mark only (top part of the logo, above the wordmark)
    mark = logo.crop((0, 0, logo.width, 640))
    mark = mark.crop(mark.getbbox())
    bg = (11, 9, 8, 255)
    for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (48, "favicon-48.png")):
        canvas = Image.new("RGBA", (size, size), bg)
        pad = int(size * 0.14)
        m = mark.copy()
        m.thumbnail((size - 2 * pad, size - 2 * pad), Image.LANCZOS)
        canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
        canvas.convert("RGB").save(OUT / name if name != "favicon-48.png" else out / name, optimize=True)
    ico = Image.open(out / "favicon-48.png")
    ico.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (out / "favicon-48.png").unlink()
    return info, logo


OG_TEXT = {
    "ru": "Создаём мероприятия,\nкоторые запоминаются",
    "kk": "Есте қалатын\nіс-шаралар жасаймыз",
    "en": "Events people\nremember",
}


def build_og(logo):
    out = OUT / "og"
    out.mkdir(parents=True, exist_ok=True)
    W, H = 1200, 630
    base = Image.new("RGB", (W, H), (11, 9, 8))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-200, -120, 700, 760), fill=(70, 44, 14))
    base = Image.blend(base, glow.filter(ImageFilter.GaussianBlur(160)), 0.9)
    lg = logo.copy()
    lg.thumbnail((360, 440), Image.LANCZOS)
    head_font = DRUK or str(SRC / "fonts" / "Rubik-VariableFont_wght.ttf")
    for lang, text in OG_TEXT.items():
        im = base.copy().convert("RGBA")
        im.alpha_composite(lg, (90, (H - lg.height) // 2))
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype(head_font, 40)
        d.multiline_text((530, 230), text, font=f, fill=(245, 236, 222), spacing=18)
        d.line((530, 380, 610, 380), fill=(201, 150, 80), width=2)
        f2 = ImageFont.truetype(str(SRC / "fonts" / "Rubik-VariableFont_wght.ttf"), 26)
        d.text((530, 404), "SPARKS EVENT AGENCY", font=f2, fill=(199, 201, 200))
        im.convert("RGB").save(out / f"og-{lang}.jpg", quality=86, optimize=True, progressive=True)
        print("og", lang)


def main():
    build_font(SRC / "fonts" / "Rubik-VariableFont_wght.ttf", OUT / "fonts" / "rubik-var.woff2")
    if DRUK:
        build_font(DRUK, OUT / "fonts" / "druk-wide-bold.woff2")
    else:
        print("DRUK_FONT not set: keeping existing druk-wide-bold.woff2")
    manifest = build_photos()
    logo_info, logo = build_logo()
    manifest.update(logo_info)
    build_og(logo)
    # Keep entries owned by tools/concept-art.py (SVG illustrations).
    old = json.loads((ROOT / "src" / "images.json").read_text()) if (ROOT / "src" / "images.json").exists() else {}
    manifest.update({k: v for k, v in old.items() if v.get("svg")})
    (ROOT / "src" / "images.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()

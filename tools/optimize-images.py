#!/usr/bin/env python3
"""Make web-ready images from assets-src/ into assets/img/ and the site root.

    pip install pillow fonttools
    DRUK_FONT=/path/to/DrukWideCyr-Bold.otf python3 tools/optimize-images.py

- assets-src/photos/<name>.jpg → assets/img/<name>-<width>.webp (480/800/1200/1440/1800,
  never wider than the source) + one <name>-800.jpg fallback
- favicon.ico, favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png
- og-image.jpg (1200×630) for Open Graph / social previews
"""
import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "photos"
OUT = ROOT / "assets" / "img"
WIDTHS = [480, 800, 1200, 1440, 1800]
BG = (11, 9, 8)
GOLD = (201, 149, 79)
DRUK = os.environ.get("DRUK_FONT")


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


def font(size):
    return ImageFont.truetype(DRUK, size) if DRUK else ImageFont.load_default(size)


def gold_text(canvas, xy, text, size, anchor="la"):
    """Draw text filled with the brand gold gradient."""
    f = font(size)
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=f, fill=255, anchor=anchor)
    grad = Image.linear_gradient("L").rotate(-60, expand=False).resize(canvas.size)
    gold = Image.merge("RGB", [grad.point(lambda v, a=a, b=b: int(a + (b - a) * v / 255)) for a, b in ((243, 154), (208, 99), (142, 38))])
    canvas.paste(gold, (0, 0), mask)


def icons():
    for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png")):
        im = Image.new("RGB", (size, size), BG)
        gold_text(im, (size // 2, size // 2 + size // 40), "S", int(size * 0.62), anchor="mm")
        ImageDraw.Draw(im).rectangle((size * 0.08, size * 0.08, size * 0.92 - 1, size * 0.92 - 1), outline=GOLD, width=max(1, size // 64))
        im.save(ROOT / name, optimize=True)
    ico = Image.open(ROOT / "favicon-48.png")
    ico.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (ROOT / "favicon-48.png").unlink()

    # SVG favicon: the "S" glyph outline straight from the font, so it needs no web font.
    if DRUK:
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.ttLib import TTFont

        t = TTFont(DRUK)
        gs = t.getGlyphSet()
        glyph = t.getBestCmap()[ord("S")]
        pen = SVGPathPen(gs)
        gs[glyph].draw(pen)
        upm = t["head"].unitsPerEm
        adv = gs[glyph].width
        ascent = t["OS/2"].sCapHeight or int(upm * 0.7)
        pad = upm * 0.18
        box = max(adv, ascent) + 2 * pad
        tx, ty = (box - adv) / 2, (box + ascent) / 2
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box:.0f} {box:.0f}">'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d08e"/><stop offset=".45" stop-color="#c8883f"/><stop offset=".7" stop-color="#e9b464"/><stop offset="1" stop-color="#9a6326"/></linearGradient></defs>'
            f'<rect width="{box:.0f}" height="{box:.0f}" rx="{box * 0.12:.0f}" fill="#0b0908"/>'
            f'<path transform="translate({tx:.0f} {ty:.0f}) scale(1 -1)" fill="url(#g)" d="{pen.getCommands()}"/></svg>\n'
        )
        (ROOT / "favicon.svg").write_text(svg)


def og_image():
    W, H = 1200, 630
    src = ImageOps.exif_transpose(Image.open(SRC / "hero-forum-stage.jpg")).convert("RGB")
    src = ImageOps.fit(src, (W, H), Image.LANCZOS, centering=(0.5, 0.45))
    shade = Image.new("RGB", (W, H), BG)
    mask = Image.linear_gradient("L").rotate(90).resize((W, H)).point(lambda v: int(70 + v * 0.55))
    im = Image.composite(shade, src, mask).filter(ImageFilter.GaussianBlur(0.4))
    gold_text(im, (72, 300), "SENIMEN", 96)
    d = ImageDraw.Draw(im)
    d.line((76, 420, 176, 420), fill=GOLD, width=3)
    body = ImageFont.truetype(str(ROOT / "assets-src" / "Rubik.ttf"), 34) if (ROOT / "assets-src" / "Rubik.ttf").exists() else font(28)
    d.text((76, 446), "Мероприятия под ключ · Астана", font=body, fill=(243, 236, 226))
    im.save(ROOT / "og-image.jpg", quality=84, optimize=True, progressive=True)


if __name__ == "__main__":
    photos()
    icons()
    og_image()

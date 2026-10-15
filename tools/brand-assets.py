#!/usr/bin/env python3
"""Senimen brand assets: the seal mark (SVG + PNG icons) and the Open Graph image.

    pip install pillow fonttools brotli
    python3 tools/brand-assets.py

Seal: Klein-blue round stamp with an italic «S» (Playfair Display Black Italic),
rotated −12°. A black variant is used on blue backgrounds.
"""
import io
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "fonts"
BLACK, BLUE, WHITE, CHROME = "#0A0A0A", "#1F3FD1", "#F5F5F2", "#C9CCD1"


def ttf(name):
    """woff2 → in-memory TTF that Pillow can read."""
    t = TTFont(FONTS / f"{name}.woff2")
    t.flavor = None
    buf = io.BytesIO()
    t.save(buf)
    buf.seek(0)
    return buf


def s_glyph_path(size=200, scale_to=0.62, angle=-12):
    """SVG path data for the italic S, centred in a size×size box and rotated."""
    import math

    font = TTFont(FONTS / "playfair-display-latin-900-italic.woff2")
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord("S")]
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    k = size * scale_to / (y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    # font units → centred, flipped (y down), scaled, rotated about the centre
    # point' = R · (k·(x−cx), −k·(y−cy)) + size/2 ; SVG rotate(angle) with y down = clockwise for +angle
    t = (k * ca, k * sa, k * sa, -k * ca, 0, 0)
    tx = size / 2 - (t[0] * cx + t[2] * cy)
    ty = size / 2 - (t[1] * cx + t[3] * cy)
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (t[0], t[1], t[2], t[3], tx, ty)))
    return pen.getCommands()


def seal_svg(fill, ink):
    d = s_glyph_path()
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Senimen">'
        f'<circle cx="100" cy="100" r="100" fill="{fill}"/>'
        f'<circle cx="100" cy="100" r="88" fill="none" stroke="{ink}" stroke-width="2.5"/>'
        f'<circle cx="100" cy="100" r="81" fill="none" stroke="{ink}" stroke-width="1" opacity=".55"/>'
        f'<path fill="{ink}" d="{d}"/></svg>\n'
    )


def seal_png(size):
    """Raster seal drawn at 4× and downsampled for smooth edges."""
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((0, 0, S - 1, S - 1), fill=BLUE)
    r1, r2 = S * 0.44, S * 0.405
    d.ellipse((S / 2 - r1, S / 2 - r1, S / 2 + r1, S / 2 + r1), outline=WHITE, width=max(2, int(S * 0.0125)))
    if size >= 64:
        d.ellipse((S / 2 - r2, S / 2 - r2, S / 2 + r2, S / 2 + r2), outline=(245, 245, 242, 140), width=max(1, int(S * 0.005)))
    font = ImageFont.truetype(ttf("playfair-display-latin-900-italic"), int(S * 0.78))
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((S / 2, S / 2), "S", font=font, fill=WHITE, anchor="mm")
    layer = layer.rotate(12, resample=Image.BICUBIC, center=(S / 2, S / 2))  # PIL rotates counter-clockwise
    im.alpha_composite(layer)
    return im.resize((size, size), Image.LANCZOS)


def icons():
    for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
        bg = Image.new("RGBA", (size, size), BLACK)
        pad = int(size * 0.08)
        bg.alpha_composite(seal_png(size - 2 * pad), (pad, pad))
        bg.convert("RGB").save(ROOT / name, optimize=True)
    seal_png(48).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


def og_image():
    W, H = 1200, 630
    im = Image.new("RGBA", (W, H), BLACK)
    im.alpha_composite(seal_png(250), (90, (H - 250) // 2))
    d = ImageDraw.Draw(im)
    logo = ImageFont.truetype(ttf("playfair-display-latin-900-normal"), 150)
    x, y = 400, 330
    word = "senimen"
    # tracking −0.04em: draw letter by letter
    for ch in word:
        d.text((x, y), ch, font=logo, fill=WHITE, anchor="ls")
        x += logo.getlength(ch) - 0.04 * 150
    d.text((x, y), ".", font=logo, fill=BLUE, anchor="ls")
    caps = ImageFont.truetype(ttf("ibm-plex-sans-latin-500-normal"), 26)
    caps_cy = ImageFont.truetype(ttf("ibm-plex-sans-cyrillic-500-normal"), 26)

    def spaced(xy, text, font, fill, track=0.22):
        cx, cy = xy
        for ch in text:
            d.text((cx, cy), ch, font=font, fill=fill)
            cx += font.getlength(ch) + track * font.size

    spaced((408, 380), "ВЫ ДОВЕРЯЕТЕ ", caps_cy, CHROME)
    dash_x = 408 + sum(caps_cy.getlength(c) + 0.22 * 26 for c in "ВЫ ДОВЕРЯЕТЕ ")
    spaced((dash_x, 380), "—", caps, CHROME)  # the dash lives in the latin subset
    spaced((408, 424), "МЫ СОЗДАЁМ", caps_cy, CHROME)
    spaced((408, 520), "EVENT AGENCY · ASTANA", caps, "#7C7F85")
    im.convert("RGB").save(ROOT / "og-image.jpg", quality=88, optimize=True, progressive=True)


if __name__ == "__main__":
    (ROOT / "assets" / "img" / "seal.svg").write_text(seal_svg(BLUE, WHITE))
    (ROOT / "assets" / "img" / "seal-black.svg").write_text(seal_svg(BLACK, WHITE))
    (ROOT / "favicon.svg").write_text(seal_svg(BLUE, WHITE))
    icons()
    og_image()
    print("seal.svg, seal-black.svg, favicon.svg/.ico, icons, og-image.jpg")

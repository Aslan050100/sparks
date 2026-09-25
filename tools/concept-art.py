#!/usr/bin/env python3
"""Draw the evening-concept illustrations as gold line-art SVGs (src/static/img/concept-*.svg).

    python3 tools/concept-art.py
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "static" / "img"
W, H = 800, 500


def f(n):
    return f"{n:.1f}".rstrip("0").rstrip(".")


def frame(body, glow=(400, 250), accent=None):
    gx, gy = glow
    accent_glow = ""
    if accent:
        accent_glow = f'<radialGradient id="a" cx="{gx / W:.2f}" cy="{(gy + 120) / H:.2f}" r=".5"><stop offset="0" stop-color="{accent}" stop-opacity=".35"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient>'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="500"><stop offset="0" stop-color="#f6d9a0"/><stop offset=".4" stop-color="#c8883f"/><stop offset=".65" stop-color="#ecbb6c"/><stop offset="1" stop-color="#9a6326"/></linearGradient>
<radialGradient id="glow" cx="{gx / W:.2f}" cy="{gy / H:.2f}" r=".6"><stop offset="0" stop-color="#5a3c16" stop-opacity=".75"/><stop offset=".6" stop-color="#1c140c" stop-opacity=".4"/><stop offset="1" stop-color="#0b0908" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d9a0" stop-opacity=".45"/><stop offset="1" stop-color="#f6d9a0" stop-opacity="0"/></linearGradient>
{accent_glow}
</defs>
<rect width="{W}" height="{H}" fill="#0d0a08"/>
<rect width="{W}" height="{H}" fill="url(#glow)"/>
{'<rect width="800" height="500" fill="url(#a)"/>' if accent else ''}
<g fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
{body}
</g>
</svg>
"""


def sparkle(x, y, r, w=3):
    """Four-point star like the logo."""
    s = r * 0.28
    return f'<path stroke-width="{w}" d="M{f(x)} {f(y - r)} L{f(x + s)} {f(y - s)} L{f(x + r)} {f(y)} L{f(x + s)} {f(y + s)} L{f(x)} {f(y + r)} L{f(x - s)} {f(y + s)} L{f(x - r)} {f(y)} L{f(x - s)} {f(y - s)}Z"/>'


def sparkles(points):
    return "\n".join(sparkle(*p) for p in points)


def awards():
    beams = "".join(
        f'<path stroke="none" fill="url(#beam)" d="M{x} 0 L{x - 30} 0 L{bx - 120} 470 L{bx + 120} 470Z" opacity=".55"/>'
        for x, bx in ((210, 290), (415, 400), (620, 510))
    )
    lamps = "".join(f'<path d="M{x - 28} 18 h56 l-12 22 h-32z"/>' for x in (195, 400, 605))
    cup = """
<path d="M340 150 h120 v40 c0 55 -30 88 -60 92 c-30 -4 -60 -37 -60 -92z"/>
<path d="M340 168 c-40 0 -48 52 -8 64"/><path d="M460 168 c40 0 48 52 8 64"/>
<path d="M400 282 v40"/><path d="M372 322 h56 l10 28 h-76z"/><path d="M350 350 h100 v22 h-100z"/>
<path stroke-width="3" d="M372 196 c6 30 16 48 28 56"/>
"""
    laurel_l = "".join(
        f'<path stroke-width="3" d="M{f(300 - 30 * math.sin(t))} {f(330 - 150 * t / 3)} q-22 -6 -26 -26 q20 4 26 26z"/>'
        for t in (0.4, 0.9, 1.4, 1.9, 2.4)
    )
    laurel_r = "".join(
        f'<path stroke-width="3" d="M{f(500 + 30 * math.sin(t))} {f(330 - 150 * t / 3)} q22 -6 26 -26 q-20 4 -26 26z"/>'
        for t in (0.4, 0.9, 1.4, 1.9, 2.4)
    )
    stems = '<path stroke-width="3" d="M300 330 c-40 -40 -44 -110 -12 -160"/><path stroke-width="3" d="M500 330 c40 -40 44 -110 12 -160"/>'
    stage = '<path d="M60 400 h680"/><path stroke-width="2" opacity=".6" d="M100 430 h600"/><path stroke-width="2" opacity=".35" d="M150 458 h500"/>'
    small = """
<path stroke-width="3" d="M180 318 h56 v18 c0 24 -14 38 -28 40 c-14 -2 -28 -16 -28 -40z"/><path stroke-width="3" d="M208 376 v14 M190 390 h36 v10 h-36z"/>
<path stroke-width="3" d="M564 318 h56 v18 c0 24 -14 38 -28 40 c-14 -2 -28 -16 -28 -40z"/><path stroke-width="3" d="M592 376 v14 M574 390 h36 v10 h-36z"/>
"""
    return frame(beams + lamps + cup + stems + laurel_l + laurel_r + stage + small + sparkles([(400, 110, 18), (130, 150, 10), (680, 120, 12), (560, 230, 8), (250, 220, 7)]), glow=(400, 230))


def casino():
    cx, cy, r = 300, 270, 150
    parts = [f'<circle cx="{cx}" cy="{cy}" r="{r}"/>', f'<circle cx="{cx}" cy="{cy}" r="{r - 18}"/>', f'<circle stroke-width="3" cx="{cx}" cy="{cy}" r="{r - 58}"/>', f'<circle cx="{cx}" cy="{cy}" r="34"/>']
    for i in range(36):
        a = 2 * math.pi * i / 36
        x1, y1 = cx + (r - 18) * math.cos(a), cy + (r - 18) * math.sin(a)
        x2, y2 = cx + (r - 58) * math.cos(a), cy + (r - 58) * math.sin(a)
        parts.append(f'<path stroke-width="{3 if i % 2 else 2}" d="M{f(x1)} {f(y1)} L{f(x2)} {f(y2)}"/>')
        if i % 2 == 0:
            xm, ym = cx + (r - 38) * math.cos(a + math.pi / 36), cy + (r - 38) * math.sin(a + math.pi / 36)
            parts.append(f'<circle stroke="none" fill="url(#g)" opacity=".55" cx="{f(xm)}" cy="{f(ym)}" r="4"/>')
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        parts.append(f'<path stroke-width="3" d="M{f(cx + 34 * math.cos(a))} {f(cy + 34 * math.sin(a))} L{f(cx + 80 * math.cos(a))} {f(cy + 80 * math.sin(a))}"/>')
    parts.append(f'<circle stroke="none" fill="#f6d9a0" cx="{cx + 96}" cy="{cy - 70}" r="9"/>')

    def card(x, y, rot, suit):
        return f'<g transform="rotate({rot} {x + 60} {y + 85})"><rect x="{x}" y="{y}" width="120" height="170" rx="10" fill="#0d0a08"/><rect x="{x + 10}" y="{y + 10}" width="100" height="150" rx="6" stroke-width="2" opacity=".5"/><text x="{x + 18}" y="{y + 40}" fill="url(#g)" stroke="none" font-family="Georgia, serif" font-size="30" font-weight="700">A</text>{suit(x + 60, y + 95)}</g>'

    spade = lambda x, y: f'<path fill="url(#g)" stroke="none" d="M{x} {y - 38} c-8 14 -40 30 -40 54 c0 14 10 22 22 22 c8 0 14 -4 16 -8 l-8 26 h20 l-8 -26 c2 4 8 8 16 8 c12 0 22 -8 22 -22 c0 -24 -32 -40 -40 -54z"/>'
    heart = lambda x, y: f'<path fill="#8f1d1d" stroke="url(#g)" stroke-width="2" d="M{x} {y + 30} c-24 -18 -40 -32 -40 -50 c0 -14 10 -24 22 -24 c8 0 14 4 18 10 c4 -6 10 -10 18 -10 c12 0 22 10 22 24 c0 18 -16 32 -40 50z"/>'
    cards = card(500, 150, -12, spade) + card(640, 150, 10, heart)
    chips = "".join(f'<ellipse cx="560" cy="{420 - i * 14}" rx="46" ry="14" fill="#0d0a08"/>' for i in range(5)) + '<ellipse stroke-width="2" stroke-dasharray="8 10" cx="560" cy="364" rx="34" ry="9"/>'
    chips += "".join(f'<ellipse cx="660" cy="{430 - i * 14}" rx="40" ry="12" fill="#0d0a08"/>' for i in range(3))
    return frame("\n".join(parts) + cards + chips + sparkles([(120, 90, 12), (700, 80, 14), (470, 110, 8)]), glow=(360, 260), accent="#0f5a3a")


def party():
    cx, cy, r = 400, 170, 105
    parts = [f'<path d="M{cx} 0 v{cy - r}"/>', f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#0d0a08"/>']
    for k in range(1, 6):
        y = cy - r + k * 2 * r / 6
        half = math.sqrt(r * r - (y - cy) ** 2)
        parts.append(f'<path stroke-width="2" d="M{f(cx - half)} {f(y)} L{f(cx + half)} {f(y)}"/>')
    for k in range(1, 8):
        rx = r * math.cos(math.pi * k / 8)
        parts.append(f'<ellipse stroke-width="2" cx="{cx}" cy="{cy}" rx="{f(abs(rx))}" ry="{r}"/>')
    for i, a in enumerate(range(200, 345, 18)):
        rad = math.radians(a)
        parts.append(f'<path stroke-width="2" opacity="{0.25 + 0.08 * (i % 3)}" d="M{f(cx + (r + 16) * math.cos(-rad))} {f(cy - (r + 16) * math.sin(-rad))} L{f(cx + 420 * math.cos(-rad))} {f(cy - 420 * math.sin(-rad))}"/>')
    tape = """
<rect x="250" y="330" width="300" height="140" rx="14" fill="#0d0a08"/>
<rect x="276" y="350" width="248" height="62" rx="6" stroke-width="3"/>
<circle cx="335" cy="381" r="20"/><circle cx="465" cy="381" r="20"/>
<circle stroke-width="2" cx="335" cy="381" r="7"/><circle stroke-width="2" cx="465" cy="381" r="7"/>
<path stroke-width="3" d="M362 372 h76 v18 h-76z"/>
<path d="M300 470 l18 -34 h164 l18 34"/>
<circle stroke-width="2" cx="330" cy="452" r="5"/><circle stroke-width="2" cx="470" cy="452" r="5"/>
"""
    notes = '<path stroke-width="3" d="M130 360 v-70 l40 -10 v70"/><circle stroke="none" fill="url(#g)" cx="122" cy="362" r="11"/><circle stroke="none" fill="url(#g)" cx="162" cy="352" r="11"/><path stroke-width="3" d="M660 330 v-66"/><path stroke-width="3" d="M660 264 c10 8 24 10 28 26"/><circle stroke="none" fill="url(#g)" cx="651" cy="332" r="11"/>'
    return frame("\n".join(parts) + tape + notes + sparkles([(210, 120, 14), (600, 110, 12), (120, 230, 8), (690, 220, 9), (560, 280, 7)]), glow=(400, 190), accent="#5b1f6b")


def masquerade():
    carpet = '<path stroke="none" fill="#6d1414" opacity=".75" d="M340 330 L460 330 L700 500 L100 500Z"/><path stroke-width="3" d="M340 330 L100 500 M460 330 L700 500"/>'
    posts = "".join(f'<path stroke-width="3" d="M{x} {y} v{h}"/><circle cx="{x}" cy="{y - 6}" r="6"/>' for x, y, h in ((250, 380, 70), (170, 430, 70), (550, 380, 70), (630, 430, 70)))
    ropes = '<path stroke-width="3" d="M250 395 q-40 40 -80 40"/><path stroke-width="3" d="M550 395 q40 40 80 40"/>'
    mask = """
<path fill="#0d0a08" d="M400 190 c-40 -38 -110 -52 -170 -30 c-26 10 -30 44 -10 76 c26 42 90 62 140 36 c20 -10 30 -26 40 -26 c10 0 20 16 40 26 c50 26 114 6 140 -36 c20 -32 16 -66 -10 -76 c-60 -22 -130 -8 -170 30z"/>
<path d="M258 206 c24 -18 62 -18 86 4 c-20 22 -62 26 -86 -4z"/>
<path d="M542 206 c-24 -18 -62 -18 -86 4 c20 22 62 26 86 -4z"/>
<path stroke-width="2" opacity=".7" d="M232 170 c50 -18 110 -8 150 24 M568 170 c-50 -18 -110 -8 -150 24"/>
<path stroke-width="2" d="M400 214 v26"/>
<path d="M548 164 c30 -60 90 -96 150 -110 c-34 34 -60 80 -76 128"/>
<path stroke-width="2" d="M560 160 c40 -44 84 -70 128 -96 M588 150 l16 -40 M620 132 l6 -44 M652 110 l-6 -34"/>
<path d="M562 176 c50 -30 110 -40 170 -30 c-46 16 -90 40 -128 72"/>
<path stroke-width="2" d="M586 176 l40 -18 M616 180 l40 -12 M650 178 l34 -8"/>
<path d="M300 282 c-10 40 -30 70 -60 90"/>
"""
    return frame(carpet + posts + ropes + mask + sparkles([(130, 90, 12), (400, 80, 16), (700, 280, 10), (100, 250, 8)]), glow=(400, 200), accent="#6d1414")


def gala():
    cx = 400
    chandelier = [f'<path d="M{cx} 0 v60"/>', f'<circle cx="{cx}" cy="70" r="10"/>', f'<path d="M{cx} 80 v40"/>']
    for tier, (y, span, n) in enumerate(((120, 190, 7), (170, 130, 5))):
        chandelier.append(f'<path d="M{cx - span} {y} q{span} {60 - tier * 20} {span * 2} 0"/>')
        for i in range(n):
            x = cx - span + i * 2 * span / (n - 1)
            yy = y + (60 - tier * 20) * 0.5 * (1 - ((x - cx) / span) ** 2) * 1
            chandelier.append(f'<path stroke-width="3" d="M{f(x)} {f(yy)} v-26"/><path stroke-width="3" d="M{f(x - 7)} {f(yy - 26)} h14"/><path fill="url(#g)" stroke="none" d="M{f(x)} {f(yy - 44)} c-6 8 -6 14 0 16 c6 -2 6 -8 0 -16z"/>')
            chandelier.append(f'<path stroke-width="2" d="M{f(x)} {f(yy)} l-5 16 l5 8 l5 -8z"/>')
    chandelier.append(f'<path d="M{cx} 120 v90"/><path d="M{cx - 10} 212 l10 30 l10 -30z"/>')

    def coupe(x, y, tilt):
        return f'<g transform="rotate({tilt} {x} {y + 140})"><path d="M{x - 56} {y} h112 c0 40 -30 58 -56 58 c-26 0 -56 -18 -56 -58z" fill="#0d0a08"/><path stroke="none" fill="url(#g)" opacity=".35" d="M{x - 50} {y + 12} h100 c-4 26 -26 38 -50 38 c-24 0 -46 -12 -50 -38z"/><path d="M{x} {y + 58} v70"/><path d="M{x - 40} {y + 132} q40 -12 80 0"/></g>'

    glasses = coupe(335, 300, -10) + coupe(465, 300, 10)
    bubbles = "".join(f'<circle stroke-width="2" cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in ((400, 270, 5), (412, 246, 4), (392, 228, 3), (406, 206, 3)))
    notes = '<path stroke-width="3" d="M120 330 v-80 l46 -12 v80"/><circle stroke="none" fill="url(#g)" cx="111" cy="332" r="12"/><circle stroke="none" fill="url(#g)" cx="157" cy="320" r="12"/><path stroke-width="3" d="M670 350 v-72"/><path stroke-width="3" d="M670 278 c12 8 26 12 30 30"/><circle stroke="none" fill="url(#g)" cx="660" cy="352" r="12"/>'
    floor = '<path stroke-width="2" opacity=".5" d="M60 470 h680"/>'
    return frame("\n".join(chandelier) + glasses + bubbles + notes + floor + sparkles([(400, 262, 0.1), (250, 280, 10), (560, 250, 12), (90, 120, 9), (720, 130, 11)]), glow=(400, 180))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("awards", awards), ("casino", casino), ("party", party), ("masquerade", masquerade), ("gala", gala)):
        svg = fn()
        (OUT / f"concept-{name}.svg").write_text(svg)
        print(name, len(svg), "bytes")


if __name__ == "__main__":
    main()

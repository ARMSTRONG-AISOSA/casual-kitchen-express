import os, io, json, shutil
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import cairosvg
from PIL import Image

OUT = "/mnt/user-data/outputs/cke-logo-package"
FONTS = "/home/claude/fonts"
RED, YEL, CREAM, CHAR = "#C83F2D", "#F2B544", "#FFF3DF", "#292522"

def load(name, variations):
    blob = hb.Blob.from_file_path(os.path.join(FONTS, name))
    face = hb.Face(blob)
    font = hb.Font(face)
    font.set_variations(variations)
    return face, font

FRAUNCES = load("Fraunces.ttf", {"wght": 700, "opsz": 72, "SOFT": 0, "WONK": 0})
NUNITO = load("Nunito.ttf", {"wght": 800})

def cap_height(face, font, size):
    # measure the height of a capital H
    gid = font.get_nominal_glyph(ord("H"))
    ext = font.get_glyph_extents(gid)
    return ext.y_bearing * size / face.upem

def shape(fontpair, text, size, tracking=0.0):
    face, font = fontpair
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    s = size / face.upem
    x = 0.0
    cmds = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(None)
        tp = TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s))
        font.draw_glyph_with_pen(info.codepoint, tp)
        cmds.append(pen.getCommands())
        x += pos.x_advance * s + tracking
    return " ".join(c for c in cmds if c), x - tracking

def icon_group(c, tx=0.0, ty=0.0, sc=1.0):
    return f'''<g transform="translate({tx:.2f} {ty:.2f}) scale({sc:.4f})">
<g fill="none" stroke="{c['line']}" stroke-width="6" stroke-linecap="round"><path d="M4 108 H24"/><path d="M10 126 H28"/><path d="M4 144 H22"/></g>
<g transform="rotate(7 104 118)">
<path d="M58 102 H150 V132 Q150 156 126 156 H82 Q58 156 58 132 Z" fill="{c['body']}" stroke="{c['stroke']}" stroke-width="5" stroke-linejoin="round"/>
<path d="M62 128 H146" fill="none" stroke="{c['band']}" stroke-width="9" stroke-linecap="round"/>
<path d="M52 102 Q104 72 156 102 Z" fill="{c['lid']}" stroke="{c['stroke']}" stroke-width="5" stroke-linejoin="round"/>
<path d="M58 114 H46 Q40 114 40 120 Q40 126 46 126 H58" fill="none" stroke="{c['stroke']}" stroke-width="5" stroke-linecap="round"/>
<path d="M150 114 H162 Q168 114 168 120 Q168 126 162 126 H150" fill="none" stroke="{c['stroke']}" stroke-width="5" stroke-linecap="round"/>
<g fill="none" stroke="{c['steam']}" stroke-width="5" stroke-linecap="round"><path d="M82 70 Q74 58 84 46"/><path d="M104 66 Q96 52 106 38"/><path d="M126 70 Q118 58 128 46"/></g>
</g></g>'''


def icon_small_group(c, tx=0.0, ty=0.0, sc=1.0):
    return f'''<g transform="translate({tx:.2f} {ty:.2f}) scale({sc:.4f})">
<g transform="rotate(7 100 118)">
<path d="M52 104 H148 V138 Q148 162 124 162 H76 Q52 162 52 138 Z" fill="{c['body']}"/>
<path d="M44 104 Q100 66 156 104 Z" fill="{c['lid']}"/>
<path d="M52 118 H34 M148 118 H166" fill="none" stroke="{c['body']}" stroke-width="12" stroke-linecap="round"/>
<g fill="none" stroke="{c['steam']}" stroke-width="10" stroke-linecap="round"><path d="M80 66 Q70 52 82 38"/><path d="M118 66 Q108 52 120 38"/></g>
</g></g>'''
SMALL = {
    "on-red":   dict(body=CREAM, lid=YEL, steam=CREAM),
    "on-cream": dict(body=RED, lid=CHAR, steam=CHAR),
}

VARIANTS = {
    "cream":    dict(icon=dict(line=CHAR, steam=CHAR, stroke=CHAR, body=RED, lid=YEL, band=YEL),   t1=CHAR,  t2=RED),
    "charcoal": dict(icon=dict(line=CREAM, steam=CREAM, stroke=CREAM, body=RED, lid=YEL, band=YEL), t1=CREAM, t2=YEL),
    "red":      dict(icon=dict(line=CREAM, steam=CREAM, stroke=CHAR, body=CREAM, lid=YEL, band=RED), t1=CREAM, t2=CREAM),
    "yellow":   dict(icon=dict(line=CHAR, steam=CHAR, stroke=CHAR, body=RED, lid=CREAM, band=CREAM), t1=CHAR,  t2=CHAR),
    "mono-charcoal": dict(icon=dict(line=CHAR, steam=CHAR, stroke=CHAR, body=CHAR, lid=CREAM, band=CREAM), t1=CHAR, t2=CHAR),
    "mono-cream-on-red": dict(icon=dict(line=CREAM, steam=CREAM, stroke=CREAM, body=CREAM, lid=RED, band=RED), t1=CREAM, t2=CREAM),
}
BG = {"cream": CREAM, "charcoal": CHAR, "red": RED, "yellow": YEL,
      "mono-charcoal": CREAM, "mono-cream-on-red": RED}

def wrap(body, vb, bg=None, title="Casual Kitchen Express"):
    x, y, w, h = vb
    rect = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.2f} {y:.2f} {w:.2f} {h:.2f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}"><title>{title}</title>{rect}{body}</svg>')

def tight_vb(body, w, h, margin=6, scale=4):
    svg = wrap(body, (0, 0, w, h))
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=int(w * scale), output_height=int(h * scale))
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    bx = im.split()[3].point(lambda a: 255 if a > 8 else 0).getbbox()
    x0, y0, x1, y1 = [v / scale for v in bx]
    return (x0 - margin, y0 - margin, (x1 - x0) + 2 * margin, (y1 - y0) + 2 * margin)

def horizontal(v):
    c = VARIANTS[v]
    name_d, name_w = shape(FRAUNCES, "Casual Kitchen", 64)
    ex_d, ex_w = shape(NUNITO, "EXPRESS", 30, tracking=0.38 * 30)
    capn = cap_height(*FRAUNCES, 64)
    cape = cap_height(*NUNITO, 30)
    gap = 16
    top = 100 - (capn + gap + cape) / 2
    bn = top + capn
    be = bn + gap + cape
    x0 = 232
    body = (icon_group(c["icon"]) +
            f'<path transform="translate({x0} {bn:.2f})" d="{name_d}" fill="{c["t1"]}"/>' +
            f'<path transform="translate({x0 + 1.5} {be:.2f})" d="{ex_d}" fill="{c["t2"]}"/>')
    return body, x0 + max(name_w, ex_w) + 10, 200

def stacked(v):
    c = VARIANTS[v]
    name_d, name_w = shape(FRAUNCES, "Casual Kitchen", 72)
    ex_d, ex_w = shape(NUNITO, "EXPRESS", 34, tracking=0.38 * 34)
    capn = cap_height(*FRAUNCES, 72)
    cape = cap_height(*NUNITO, 34)
    W = max(name_w, 190) + 20
    cx = W / 2
    isz = 190
    bn = isz + 18 + capn
    be = bn + 18 + cape
    body = (icon_group(c["icon"], cx - isz / 2, 0, isz / 200) +
            f'<path transform="translate({cx - name_w / 2:.2f} {bn:.2f})" d="{name_d}" fill="{c["t1"]}"/>' +
            f'<path transform="translate({cx - ex_w / 2:.2f} {be:.2f})" d="{ex_d}" fill="{c["t2"]}"/>')
    return body, W, be + 14

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(text)

def png(svg, path, width):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path, output_width=width)

if os.path.exists(OUT):
    shutil.rmtree(OUT)

# lockups and icons
for v in VARIANTS:
    for kind, fn in (("horizontal", horizontal), ("stacked", stacked)):
        body, w, h = fn(v)
        vb = tight_vb(body, w + 40, h + 40)
        svg = wrap(body, vb)
        write(f"{OUT}/logo/svg/cke-logo-{kind}-{v}.svg", svg)
        png(svg, f"{OUT}/logo/png/cke-logo-{kind}-{v}.png", 1600 if kind == "horizontal" else 1000)
    c = VARIANTS[v]
    body = icon_group(c["icon"])
    vb = tight_vb(body, 200, 200)
    svg = wrap(body, vb, title="Casual Kitchen Express icon")
    write(f"{OUT}/logo/svg/cke-icon-{v}.svg", svg)
    png(svg, f"{OUT}/logo/png/cke-icon-{v}.png", 1024)

# app icon: icon on a full-bleed red square (stores apply their own corner mask)
def square_icon(size_units, icon_frac, bg=RED, colors="red", radius=0, small=False):
    c = SMALL["on-red"] if small else VARIANTS[colors]["icon"]
    gf = icon_small_group if small else icon_group
    tmp = gf(c)
    vb = tight_vb(tmp, 200, 200, margin=0)
    ix, iy, iw, ih = vb
    target = size_units * icon_frac
    s = target / max(iw, ih)
    tx = (size_units - iw * s) / 2 - ix * s
    ty = (size_units - ih * s) / 2 - iy * s
    body = gf(c, tx, ty, s)
    r = f' rx="{radius}"' if radius else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size_units} {size_units}" width="{size_units}" height="{size_units}">'
            f'<title>Casual Kitchen Express app icon</title><rect width="{size_units}" height="{size_units}"{r} fill="{bg}"/>{body}</svg>')

app = square_icon(1024, 0.66)
write(f"{OUT}/app-icon/cke-app-icon.svg", app)
for s in (1024, 512, 192, 180):
    png(app, f"{OUT}/app-icon/cke-app-icon-{s}.png", s)
maskable = square_icon(512, 0.50)
write(f"{OUT}/app-icon/cke-app-icon-maskable.svg", maskable)
png(maskable, f"{OUT}/app-icon/cke-app-icon-maskable-512.png", 512)
rounded = square_icon(1024, 0.66, radius=230)
png(rounded, f"{OUT}/app-icon/cke-app-icon-rounded-preview-1024.png", 1024)

# social profile image (square; platforms crop to a circle)
social = square_icon(1080, 0.58)
png(social, f"{OUT}/social/cke-profile-image-1080.png", 1080)

# favicon: larger icon, rounded square
fav = square_icon(64, 0.86, radius=14, small=True)
write(f"{OUT}/favicon/favicon.svg", fav)
for s in (16, 32, 48):
    png(fav, f"{OUT}/favicon/favicon-{s}.png", s)
ims = [Image.open(f"{OUT}/favicon/favicon-{s}.png").convert("RGBA") for s in (16, 32, 48)]
ims[2].save(f"{OUT}/favicon/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[])
shutil.copy(f"{OUT}/app-icon/cke-app-icon-180.png", f"{OUT}/favicon/apple-touch-icon.png")
for k,c in SMALL.items():
    body = icon_small_group(c)
    vb = tight_vb(body, 200, 200)
    svg = wrap(body, vb, title="Casual Kitchen Express small icon")
    write(f"{OUT}/logo/svg/cke-icon-small-{k}.svg", svg)
    png(svg, f"{OUT}/logo/png/cke-icon-small-{k}.png", 512)
print("built")

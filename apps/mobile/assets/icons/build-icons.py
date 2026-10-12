"""Writes the Vera app icons, Icon Composer documents, and their renders.

    python3 build-icons.py              # every .icon, render-flat.swift, previews/
    python3 build-icons.py --check DIR  # also every iOS appearance at 1024px in DIR/<icon>

The icon is a top-down aloe vera (Vera is named after the plant): two rings
of six curved leaves, like a pinwheel. Light is pale glass leaves on a green
gradient; dark is green leaves on near-black; tinted and clear use gray
leaves, which iOS tints. Vera Dev (the dev variant, app.config.ts) is the
same icon in amber, so the two apps differ at a glance.

Green (`vera`) is the primary icon. Every other color theme has an iOS
alternate icon, `vera-<theme>`, that people pick in Settings. Its colors are
green's, turned to the theme's hue in OKLCH: each gradient keeps green's
OKLab distance between its stops, so every icon changes as much from top to
bottom as green does.
"""

from pathlib import Path
import json
import math
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
ICTOOL = "/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
RENDITIONS = ("Default", "Dark", "ClearLight", "ClearDark", "TintedLight", "TintedDark")
# Settings shows each icon at 58pt, in the app's light or dark appearance.
PREVIEW_SIZE = 180
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
# Aloe green, for checking the tinted renditions (ictool's hue scale is not HSB).
TINT_HUE = .47

DARK_BACKGROUND = ("#313131", "#141414")

# (count, length, width, first leaf angle) per ring, outermost first. The
# inner ring sits between the outer ring's leaves.
RINGS = ((6, 372, 120, -90), (6, 268, 106, -60))
# Leaf fills per ring as (alternate leaf a, alternate leaf b). Neighbors
# differ slightly so overlapping leaves read as separate leaves.
TINTED = (("#b0b0b0", "#9c9c9c"), ("#ffffff", "#e6e6e6"))
# Per icon: the light background, and the light and dark leaf fills.
GREEN = {
    "background": ("#a6e57f", "#2f9e5a"),
    "light": (("#e4f7d8", "#cfeac0"), ("#ffffff", "#eef7e8")),
    "dark": ((("#3fae62", "#237a45"), ("#389c58", "#1f6d3e")),
             (("#8bd77a", "#4fb565"), ("#7cc56c", "#46a35b"))),
}
ICONS = {
    "vera": GREEN,
    "vera-dev": {
        "background": ("#ffcf70", "#ec8a1e"),
        "light": (("#fdeed6", "#f7dfba"), ("#ffffff", "#fff4e4")),
        "dark": ((("#e9962f", "#b0611a"), ("#d98928", "#a05716")),
                 (("#ffcb6b", "#f0a03c"), ("#f2bd5f", "#e39234"))),
    },
}
# The alternate icons: each color theme's hue (its light accent's, in
# OKLCH degrees) and which way the lighter top stop turns. Green's top turns
# toward yellow; the others turn toward their own lighter neighbor.
THEME_HUES = {
    "blue": (257.4, 1),     # top toward cyan
    "teal": (184.7, 1),     # top toward green
    "indigo": (277.0, 1),   # top toward blue
    "purple": (293.0, -1),  # top toward magenta
    "pink": (0.6, -1),      # top toward coral
    "orange": (41.1, -1),   # top toward amber
}
# Graphite is green with the hue taken out, leaving a faint cool gray.
GRAPHITE = (257.4, .012)
BEND = .3


def f(x):
    return f"{x:.1f}"


def poly(points):
    return "M " + " L ".join(f"{f(x)} {f(y)}" for x, y in points) + " Z"


def half_width(t, width):
    """An almond profile: narrow base, widest near a third, pointed tip."""
    def raw(u):
        return (u + .1) ** .6 * (1 - u) ** .95
    return width / 2 * raw(t) / max(raw(i / 200) for i in range(201))


def leaf(angle, length, width, cx=512, cy=512, n=64):
    """A leaf from the center at `angle` degrees, curving clockwise."""
    a = math.radians(angle)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        x = cx + ux * length * t + nx * BEND * length * t * t
        y = cy + uy * length * t + ny * BEND * length * t * t
        dx, dy = ux + nx * 2 * BEND * t, uy + ny * 2 * BEND * t
        d = math.hypot(dx, dy)
        px, py = -dy / d, dx / d
        h = half_width(t, width)
        left.append((x + px * h, y + py * h))
        right.append((x - px * h, y - py * h))
    # Round the base off behind the center.
    h0 = half_width(0, width)
    base = [(cx - nx * h0 * math.cos(math.pi * k / 12) - ux * .6 * h0 * math.sin(math.pi * k / 12),
             cy - ny * h0 * math.cos(math.pi * k / 12) - uy * .6 * h0 * math.sin(math.pi * k / 12))
            for k in range(1, 12)]
    return poly(left + right[::-1] + base)


def svg(paths):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
        + "".join(f'<path fill="#ffffff" d="{d}"/>' for d in paths) + "</svg>\n"
    )


def rgb(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))


def color(h):
    return "extended-srgb:" + ",".join(f"{x:.5f}" for x in (*rgb(h), 1))


def hex_color(rgb_):
    return "#" + "".join(f"{round(min(1, max(0, c)) * 255):02x}" for c in rgb_)


# OKLCH (https://bottosson.github.io/posts/oklab/), for turning green's
# colors to another hue without changing how light they look.
def oklab(h):
    def linear(c):
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    r, g, b = (linear(c) for c in rgb(h))
    l, m, s = (x ** (1 / 3) for x in (
        .4122214708 * r + .5363325363 * g + .0514459929 * b,
        .2119034982 * r + .6806995451 * g + .1073969566 * b,
        .0883024619 * r + .2817188376 * g + .6299787005 * b,
    ))
    return (.2104542553 * l + .7936177850 * m - .0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + .4505937099 * s,
            .0259040371 * l + .7827717662 * m - .8086757660 * s)


def oklch(h):
    lightness, a, b = oklab(h)
    return lightness, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def linear_rgb(lightness, chroma, hue):
    a, b = chroma * math.cos(math.radians(hue)), chroma * math.sin(math.radians(hue))
    l, m, s = ((lightness + x * a + y * b) ** 3 for x, y in (
        (.3963377774, .2158037573), (-.1055613458, -.0638541728), (-.0894841775, -1.2914855480)))
    return (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
            -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)


def max_chroma(lightness, hue):
    """The most chroma sRGB can show at this lightness and hue."""
    low, high = 0, .4
    for _ in range(40):
        mid = (low + high) / 2
        if all(-1e-4 <= c <= 1 + 1e-4 for c in linear_rgb(lightness, mid, hue)):
            low = mid
        else:
            high = mid
    return low


def from_oklch(lightness, chroma, hue):
    def encode(c):
        c = min(1, max(0, c))
        return 12.92 * c if c <= .0031308 else 1.055 * c ** (1 / 2.4) - .055
    chroma = min(chroma, max_chroma(lightness, hue))
    return hex_color(encode(c) for c in linear_rgb(lightness, chroma, hue))


GREEN_HUE = oklch(GREEN["background"][1])[2]


def turn(h, hue, sign):
    """A green color at `hue`, as saturated for that hue as it was for green."""
    lightness, chroma, own = oklch(h)
    if chroma < .005:
        return own, h
    offset = sign * (((own - GREEN_HUE + 180) % 360) - 180)
    turned = (hue + offset) % 360
    return turned, from_oklch(lightness, chroma / max_chroma(lightness, own) * max_chroma(lightness, turned), turned)


def turn_gradient(pair, hue, sign):
    """A green gradient at `hue`, with green's OKLab distance between its stops.

    The bottom keeps green's lightness. Light colors of most hues can't be
    as saturated as light green, so the top is found by lightness instead:
    the one that sits as far from the bottom as green's top does.
    """
    top, bottom = pair
    bottom = turn(bottom, hue, sign)[1]
    lightness, chroma, _ = oklch(top)
    top_hue = turn(top, hue, sign)[0]
    distance = math.dist(*map(oklab, pair))
    base = oklch(bottom)[0]
    candidates = (base + (1 - base) * i / 400 for i in range(401))
    tops = (from_oklch(light, min(chroma, .95 * max_chroma(light, top_hue)), top_hue) for light in candidates)
    return min(tops, key=lambda t: abs(math.dist(oklab(t), oklab(bottom)) - distance)), bottom


def theme_icon(hue, sign):
    def solid(h):
        return turn(h, hue, sign)[1]
    return {
        "background": turn_gradient(GREEN["background"], hue, sign),
        "light": tuple(tuple(solid(h) for h in ring) for ring in GREEN["light"]),
        "dark": tuple(tuple(turn_gradient(pair, hue, sign) for pair in ring) for ring in GREEN["dark"]),
    }


def gray_icon(hue, chroma):
    def gray(v):
        return tuple(gray(x) for x in v) if isinstance(v, tuple) else from_oklch(oklch(v)[0], chroma, hue)
    return {key: gray(value) for key, value in GREEN.items()}


ICONS.update({f"vera-{theme}": theme_icon(*turning) for theme, turning in THEME_HUES.items()})
ICONS["vera-graphite"] = gray_icon(*GRAPHITE)


def fill(v):
    return {"linear-gradient": [color(v[0]), color(v[1])]} if isinstance(v, tuple) else {"solid": color(v)}


def layer_names(ring, parity):
    return f"Ring {ring + 1}{'ab'[parity]}", f"ring-{ring + 1}{'ab'[parity]}.svg"


def document(icon):
    groups = []
    for ring in range(len(RINGS)):
        layers = []
        for parity in (0, 1):
            name, image = layer_names(ring, parity)
            layers.append({
                "image-name": image,
                "name": name,
                "glass": True,
                # The light fill must be the unqualified specialization: with
                # a plain "fill", ictool and iOS ignore the dark one.
                "fill-specializations": [
                    {"value": fill(icon["light"][ring][parity])},
                    {"appearance": "dark", "value": fill(icon["dark"][ring][parity])},
                    {"appearance": "tinted", "value": fill(TINTED[ring][parity])},
                ],
            })
        groups.append({
            "name": f"Ring {ring + 1}",
            "layers": layers,
            "shadow": {"kind": "layer-color", "opacity": .5},
            "shadow-specializations": [
                {"appearance": "dark", "value": {"kind": "neutral", "opacity": .5}},
                {"appearance": "tinted", "value": {"kind": "neutral", "opacity": .5}},
            ],
            "specular": True,
            "translucency": {"enabled": True, "value": .1},
        })
    return {
        "fill": fill(icon["background"]),
        "fill-specializations": [
            {"appearance": "dark", "value": fill(DARK_BACKGROUND)},
            {"appearance": "tinted", "value": fill(DARK_BACKGROUND)},
        ],
        # Icon Composer lists groups front to back: the inner ring on top.
        "groups": groups[::-1],
        "supported-platforms": {"squares": "shared"},
    }


def write_bundle(name):
    bundle = ROOT / f"{name}.icon"
    shutil.rmtree(bundle, ignore_errors=True)
    (bundle / "Assets").mkdir(parents=True)
    for ring, (count, length, width, start) in enumerate(RINGS):
        leaves = [leaf(start + 360 * i / count, length, width) for i in range(count)]
        for parity in (0, 1):
            (bundle / "Assets" / layer_names(ring, parity)[1]).write_text(svg(leaves[parity::2]))
    (bundle / "icon.json").write_text(json.dumps(document(ICONS[name]), indent=2) + "\n")
    return bundle


def render(bundle, rendition, output, size):
    args = [
        ICTOOL, str(bundle), "--export-image", "--output-file", str(output),
        "--platform", "iOS", "--rendition", rendition,
        "--width", str(size), "--height", str(size), "--scale", "1",
    ]
    if rendition.startswith("Tinted"):
        args += ["--tint-color", str(TINT_HUE), "--tint-strength", "0.8"]
    subprocess.run(args, check=True, capture_output=True)


def main():
    previews = ROOT / "previews"
    shutil.rmtree(previews, ignore_errors=True)
    previews.mkdir()
    for name in ICONS:
        bundle = write_bundle(name)
        # Android and the fallback icon use only the primary icons.
        if name in ("vera", "vera-dev"):
            subprocess.run(["swift", str(ROOT / "render-flat.swift"), str(ROOT), name], check=True)
        for rendition, appearance in (("Default", "light"), ("Dark", "dark")):
            output = previews / f"{name}-{appearance}.png"
            render(bundle, rendition, output, PREVIEW_SIZE)
            # ictool writes 16-bit Display P3; 8-bit sRGB is a third the size.
            subprocess.run(["sips", "-m", SRGB, str(output), "--out", str(output)], check=True, capture_output=True)
        if "--check" in sys.argv:
            check = Path(sys.argv[sys.argv.index("--check") + 1]) / name
            check.mkdir(parents=True, exist_ok=True)
            for rendition in RENDITIONS:
                render(bundle, rendition, check / f"{rendition}.png", 1024)
                print(name, rendition, flush=True)


if __name__ == "__main__":
    main()

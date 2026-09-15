#!/usr/bin/env python3
"""Generates the PWA icon set into `public/pwa/`.

The icons mirror `public/images/logo/logo-icon.svg` — a brand-500 rounded square
with a white "LO" monogram — because that SVG cannot be used as-is for a home
screen icon: iOS rejects SVG apple-touch-icons, and a maskable icon must bleed to
its edges (the OS applies its own mask), so the artwork's own rounded corners are
exactly wrong there.

Geometry is copied from the SVG: a 32px canvas with a 6px corner radius and 14px
bold text centred in it.

Run from the repo root:

    python3 scripts/generate-pwa-icons.py

Requires Pillow and one of the bold fonts listed in FONT_CANDIDATES.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# --color-brand-500 from src/app/globals.css.
BRAND = (0x46, 0x5F, 0xFF)
WHITE = (255, 255, 255)
MONOGRAM = "LO"

FONT_CANDIDATES = [
    "/usr/share/fonts/urw-base35/NimbusSans-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "public" / "pwa"

# Ratios taken from logo-icon.svg (a 32px box).
CORNER_RADIUS_RATIO = 6 / 32
FONT_SIZE_RATIO = 14 / 32
BASELINE_RATIO = 22 / 32

# Supersampling factor — the corners and the monogram come out smooth.
SCALE = 4


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    raise SystemExit(
        "No bold sans font found. Add one to FONT_CANDIDATES and re-run."
    )


def draw_icon(size: int, corner_radius_ratio: float, opaque: bool) -> Image.Image:
    """One square icon at `size` px, brand background + white monogram."""
    canvas = size * SCALE
    background = BRAND if opaque else (*BRAND, 255)

    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    radius = round(canvas * corner_radius_ratio)
    box = (0, 0, canvas - 1, canvas - 1)
    if radius > 0:
        draw.rounded_rectangle(box, radius=radius, fill=background)
    else:
        draw.rectangle(box, fill=background)

    # The SVG places its text by baseline, so keep that anchoring to stay
    # optically identical to the logo.
    draw.text(
        (canvas / 2, canvas * BASELINE_RATIO),
        MONOGRAM,
        font=load_font(round(canvas * FONT_SIZE_RATIO)),
        fill=WHITE,
        anchor="ms",
    )

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # "any": the artwork's own rounded corners, transparent outside them.
    for size in (192, 512):
        icon = draw_icon(size, CORNER_RADIUS_RATIO, opaque=False)
        icon.save(OUT_DIR / f"icon-{size}.png")

    # "maskable": full bleed. The OS crops it — down to a circle of 80% of the
    # width on Android — and the centred monogram already sits inside that.
    for size in (192, 512):
        icon = draw_icon(size, 0, opaque=True)
        icon.save(OUT_DIR / f"icon-maskable-{size}.png")

    # iOS masks the icon itself and shows the artwork on the home screen, so it
    # wants a full-bleed square with no alpha channel.
    apple = draw_icon(180, 0, opaque=True).convert("RGB")
    apple.save(OUT_DIR / "apple-touch-icon.png")

    for file in sorted(OUT_DIR.glob("*.png")):
        with Image.open(file) as image:
            print(f"{file.relative_to(REPO_ROOT)} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()

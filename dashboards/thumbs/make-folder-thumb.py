"""Build the portal card thumbnail for a client folder: the client's logo, not a screenshot.

    python3 dashboards/thumbs/make-folder-thumb.py <client>

A folder card stands for the client, so it shows the brand mark. The dashboards inside keep their
own screenshot previews (make-thumbs.py). Reads brands/<client>/logo-inverse.png — the dark-surface
variant — because the tile is dark: on the portal's light card, a light tile would dissolve into it.
"""
import sys
from pathlib import Path

from PIL import Image

W, H = 800, 500
LOGO_FRACTION = 0.62       # of the tile width
LOGO_MAX_HEIGHT = 320
TOP = (14, 32, 51)         # the navy the portal already uses behind an empty .miniatura
BOTTOM = (22, 48, 77)

HERE = Path(__file__).resolve().parent
BRANDS = HERE.parent / "brands"


def gradient():
    tile = Image.new("RGB", (W, H))
    pixels = tile.load()
    for y in range(H):
        t = y / (H - 1)
        row = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        for x in range(W):
            pixels[x, y] = row
    return tile


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    client = sys.argv[1]

    logo = Image.open(BRANDS / client / "logo-inverse.png")
    width = int(W * LOGO_FRACTION)
    height = round(logo.height * width / logo.width)
    if height > LOGO_MAX_HEIGHT:
        height = LOGO_MAX_HEIGHT
        width = round(logo.width * height / logo.height)
    logo = logo.resize((width, height), Image.LANCZOS)

    tile = gradient()
    tile.paste(logo, ((W - width) // 2, (H - height) // 2), logo)

    out = HERE / client / f"{client}-folder.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    tile.save(out, optimize=True)
    print(f"{client}: wrote {out.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()

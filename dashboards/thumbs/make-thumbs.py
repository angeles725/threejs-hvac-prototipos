"""Build a client's portal thumbnails from live screenshots.

    python3 dashboards/thumbs/make-thumbs.py <client> <screenshot-dir>

Expects <screenshot-dir>/shot-{energia,mx0a,mx60}.png taken at 1600x1000 against the client's build
(Chrome headless is fine). Writes <client>/{energia,mx0a,mx60}-thumb.png at the portal's 16:10 card
ratio — the previews for the three cards on the folder page.

The folder's OWN card in the portal shows the client logo instead; that tile comes from
make-folder-thumb.py.

Capture note that matters:
  - mx0a: capture the BUILDING tab, not Home. Home shows "0 RTUs" and reads empty.
"""
import sys
from pathlib import Path

from PIL import Image

W, H = 800, 500
HERE = Path(__file__).resolve().parent

# (source file, crop box) — crops keep the header plus the richest part of each view.
SHOTS = {
    "energia": ("shot-energia.png", (0, 0, 1600, 1000)),
    "mx0a": ("shot-mx0a.png", (160, 0, 1440, 800)),
    "mx60": ("shot-mx60.png", (0, 0, 1600, 1000)),
}


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    client, shots_dir = sys.argv[1], Path(sys.argv[2])

    out = HERE / client
    out.mkdir(parents=True, exist_ok=True)

    for name, (src, box) in SHOTS.items():
        image = Image.open(shots_dir / src).convert("RGB").crop(box).resize((W, H), Image.LANCZOS)
        image.save(out / f"{name}-thumb.png", optimize=True)

    print(f"{client}: wrote {', '.join(sorted(SHOTS))}")


if __name__ == "__main__":
    main()

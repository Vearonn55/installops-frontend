#!/usr/bin/env python3
"""Build public/ozerman-mark.png — orange/red symbol only — from public/ozerman-logo.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "ozerman-logo.png"
OUT = ROOT / "public" / "ozerman-mark.png"


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()

    def keep_orange(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
        if a < 8:
            return (0, 0, 0, 0)
        if r > 75 and r > g + 12 and r > b + 8 and (r - b) > 25:
            return (r, g, b, a)
        if r > 110 and g < 95 and b < 90:
            return (r, g, b, a)
        return (0, 0, 0, 0)

    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            px[x, y] = keep_orange(*px[x, y])
            if px[x, y][3] > 0:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)

    if maxx < minx:
        raise SystemExit("no orange pixels found — check ozerman-logo.png")

    pad = 4
    minx = max(0, minx - pad)
    miny = max(0, miny - pad)
    maxx = min(w - 1, maxx + pad)
    maxy = min(h - 1, maxy + pad)

    cropped = im.crop((minx, miny, maxx + 1, maxy + 1))
    cropped.save(OUT, "PNG")
    print(f"Wrote {OUT.relative_to(ROOT)} ({cropped.size[0]}×{cropped.size[1]})")


if __name__ == "__main__":
    main()

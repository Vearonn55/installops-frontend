#!/usr/bin/env python3
"""Post-process login logo: make enclosed letter counters transparent.

The background-removal flood leaves opaque black inside Ö / R / A counters.
Connected components of strict dark pixels that do NOT touch the image border
and are large enough (or in the text bands) get alpha cleared; the umlaut dots
on Ö stay because they sit in the top strip and use smaller area."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PNG_PATH = ROOT / "public" / "ozerman-logo.png"


def main() -> None:
    im = Image.open(PNG_PATH).convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_strict_dark(r: int, g: int, b: int, a: int) -> bool:
        return a > 200 and max(r, g, b) <= 30

    dark = [[False] * h for _ in range(w)]
    for x in range(w):
        for y in range(h):
            dark[x][y] = is_strict_dark(*px[x, y])

    visited = [[False] * h for _ in range(w)]
    punch: list[tuple[int, int]] = []

    top_guard = int(h * 0.18)  # leave Ö umlaut dots opaque

    for x in range(w):
        for y in range(h):
            if not dark[x][y] or visited[x][y]:
                continue
            q = deque([(x, y)])
            visited[x][y] = True
            cells: list[tuple[int, int]] = []
            touches = False
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                if cx == 0 or cy == 0 or cx == w - 1 or cy == h - 1:
                    touches = True
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and dark[nx][ny] and not visited[nx][ny]:
                        visited[nx][ny] = True
                        q.append((nx, ny))
            if touches:
                continue
            xs = [c[0] for c in cells]
            ys = [c[1] for c in cells]
            cy = sum(ys) / len(ys)
            area = len(cells)
            # Large holes (letter counters); smaller holes in text lines below umlaut row
            # (TİCARET counters can be ~200–320px; umlaut dots stay: cy < top_guard and ~280px)
            if area >= 600:
                punch.extend(cells)
            elif cy >= top_guard and area >= 50:
                punch.extend(cells)

    out = im.copy()
    opx = out.load()
    for x, y in punch:
        opx[x, y] = (0, 0, 0, 0)

    out.save(PNG_PATH, "PNG")
    print(f"Updated {PNG_PATH.relative_to(ROOT)} — punched {len(punch)} pixels")


if __name__ == "__main__":
    main()

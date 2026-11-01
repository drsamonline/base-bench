#!/usr/bin/env python3
"""Draw Base Bench's badges as local SVG files.

An offline-first app must not ask an image service to describe itself: a page
that needs the network to say "no network" has already broken its own rule.
These are drawn here, committed to the repo, and referenced by relative path,
so they render on Pages, in the README and from `file://` with no request.

Keep the claims true. If the suite stops printing 91, change the number here
in the same commit.

  python3 tools/badges.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# The app's palette - navy ink, the blue accent, green only for a passing state.
INK = "#0e1930"
CREAM = "#eef3fe"
BLUE = "#1e51c1"
DEEP = "#0b3ea8"
GREEN = "#2f6b46"

BADGES = [
    ("live", "live", "online", DEEP),
    ("tests", "tests", "91 passing", GREEN),
    ("build", "build", "green", GREEN),
    ("licence", "licence", "PolyForm NC 1.0.0", BLUE),
    ("offline", "offline", "no network", INK),
    ("deps", "deps", "0 runtime", INK),
    ("bases", "bases", "2-36", BLUE),
]

CH = 6.6  # approximate advance width at 11px


def badge(label, value, colour):
    lw = int(len(label) * CH) + 16
    vw = int(len(value) * CH) + 16
    total = lw + vw
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="22" role="img" '
        'aria-label="%s: %s">'
        '<title>%s: %s</title>'
        '<linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#fff" stop-opacity=".08"/>'
        '<stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient>'
        '<clipPath id="r"><rect width="%d" height="22" rx="4" fill="#fff"/></clipPath>'
        '<g clip-path="url(#r)">'
        '<rect width="%d" height="22" fill="%s"/>'
        '<rect x="%d" width="%d" height="22" fill="%s"/>'
        '<rect width="%d" height="22" fill="url(#s)"/>'
        "</g>"
        '<g fill="%s" font-family="ui-sans-serif,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" '
        'text-anchor="middle">'
        '<text x="%d" y="15">%s</text>'
        '<text x="%d" y="15">%s</text>'
        "</g></svg>"
    ) % (total, label, value, label, value, total, lw, INK, lw, vw, colour, total,
         CREAM, lw // 2, label, lw + vw // 2, value)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, label, value, colour in BADGES:
        path = os.path.join(OUT, "badge-%s.svg" % name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(badge(label, value, colour))
        print("wrote", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    main()

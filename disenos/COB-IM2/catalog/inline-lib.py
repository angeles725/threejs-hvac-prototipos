#!/usr/bin/env python3
"""Re-inline lib/hvac-catalog.js into cob-im2-catalogo-3d.html.

The viewer is offline/self-contained, so the lib is inlined rather than linked.
That copy silently forked: it carried 13 generators while the lib had 21 (every
pipe fitting missing), and the UI still credited `lib/hvac-catalog.js`. A viewer
that claims to demonstrate a library and actually demonstrates an older fork of
it is worse than one that links nothing -- fixes appear to ship and do not.

Run after any change to lib/hvac-catalog.js.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HTML = os.path.join(ROOT, "cob-im2-catalogo-3d.html")
LIB = os.path.join(ROOT, "lib", "hvac-catalog.js")
END = "})(typeof window !== 'undefined' ? window : globalThis);"
BANNER_HEAD = "/* INLINED VERBATIM from lib/hvac-catalog.js"


def main():
    html = open(HTML, encoding="utf-8").read()
    lib = open(LIB, encoding="utf-8").read()
    if BANNER_HEAD in html:
        start = html.index(BANNER_HEAD)
    else:
        marker = " * hvac-catalog.js — parametric HVAC / piping component generators"
        start = html.rfind("/**", 0, html.index(marker))
    end = html.index(END, start) + len(END)
    banner = (BANNER_HEAD + " — do not hand-edit here.\n"
              "   Regenerate with: python3 catalog/inline-lib.py */\n")
    open(HTML, "w", encoding="utf-8").write(html[:start] + banner + lib + html[end:])
    gens = lib.count("C.") and sorted(set(
        l.split("C.")[1].split(" =")[0] for l in lib.splitlines()
        if l.strip().startswith("C.") and " = " in l))
    print(f"inlined {len(lib)} chars, {len(gens)} generators: {', '.join(gens)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

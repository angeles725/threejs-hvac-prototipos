#!/usr/bin/env python3
"""Normalize and hash the shared slices of the three cinemex menu studies.

Slices (computed per study, then REQUIRED to be identical across a/b/c):
  content : sorted unique visible vocabulary strings from nav labels, group/deck
            labels, table headers, card headings, camera options, layer labels,
            mode buttons and the fullscreen button (es-MX operator vocabulary).
  data    : sorted multiset of all <td> cell texts plus KPI values/subtexts
            (the fake-but-shaped dataset: zone table, RTU meter table, KPIs).
  palette : :root custom properties minus structural width vars and typography.
  type    : sorted unique font-family declaration values.
  grammar : top-level CSS rules (selector{body}, whitespace-normalized) that are
            byte-identical across all three studies (shared component grammar).

Hash = sha256 over the UTF-8 slice text (lines joined with \n, trailing \n).
"""
import hashlib, re, sys
from html.parser import HTMLParser

FILES = {k: f"/home/cristian/prototipos/three.js/disenos/cinemex-hvac-lorawan/runs/menu/studies/study-{k}.html" for k in "abc"}
STRUCT_VARS = {"--rail-w", "--panel-w", "--sidebar-w", "--menu-w", "--dock-w"}

def norm(s):
    return re.sub(r"\s+", " ", s).strip()

class Extract(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []   # (tag, classes)
        self.style = []
        self.in_style = False
        self.buf = {}     # key -> list of texts
        self.cur = []     # open collectors: (key, parts)

    KEYED = [
        # (key, predicate on (tag, classes))
        # group-label/deck-label/vista-label are per-structure chrome, NOT shared vocabulary
        ("content", lambda t, c: "nav-text" in c or t in ("th", "option") or (t == "h3")
            or "full" in c or ("segmented" in " ".join(c))),
        ("data", lambda t, c: t == "td" or "kpi" in c or "kpi-sub" in c or "badge" in c),
    ]

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class", "").split()
        self.stack.append((tag, cls))
        if tag == "style":
            self.in_style = True
        for key, pred in self.KEYED:
            if pred(tag, cls):
                self.cur.append((key, []))
        if tag == "label":  # layer labels
            self.cur.append(("content", []))
        if tag == "button" and "segmented" in (self.stack[-2][1] if len(self.stack) > 1 else []):
            self.cur.append(("content", []))

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False
        if self.stack:
            self.stack.pop()
        # close any collectors opened at this depth (approximation: close one per matching end)
        if self.cur:
            key, parts = self.cur.pop()
            text = norm(" ".join(parts))
            if text:
                self.buf.setdefault(key, []).append(text)

    def handle_data(self, data):
        if self.in_style:
            self.style.append(data)
        for _, parts in self.cur:
            parts.append(data)

def slices(path):
    p = Extract()
    p.feed(open(path, encoding="utf-8").read())
    css = "".join(p.style)
    # palette: :root custom props
    root = re.search(r":root\s*\{(.*?)\}", css, re.S).group(1)
    props = {}
    for m in re.finditer(r"(--[\w-]+)\s*:\s*([^;]+);", root):
        if m.group(1) not in STRUCT_VARS:
            props[m.group(1)] = norm(m.group(2))
    palette = sorted(f"{k}: {v}" for k, v in props.items())
    # type: font-family declarations anywhere in the css
    type_slice = sorted({norm(m.group(1)) for m in re.finditer(r"font-family\s*:\s*([^;}]+)", css)})
    # grammar: top-level rules selector{body}
    flat = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    rules = {}
    depth = 0; i = 0; sel_start = 0
    while i < len(flat):
        ch = flat[i]
        if ch == "{":
            if depth == 0:
                sel = norm(flat[sel_start:i]); body_start = i + 1
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                body = norm(flat[body_start:i])
                if not sel.startswith("@"):
                    rules[sel] = body
                sel_start = i + 1
            if depth < 0:  # unbalanced within @media bodies handled by depth
                depth = 0
        i += 1
    content = sorted(set(p.buf.get("content", [])))
    data = sorted(p.buf.get("data", []))
    return {"content": content, "data": data, "palette": palette, "type": type_slice, "rules": rules}

all_s = {k: slices(v) for k, v in FILES.items()}

def check(name):
    a, b, c = (all_s[k][name] for k in "abc")
    if a == b == c:
        return a
    print(f"MISMATCH in slice '{name}':", file=sys.stderr)
    for k in "abc":
        others = set().union(*(map(tuple, [all_s[o][name] for o in "abc" if o != k])))
        only = [x for x in all_s[k][name] if tuple([x]) not in others and x not in [y for o in "abc" if o != k for y in all_s[o][name]]]
        print(f"  only in {k}: {only[:10]}", file=sys.stderr)
    sys.exit(1)

content = check("content")
data = check("data")
palette = check("palette")
type_slice = check("type")
# grammar: identical selector->body pairs across all three
common = {s: b for s, b in all_s["a"]["rules"].items()
          if all_s["b"]["rules"].get(s) == b and all_s["c"]["rules"].get(s) == b}
grammar = sorted(f"{s} {{ {b} }}" for s, b in common.items())

def h(lines):
    return hashlib.sha256(("\n".join(lines) + "\n").encode()).hexdigest()

print(f"content-lines={len(content)} sha256:{h(content)}")
print(f"data-lines={len(data)} sha256:{h(data)}")
print(f"palette-lines={len(palette)} sha256:{h(palette)}")
print(f"type-lines={len(type_slice)} sha256:{h(type_slice)}")
print(f"grammar-rules={len(grammar)} sha256:{h(grammar)}")

#!/usr/bin/env python3
"""Prove the port schema does what its description claims.

A schema is an instrument. An instrument that lies is worse than a missing one,
because everything downstream inherits its confidence. These cases are the four
shapes 12 found the first draft could not express, plus the ones it could.

Needs `jsonschema`. Run: python3 test-port-schema.py
"""
import json
import os
import sys

import jsonschema

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = json.load(open(os.path.join(HERE, "catalog-manifest.schema.json")))
PORTS = SCHEMA["properties"]["geometry"]["properties"]["ports"]

CASES = [
    ("round port WITHOUT d",                 [{"id": "in", "pos": [0,0,0], "dir": [-1,0,0], "shape": "round", "w": 0.1, "h": 0.1}], False),
    ("round port WITH d",                    [{"id": "in", "pos": [0,0,0], "dir": [-1,0,0], "shape": "round", "d": 0.1143}], True),
    ("rect port WITH w/h",                   [{"id": "b1", "pos": [0,0,0], "dir": [0,0,1], "shape": "rect", "w": 0.5, "h": 0.3}], True),
    ("rect port carrying d instead",         [{"id": "in", "pos": [0,0,0], "dir": [-1,0,0], "shape": "rect", "d": 0.1}], False),
    ("45deg elbow, non-axis-aligned dir",    [{"id": "out", "pos": [0.3,0,0.3], "dir": [0.7071,0,0.7071], "shape": "round", "d": 0.1143}], True),
    ("cross: b1 + b2 port ids",              [{"id": "b1", "pos": [0,0,0.2], "dir": [0,0,1], "shape": "rect", "w": 0.25, "h": 0.2},
                                              {"id": "b2", "pos": [0,0,-0.2], "dir": [0,0,-1], "shape": "rect", "w": 0.25, "h": 0.2}], True),
    ("VAV: round in + rect out, ONE part",   [{"id": "in", "pos": [0,0,0], "dir": [-1,0,0], "shape": "round", "d": 0.254},
                                              {"id": "out", "pos": [0.95,0,0], "dir": [1,0,0], "shape": "rect", "w": 0.3556, "h": 0.254}], True),
    ("neck port id (diffuser family)",       [{"id": "neck", "pos": [0,0.12,0], "dir": [0,1,0], "shape": "round", "d": 0.2032}], True),
    ("slip-fit WITH embed_depth",            [{"id":"in","pos":[0,0,0],"dir":[-1,0,0],"shape":"round","d":0.1143,
                                              "mating":{"contact_type":"slip-fit","embed_depth_m":0.038,"provenance":"INFER"}}], True),
    ("slip-fit WITHOUT embed_depth",         [{"id":"in","pos":[0,0,0],"dir":[-1,0,0],"shape":"round","d":0.1143,
                                              "mating":{"contact_type":"slip-fit"}}], False),
    ("flange CLAIMING an overlap",           [{"id":"in","pos":[0,0,0],"dir":[-1,0,0],"shape":"round","d":0.1143,
                                              "mating":{"contact_type":"flange","embed_depth_m":0.02}}], False),
    ("unknown contact type",                 [{"id":"in","pos":[0,0,0],"dir":[-1,0,0],"shape":"round","d":0.1143,
                                              "mating":{"contact_type":"glued","embed_depth_m":0.01}}], False),
]


def main():
    v = jsonschema.Draft202012Validator(PORTS)
    failures = 0
    for name, instance, expect_valid in CASES:
        valid = not list(v.iter_errors(instance))
        ok = valid == expect_valid
        failures += not ok
        print(f"  {'OK ' if ok else '!! '}{name:<38} "
              f"expect {'valid' if expect_valid else 'INVALID':>7} -> "
              f"{'valid' if valid else 'INVALID'}")
    if failures:
        print(f"\n{failures} case(s) did not behave as specified", file=sys.stderr)
        return 1
    print("\nall port cases behave as specified")
    return 0


if __name__ == "__main__":
    sys.exit(main())

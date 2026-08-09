# Run note — porton-corredizo · materials attempt 1

## Evidence binding (read before running capture-gc here)

`materials-attempt1-grazing.*` and `materials-attempt1-abierto.*` are **EVIDENCE, not superseded
frames**, bound by this documented glob: `materials-attempt1-{grazing,abierto}.*`.

- `grazing` satisfies the LOOK-DEV requirement of GATES.md §Capture for a materials pass.
- `abierto` satisfies the KINEMATIC requirement: this asset declares an `animation` channel, so it
  owes captures at >= 2 states. It is also the ONLY capture in which the 50% counterbalance rule is
  legible — the hero camera is framed on the leaf and cuts the parked leaf off in the open state.

`capture-gc.mjs` reads the suffix and cannot see either binding; it will offer to prune both. Do not
apply it blindly.

## Census

- promoted: `materials-attempt1.review.json` -> `porton-corredizo.review.json`
- pruned: `materials-attempt1.png` + `.console.json` (byte twins of the canonical pair)
- kept: `porton-corredizo.{png,console.json,review.json}` (canonical witness) ·
  `materials-attempt1-{grazing,abierto}.*` · every review JSON

## What the pre-look caught, before the review was written

Two defects that every mechanical check passed:

1. **The camera was on the FENCE side.** The fence stood between the eye and the counterbalance —
   the one thing the tail is meant to be seen against. Moved to the approach (road) side, and the key
   and frontal fill moved with it, or the whole subject would have been backlit.
2. **The framing criterion was wrong, not just the numbers.** Maximising the subject's bbox rectangle
   in NDC rewards a steep DIAGONAL: a long thin subject seen end-on has a huge bbox and a thin real
   footprint. The first framing scored 61% "occupancy" and read as a fence receding to the horizon.
   The search now forces a near-perpendicular azimuth and an explicitly centred result, and reports
   41% honestly. **A framing check can be green and still be measuring the wrong thing** — same
   family as the instrument-first rule in GATES.md.

## Deviation

The reviewer is the orchestrator INLINE, not a fresh-context blind agent: this session cannot spawn
subagents. The verdict is a self-review and is NOT the acceptance authority the contract requires.
(The sibling asset `jaula-seguridad` had its inline verdict confirmed afterwards by a real blind
reviewer — evidence about that asset, not a licence for this one.)

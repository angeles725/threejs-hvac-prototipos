# Meta-analysis — `compressor-skid-identity` failed twice

GATES.md: *"Two failures of the SAME critical feature = STOP AND ASK WHY. Before spending the third
attempt, the orchestrator MUST run a meta-analysis: is the defect in the thing being scored, or in
what that thing ANNOTATES?"*

Date: 2026-08-13. Written BEFORE any third attempt was spent.

## The pattern that triggered this

| feature | attempt 1 | attempt 2 | what changed between them |
|---|---|---|---|
| compressor-skid-identity | 0.60 | **0.50** | five surface features ADDED to each package |
| bay-structure | 0.77 | **0.70** | nothing — no bay geometry was touched |

Both scores moved DOWN. One after an improvement, the other after no change at all. A score that
falls when the subject improves is not measuring the subject.

## What the judge said, and what is actually there

Attempt 2 judge: *"Both packages are dark featureless rectangular volumes, indistinguishable from
storage crates. No cooling-fan grille, no canopy-break seam, no control panel plate is present. One
box has a faint circular mark on its front face that does not resolve as a grille."*

Measured instead of assumed — a NATIVE-RESOLUTION crop of that exact region of that exact capture
(`compressor-room-open.png`, 620x620 px at 1:1, no rescale):

- cooling-fan grille — **present and unmistakable on BOTH packages**: a recessed dark panel with a
  circular fan disc and a contrasting hub,
- canopy break — **present**: the lid oversails the cabinet on all sides, casting its own shadow line,
- belt line — **present**: the horizontal band splitting motor and compressor sections,
- control-panel plate — **present**: the recessed rectangle on the lower front face.

The judge's "faint circular mark that does not resolve" IS the fan disc. It resolves completely at
1:1. It does not survive the downscale the judge reads.

## Diagnosis

**The defect is in the EVIDENCE, not in the build.** The packages sit small in a wide shot, and a
blind reviewer consumes a downscaled render (~2000 px). Detail authored at the right physical size
disappears in the resample, and the judge then reports absence — confidently, and wrongly.

This is a known, paid-for failure mode in this kit: *"Fine detail: the evidence set MUST include a
NATIVE-RESOLUTION CROP of that region. Otherwise the judge scores a defect the downscale invented,
and the pass burns attempts chasing a ghost."* (cinemex: 8 attempts on arrowheads that were present
at 1:1 in the very capture being scored.)

Adding MORE geometry would have been the obvious move and the wrong one: it would make the model
heavier, still invisible at that scale, and the third attempt would have failed the same way. The
near-threshold-decline signature — 0.60 then 0.50 while the subject improved — is the tell.

## Corrections (evidence, not geometry)

1. **New camera preset `compressor-skid`** — close on the two packages so the grille, canopy break
   and control plate occupy real pixels in the shot the judge scores.
2. **Native-resolution crop** of the skid region added to the evidence set for the next attempt.
3. **NO geometry change to the compressor packages.** They are correct. Touching them again would be
   polishing an object that is already right, which is precisely what the meta-analysis exists to stop.

## `bay-structure`: the judge is RIGHT, and for a reason no image could show

The attempt-2 judge reports absent roof trusses and a flat ceiling. Checked against the source
rather than argued with: the trusses EXIST (`bay.mjs` builds a bottom-chord + top-chord pair per
x-line) — but they live in the SAME group as the roof deck.

That makes them impossible to see, in either state:
- `roof` ON  → the deck is drawn over them and hides them,
- `roof` OFF → they are hidden along with the deck.

So the judge's observation is correct in both reviews, and no amount of recapturing would have
fixed it: there is no camera angle and no layer combination that can show a truss. This one is a
real code defect — a layering mistake, not a modelling one — and it is invisible to every mechanical
check, because the geometry is present, the console is clean and the draw count is right.

Two failures, two OPPOSITE causes: the compressor packages are built correctly and evidenced badly;
the trusses are evidenced as well as they can be and grouped wrongly. Treating both as "add more
detail" — the obvious reading of two low scores — would have fixed neither.

## Judge variance, noted

`bay-structure` also moved 0.77 → 0.70 with zero bay changes between attempts, so part of that delta
is reviewer variance, which this kit has measured before (an identical stainless render scored 0.80
PASS by one reviewer and 0.57 FAIL by another). Per GATES.md, a critical feature failing twice
escalates from one judge to a **PANEL of three with different lenses**, majority taken. Attempt 3
will use the panel: a judge costs minutes, a wasted attempt costs an hour.

0.77 → 0.70 with zero changes to the bay. Two different judges scored the same building differently,
which this kit has measured before (an identical stainless render scored 0.80 PASS by one reviewer
and 0.57 FAIL by another). The attempt-2 judge also reports absent roof trusses; that claim is worth
testing on its own rather than accepting or dismissing.

Per GATES.md, when the same critical feature fails twice the gate escalates from one judge to a
**PANEL of three with different lenses**, taking the majority. That is what attempt 3 will use — a
judge costs minutes, a wasted attempt costs an hour, and the arithmetic is not close.

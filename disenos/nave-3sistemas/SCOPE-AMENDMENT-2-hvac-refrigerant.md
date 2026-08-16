# Scope amendment 2 — the HVAC needs its REFRIGERANT side

Date: 2026-08-13 · Requested by: the user · Status: binding, to be implemented after the dashboard

## What the user asked for

> "HVAC es una condensadora y también un evaporador … también necesito que se pueda ver todo,
> desde afuera"

Two requirements, and the first one is a genuine correction to the design, not a decoration.

## Why the request is right

What exists today models only the AIR side: a rooftop air-handling unit, a supply riser, a 28 m
trunk duct and its diffusers. That is half a system. The plant currently absorbs heat from the bay
and the heat then simply *stops existing* — it becomes a kW figure on a dashboard and nothing more.

A real bay HVAC is a refrigerant circuit with two ends:

| half | where | what it does | what it must show |
|---|---|---|---|
| **evaporator** | INSIDE the bay | absorbs heat from bay air across a cold coil | coil face, fans, drip tray, cold-side pipe |
| **condenser** | OUTSIDE, on the roof | rejects that heat to ambient air | condenser coil, axial fans facing up, hot-side pipe |

They are joined by two refrigerant lines: the suction line (cold, insulated, larger) and the liquid
line (warm, bare, smaller).

**This closes the design's own thesis.** The GOAL promises that the three systems are one coupled
model where nothing disappears: lighting heat and compressor heat become the cooling load, the load
becomes HVAC kW. But the heat itself had nowhere to GO. With a condenser on the roof, a user can
follow the whole path with their eyes — from a luminaire that warms the bay, through the evaporator
that picks the heat up, along the refrigerant lines, to the condenser fans throwing it at the sky.
That is the same argument that made the compressor-room exhaust louvers worth building: a term in
the equation deserves a body in the model.

## Second requirement: an exterior view that shows everything

The bay is currently only ever seen with its roof off, because that is how you see inside. There is
no view that shows the building AS A BUILDING with all its rooftop plant on top. That view is also
the only one where the condenser can be seen doing its job.

Add an `exterior` camera preset: high, outside, roof ON, showing the closed envelope with the
rooftop equipment — condenser, AHU/evaporator housing, ducting penetration — legible on the roof.

## Implementation notes (for the modeller, after the dashboard closes)

1. **Condenser unit, rooftop.** Sized against the load it must reject: the base case is 40.3 kW of
   cooling, and a condenser rejects cooling load + compressor work, so roughly 40 + 13 = 53 kW.
   A 50–60 kW air-cooled condenser is about 2.2 × 1.1 × 1.3 m with two axial fans of ~0.63 m.
   Mark these dimensions `confidence: low` in the spec — they are a class estimate, not a datasheet,
   and the P4 amendment rule pre-authorises fixing them later.
2. **Evaporator.** The existing rooftop AHU already houses the air side; the honest move is to model
   the evaporator COIL and drip tray inside/below it and let the AHU read as the air-handling half,
   OR hang a separate evaporator unit in the bay. Prefer whichever keeps the duct run coherent —
   do not build both and leave a floating one.
3. **Refrigerant lines.** Two pipes, condenser to evaporator: suction line larger and insulated
   (lighter, thicker), liquid line bare and thinner. They must ATTACH at both ends per the spec's
   attachment contract — no floating segments. This is the visual thread that ties the two halves.
4. **Fan animation.** The condenser fans spin, and their rate should follow the HVAC load, the same
   way the exhaust fans follow the exhaust fraction. A condenser working hard should look like it.
5. **`exterior` camera preset** + a shot in the evidence contract covering it.
6. **Simulation:** no new physics is required — the condenser rejects what the model already
   computes. Optionally expose `condenser_reject_kw = cooling load + HVAC draw` as a derived
   dashboard reading, since it is exactly the number the condenser exists to move.

## Order of work

The dashboard is in flight and is the primary deliverable, so it finishes first. This amendment is
next, ahead of the materials and lighting passes, because it ADDS GEOMETRY — and geometry must be
settled before anything spends time making it look good.

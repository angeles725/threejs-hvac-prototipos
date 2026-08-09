# Mass-flow hopper + screw feeder — preserved source extracts

Fetched: 2026-08-08
Marker: [CERT-web] for the quoted engineering-guide statements.

## Hopper wall angle for mass flow

> "To attain mass flow, the hopper walls must be steep enough to allow flow along the walls, how
> steep depends on the wall friction and the hopper geometry. Walls sloped 15 to 20 degrees from
> vertical are usually sufficient to allow mass flow even if the bulk material has high wall
> friction."

15-20° from vertical = **70-75° from horizontal**. Both converging directions of the transition in
this model are held at or above 70° from horizontal, so the geometry satisfies the quoted criterion
on both axes, not just the one that happens to face the camera.

## Mass-flow screw feeder geometry (KWS engineering guide)

URL: https://www.kwsmfg.com/mass-flow-screw-feeders/ and .../engineering-guides/screw-conveyor/types-of-screw-feeders/

> "The mass flow design ... is a combination of variable pitch and tapered inside diameter, with a
> tapered cone located on the center pipe of the screw from the rear of the inlet opening to
> approximately the center of the inlet opening, and short pitch flights mounted on the cone"

> "In order to properly design for mass flow, material must be drawn down evenly along the entire
> length of the inlet opening of the screw feeder"

This is the single most important modelling fact for this asset, and it is a shape fact, not a
number: a **constant-pitch screw under a long hopper slot draws only from the back of the opening**.
The real machine defeats that with a cone on the centre pipe plus increasing pitch along the inlet.
A uniform auger under a slot is therefore not a simplification — it is the wrong machine.

## What these sources do NOT give

No absolute dimensions: hopper volume, screw diameter, trough length, drive size and the loss-in-
weight load cells are all [INFER] in the design spec, sized to a plausible small dosing unit. Only
the ANGLES and the screw geometry rules are evidenced.

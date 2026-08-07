<!-- PRESERVED WEB SNAPSHOT
URL: https://en.wikipedia.org/wiki/Straight_skeleton
Accessed: 2026-08-07 (UTC)
Method: WebFetch extraction of load-bearing fragments (verbatim quotes)
Cited by: threejs-block45
-->

# Straight skeleton (Wikipedia) — preserved fragments

Verbatim quotes extracted 2026-08-07:

1. Definition via shrinking / self-parallel motion:
> "The edges of the polygon are moved inwards parallel to themselves at a constant speed. As the
> edges move in this way, the vertices where pairs of edges meet also move, at speeds that depend
> on the angle of the vertex."

2. Split event:
> "if one of these moving vertices collides with a nonadjacent edge, the polygon is split in two by
> the collision, and the process continues in each part."

3. Roof / terrain application (the 3-D lift):
> "Each point within the input polygon can be lifted into three-dimensional space by using the time
> at which the shrinking process reaches that point as the z-coordinate. The resulting
> three-dimensional surface has constant height on the edges of the polygon, and rises at constant
> slope from them."

4. Historical attribution:
> "Straight skeletons were first defined for simple polygons by Aichholzer et al. (1995)."

Note: the two canonical event names — "edge event" (a wavefront edge shrinks to zero and vanishes)
and "split event" (a reflex vertex hits a non-incident edge, splitting the wavefront) — are the
standard terminology (Aichholzer & Aurenhammer; Felkel & Obdrzalek). Wikipedia describes the split
mechanism in prose (quote 2) but does not use the exact labels on this page; the labels are
corroborated by the CGAL manual and the Felkel/Obdrzalek algorithm.

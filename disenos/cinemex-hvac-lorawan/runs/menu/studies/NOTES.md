# Divergence studies — cinemex lateral-menu round (disposable, never ship)

Three structural answers to "how do menu + 3D hero + section content share space." All three
use the locked B43 token sheet verbatim, the same ten es-MX sections, the same Vista control
contract (MODO / CÁMARA / CAPAS / Pantalla completa), and IDENTICAL fake-shaped data
(Dashboard + Energía; the 14 RTU meter rows sum exactly to the 142.6 kW headline) so that the
blind review can only be about structure. No ranking here — the review is not mine.

## study-a.html — Rail and floating panel over a full-bleed hero

Structural thesis: the 3D building is the page. The hero bleeds edge to edge and NEVER yields
layout space; everything else is a satellite floating over it — a full-height icon-first rail
(Vista folded into its foot), a small floating header, and a floating section panel on the
right that scrolls internally and swaps content per section. Predicted weakness: content
capacity — any section denser than one table plus a KPI row (Trends' 14-sparkline grid,
Schedules' weekly matrix) must fight a fixed-width internal scroller, and the panel
permanently occludes the right third of the model, which hurts exactly the camera angles
(technical room, network) that live on that side; the collapsed rail also hides the Vista
controls behind a pin action. Most stressed tier: tablet (768–1023 px) — the panel floor
width plus the collapsed rail leave the visible hero at its narrowest while the occlusion
problem is still present, unlike the phone tier where the panel honestly becomes a bottom
sheet.

## study-b.html — Sidebar and scrolling document with a letterboxed hero

Structural thesis: the console is a readable document. One wide sidebar carries the ten
sections AND the full Vista controls inline (no popovers), and a single scrolling column
carries the hero letterboxed at the viewer's capture aspect (688×636) followed by section
content as in-flow cards; the hero yields VERTICALLY — scrolling trades the model for data,
and a sticky section bar (with a "back to model" action) keeps orientation once the hero has
scrolled off. Predicted weakness: the primary-task walkthrough demands looking at the model
and the zone table in the same glance, and this structure makes that a scroll round-trip; the
near-square letterbox also wastes horizontal ground on wide screens. Most stressed tier:
desktop (≥1440 px) — the one tier where side-by-side was affordable is spent on empty
letterbox margins, so the structure's cost is highest exactly where the operator has the most
room.

## study-c.html — Split workbench with a reserved content dock

Structural thesis: model and data are permanent peers. Under a spanning top bar, three lanes
share the width — menu, hero pane, and a right content dock with its own scroll that NEVER
yields; the Vista group is a horizontal control deck welded to the hero's bottom edge (controls
live with the thing they control), and pinning the menu trades width with the HERO only, so
the data lane is stable while the model breathes. On the phone the workbench turns vertical
and the hero stays pinned (sticky) while deck and dock scroll beneath it. Predicted weakness:
the hero is squeezed from both sides on middling widths — with the menu pinned at laptop
width the model can drop below half the screen, and the fixed dock makes "pin the menu closed
to work the 3D full-width" only half-true because the dock never gets out of the way; the
bottom deck also competes with the hero for vertical space. Most stressed tier: laptop
(1024–1439 px) — three reserved lanes plus the deck leave the hero its smallest share exactly
in the most common working resolution.

## Shared implementation notes (for the reviewer's calibration, not a verdict)

- Hero placeholder: study B fixes the 688×636 capture aspect; A and C let the hero fill its
  pane, matching how the real viewer canvas behaves in the shipped shell (fluid). Both are
  honest readings of "the viewer's real aspect"; the capture path itself is untouched by any
  of this.
- Tier demonstration: all three read the same breakpoints (≥1440 desktop / 1024–1439 laptop /
  768–1023 tablet, JS sets the initial collapsed state / <768 phone drawer). Pin state is a
  session toggle only in the studies; production would persist it (localStorage) per the brief.
- Eight of the ten menu items are rendered but marked `aria-disabled` ("Fuera de alcance del
  estudio"); only Tablero and Energía switch content, per the study permit.

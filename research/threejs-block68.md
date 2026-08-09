# Block 68 — Wire-mesh security cage: the post is sized by the HEIGHT, and the mesh by what it must stop

> Research of **G73 — mesh security cage / caged store area** for the `disenos/catalog/` build (RUN 12).
> Closes the `almacenamiento` family together with [Block 67] (drive-in). Siblings: [Block 58]
> selective racking, [Block 61] shelving, [Block 64] cantilever, [Block 65] mezzanine, [Block 66] lockers.
>
> **Block number:** B68, next free by ASSIGNMENT in `research/BLOCK-REGISTRY.md` (range B57-B69).
>
> Source (preserved BEFORE citing → `sources/B68-cage-dims/`):
> `ufgs-10-22-13-wire-mesh-partitions.pdf` — **UFGS 10 22 13, Wire Mesh Partitions**, the US federal
> Unified Facilities Guide Specification (sha256 `bc55c482…`, fetched 2026-08-09), text-extracted to
> `sources/extracted/`. A second candidate (`wovenwire.org` heavy-duty arch specs) **failed to
> download** (connection reset, 0 bytes) and was deleted rather than left as an empty file pretending
> to be evidence.
> Method: `pdftotext -layout` transcription, load-bearing strings token-checked against the extract
> (counts in brackets). Markers: `[CERT-doc]` preserved document · `[INFER]` deduction.
>
> Why this source and not a vendor page: UFGS is **dual-unit and duty-graded**. It publishes the
> metric value beside the imperial one for every member, so nothing has to be converted by hand, and
> it separates *normal duty* from *heavy duty* — which turns out to be the whole design decision.

---

## 68.1 — Two duty grades, and the mesh is the difference `[CERT-doc]`

| Member | Normal duty (§2.2) | Heavy duty (§2.3) |
|---|---|---|
| Wire mesh | `10 gage wire, 38 mm 1-1/2 inch mesh` [1] | `6 gage wire, 50 mm 2 inch mesh` [1] |
| Panel frames | `32 by 16 mm 1-1/4 by 5/8 inch` C channels [1] | `38 by 20 by 3 mm 1-1/2 by 3/4 by 1/8 inch` channels [2] |
| Corner posts | `56 by 25 by 3 mm 2-1/4 by 1 by 1/8 inch channel` [1] | `Structural steel channel, 75 mm by 1.9 kg` [1] |
| Framing angles | `32 by 32 by 3 mm 1-1/4 by 1-1/4 by 1/8 inch` [1] | `45 by 45 by 3 mm 1-3/4 by 1-3/4 by 1/8 inch` [1] |
| Bolting | `6 mm bolts 300 mm o.c.` [1] | `10 mm bolts 450 mm o.c.` [1] |

Note the direction of the trade: heavier duty means a **coarser** mesh (50 mm rather than 38 mm) made
of **thicker** wire (6 gage ≈ 4.9 mm rather than 10 gage ≈ 3.4 mm). A cage is not made more secure by
making the holes smaller; it is made more secure by making the wire harder to cut. Getting this
backwards produces a "high-security" cage of fine, thin wire — plausible-looking and wrong.

The mesh is `woven diamond mesh` [1] of `ASTM A510/A510M carbon steel wire` [1], not a welded square
grid. So the wires run at ±45°, not orthogonally.

## 68.2 — The post is a FUNCTION OF HEIGHT, not a free choice `[CERT-doc]`

§2.3 carries a table indexed by partition height, which is the detail that stops a modeller from
picking a post section by eye:

| Partition height | Member |
|---|---|
| `2100 to 3600 mm` | `62 by 7.9 mm` [1] |
| `3600 to 4800 mm` | `75 by 7.9 mm or 62 by 10 mm` [1] |
| `4800 to 6000 mm` | `87 by 7.9 mm` [1] |

and the base detail: post shoes are `Cast or forged steel or ductile iron, adjustable, approximately
64 mm` `2-1/2 inches high` [1], and a post may be `welded to a 225 by 225 mm 9 by 9 inch steel base
plate anchored to the floor with four` anchors [1]. Top frames are secured `to a continuous capping
bar` with `6 mm 1/4 inch diameter U bolts not more than 650 mm 28 inches o.c.` [1].

Consequence `[INFER]`: a cage does not sit on the floor, it stands **64 mm off it** on adjustable
shoes over a base plate. Modelling the mesh running down to the slab is the cheap error, and it also
removes the reason the shoes exist (levelling on an uneven floor).

## 68.3 — A cage is an INTERFACE, not just a fence `[CERT-doc]`

The spec provisions parts nobody would invent for a fence:

- `SLIDING DOORS` §2.4 [1] and `Hinged Doors` §2.2.8/§2.3.7 [8 occurrences of `hinge`] — both exist.
- `DOOR OPENING FRAMES` §2.5, so an opening is FRAMED, not just a gap in the mesh.
- A **service window**: `Opening must be 600 mm wide by 450 mm high 24 inches wide by 15` inches [1],
  with a shelf `300 mm deep by 625 mm wide 12 inches deep by 25 inches wide` [1].
- Door frames of `32 by 13 by 3 mm` channels with a `32 by 3 mm 1-1/4 by 1/8 inch flat bar cover on
  top and bottom rails and on hinge stile` [1] — the hinge stile is reinforced differently from the
  rest of the leaf.

The service window is the single most informative detail in the document: it says the cage is a
counter you hand parts through, which is what a *caged store area* is for. A cage modelled without
any way to transact is a cage nobody could work in.

## 68.4 — Visibility is decided by wire DEPTH, not by aperture `[INFER]`

The catalog has already paid for this once: `datacenter/rack-servidores` modelled a perforated door
with 10 mm-deep bars, which stacked visually in a 3/4 view and went **opaque**, hiding 42U of
equipment at exit 0 (ONBOARD, MALLA/REJILLA). The parameter that matters is how deep the member is
along the view ray, not how big the hole is.

Here the evidence and the fix agree for once: real 6-gage wire is **4.9 mm** thick, so modelling the
wire at its true diameter is automatically shallow and the cage stays see-through from any angle. The
temptation to fatten the wire "so it reads" is precisely the failure mode — and it would also be
unfaithful, since the wire gauge is published.

Second-order consequence: at 50 mm aperture with 4.9 mm wire, the open area is about 82%, so the
INTERIOR of the cage is visible in the default state. Anything modelled inside will be seen; an empty
cage will read as an empty box. The interior therefore has to be part of the asset, not scenery.

## 68.5 — Consequences for the model

1. Wires at **±45°** (diamond), 50 mm aperture, 4.9 mm section — true diameter, never fattened.
2. Every panel is **framed** in 38×20×3 mm channel; posts are **75 mm** channel at corners and
   **62 mm** on the line, chosen from the height table for a 2.4 m cage, not by eye.
3. The cage stands on **64 mm post shoes** over **225×225 mm** base plates; mesh does not touch the slab.
4. A **framed** door opening with a reinforced hinge stile, plus a **600×450 mm service window** with
   its 300×625 mm shelf.
5. A **continuous capping bar** along the top of the panels.
6. The interior must be furnished, because 82% open area means it will be seen.

<!-- review-status: pending -->
# design3d retro (2026-08-21) — CV-on-raster CAD reconstruction: a resolution-gated last resort

**Scope:** a user-supplied session that reconstructed a plan by **computer vision on a DWG raster
preview** (OpenCV: colour masks → `HoughLinesP` → `connectedComponentsWithStats`) because its
environment could not read the DWG entities. Captured to improve the CAD→3D tool. It likely describes a
DIFFERENT DWG than COB-IM2 (its preview is 1536×690, pipes+equipment, an invented 60 m width) — the
method lesson is general. `[session-observed]` for that session; `[CERT-live]` for the verification below.
Propose-only (Hard Rule 6): the user promotes.

## Observation — CV reconstruction is where you land WITHOUT the reader ladder, and it invents everything

The session's own honest list of what it produced from the raster: geometry by colour (blue=pipes,
gray=walls, magenta=equipment), ~104 wall + ~198 pipe segments, 10 equipment blobs — but **invented
scale** (assumed 60 m width → 0.039 m/px), **invented elevation** (pipes at 2.80 m, walls 2.60 m), and
**zero semantics** (no layers, tags, diameters, or real coordinates). Every length is `[INFER]` until one
real dimension recalibrates it. `[session-observed]`

This is exactly the wall the compile-from-source session and the ODA-install thread already hit: a
reader-less sandbox (no libredwg, no ODA, no sudo). It is the failure mode the B12 **DWG-reader bring-up
ladder** (system libredwg → ODA File Converter → compile libredwg from source) exists to prevent. For
COB-IM2 we read the REAL entities — certified 1 m units (6" witness), real BOD elevations, real W"xH"
sections — so nothing here was invented. The CV session is the control case that shows the value of the
ladder: without a reader you get a proportion, not a measurement.

**Verified correction to "reconstruct from the DWG preview"** `[CERT-live]`: I extracted COB-IM2 14A's
embedded thumbnail with `dwgbmp` — it is **256×115 px, 5.4 KB** (reproduce: `dwgbmp raw/14A.dwg`). CV geometry extraction
(Hough, segmentation, 198 segments) is not viable at that resolution; the session's 1536×690 came from a
higher-res raster elsewhere, NOT the embedded thumbnail. So "reconstruct from the DWG's own preview" is
NOT a general capability — real embedded previews are postage stamps. `[CERT-live]`

## Proposed (propose-only — user promotes)

- **DELTA candidate (PIPELINE §Triage / a CAD→3D intake note):** rank CAD-intake routes explicitly —
  1) read entities via the B12 reader ladder (default, certified); 2) CV-on-raster ONLY when no reader
  can run AND a sufficient-resolution raster of the plan exists (the embedded thumbnail, ~256×115, does
  NOT qualify). Route 2 marks EVERYTHING `[INFER]`: scale, elevation, semantics. Never present a CV
  reconstruction's lengths as measured.
- **LEARNING (§Staged) — CV recalibration hook:** a CV reconstruction must expose a scale control and
  recalibrate from ONE known real dimension ("this wall is 14.35 m" → rescale all); until then lengths
  are proportional, not physical. Mirrors the deliverable's "Elevación reconstruida" slider.
- **LEARNING (§Staged) — embedded DWG thumbnails are ~256×115** (verified), unusable for CV geometry;
  do not assume a DWG carries a CV-grade raster.
- **Reusable recipe (only if Route 2 is ever forced):** colour masks (blue/gray/magenta → pipes/walls/
  equipment) → `HoughLinesP` + colinear-merge for lines → `connectedComponentsWithStats` for equipment
  blobs → quaternion-oriented cylinders for pipes → the DWG raster as a floor-plane texture to validate
  the generated geometry against the plan. All output `[INFER]`.
- **No GATES change.**

## Honesty

The CV session is `[session-observed]` from a user-supplied log — not run here. The one thing I
adjudicated is the embedded-thumbnail resolution (`dwgbmp` on the real file, 256×115) `[CERT-live]`,
which corrects the implied "reconstruct from the DWG preview" capability. Scope note: the user names a
downstream goal — a digital twin with live Niagara variables. That is out of the CAD→3D converter's
scope (the converter's job ends at certified CAD→3D JSON); it is recorded here as the user's stated
direction, not proposed by this retro.

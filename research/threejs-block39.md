# Block 39 — Data-viz craft for the HVAC dashboards

> Research of **the HOW after [Block 30]'s WHERE**: visual hierarchy and pre-attentive
> attributes for operational dashboards, chart-type discipline for HVAC telemetry (and what NOT
> to draw), color ramps (sequential vs diverging, colorblind-safe) for temperature/setpoint
> data, and when a sparkline earns its keep over a plain number in an equipment card. Does NOT
> cover dashboard layout/wiring (covered, [Block 30]) or the 2D token/accessibility system itself
> (parallel, [Block 36]).
>
> Sources: `priceonomics.com/how-william-cleveland-turned-data-visualization/` (preserved;
> reputable data-journalism explainer of Cleveland & McGill's 1984 "Graphical Perception" ranking
> — the primary academic source itself is a paywalled JASA paper, this is the standard accessible
> secondary account cited throughout the dataviz field) · `matplotlib.org/stable/users/explain/
> colors/colormaps.html` (preserved; official Matplotlib documentation — sequential/diverging/
> cyclic/qualitative colormap taxonomy and the viridis-family colorblind-safety rationale) ·
> `sources/manuals/bas-graphics-standard-monash-v1.4.pdf` (already preserved for [Block 30];
> re-cited here for its zone spectrum-binding color rule §4.4.5 and Trend-Data/SLD chart
> convention §4.11) · `sources/web-snapshots/github.com_leeoniya_uPlot.md` (already preserved for
> [Block 30]; re-cited for chart-library fit) · playfairdata.com (secondary, not preserved — a
> single supporting caution on encoding overload, not load-bearing) · general web sweep on
> alarm-console/HMI dashboard conventions (secondary, not preserved verbatim).
> Method: WebSearch + WebFetch/curl. Two new preservations via `fetch-doc.sh web` (priceonomics)
> and a manual curl-with-browser-User-Agent + pandoc pass registered in `SOURCES.md` the same way
> the toolbelt would (matplotlib.org — both plain WebFetch and the script's default curl returned
> HTTP 403/404 anti-bot responses; a `Mozilla/5.0 ... Chrome/124.0` User-Agent header succeeded
> with HTTP 200 — the same mitigation [Block 30] used for the Monash PDF). Markers:
> `[CERT]` local primary source (`file:line`) ·
> `[CERT-doc]` official downloaded document (`sources/...pdf §N`) ·
> `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) ·
> `[INFER]` deduction.
>
> Layer 7 (HVAC domain, run 6 — design-craft completion). Connects [Block 29] (ISA-101 status
> discipline, gray-default), [Block 30] (dashboard architecture — the WHERE this block's HOW
> fills in), [Block 36] (2D design tokens, planned — this block's color-role recommendations feed
> its token roles), [Block 22] (audited neutral PBR palette, the material substrate the status
> colors here sit alongside). Block TYPE: **domain survey + applied synthesis** — expect
> [CERT-a]/[INFER]-heavy evidence outside §39.3 (which lands on [CERT-doc]/[CERT-web] thanks to
> the Monash spectrum-binding rule and Matplotlib's official colormap taxonomy), per
> METHODOLOGY §11.

---

## 39.1 — Visual hierarchy for operational dashboards `[CERT-a]`

Cleveland & McGill's 1984 "Graphical Perception" study (accessible secondary account,
`sources/web-snapshots/priceonomics.com_how-william-cleveland-turned-data-visualization_.md`)
ranked how accurately people read different visual encodings, from most to least accurate:

| Rank | Encoding | Example chart | Accuracy |
|---|---|---|---|
| 1 | Position along a common scale | bar chart, dot plot | highest |
| 2 | Position along nonaligned identical scales | small multiples | high |
| 3 | Length, direction, angle | pie-chart wedge angle | medium |
| 4 | Area | bubble size | lower |
| 5 | Volume, curvature | 3D bar height, dial arc | low |
| 6 | Shading, color saturation | heatmap cell shade | lowest |

**This is the technical reason position beats color, and color beats a gauge dial** `[INFER]`:
a horizontal bar (rank 1, position/length) reads faster and more accurately than a radial gauge
needle (rank 3-5, angle blended with curvature) representing the exact same scalar — the ranking
is not a stylistic preference, it is a measured perceptual-accuracy ordering. Subsequent
crowdsourced replications have refined but not overturned this ordering `[CERT-a]` (same source).

**Pre-attentive budget** `[CERT-a]` (supporting, not preserved —
`playfairdata.com/preattentive-attributes-comparison/`, a data-viz consultancy explainer):
color, position, size/length, and orientation are processed in under ~500ms without conscious
scanning, which is exactly why they work for "glanceable" dashboard reading — but the same source
cautions that stacking multiple pre-attentive channels on one chart (color AND size AND angle AND
motion simultaneously) overloads rather than clarifies; the practical rule of thumb repeated
across the dataviz field is **one, at most two, pre-attentive channels per chart element**, with
position/length preferred as the primary channel whenever the layout allows it.

**"Glanceable then drillable" is not a new invention here — the Monash standard already builds
it** `[CERT-doc]` (`sources/manuals/bas-graphics-standard-monash-v1.4.pdf` §4.11.1
"Content: Single Line Diagrams (SLD)", p.44-45): *"The SLD page must show instantaneous value with
history button. If the instantaneous value is not available, the current day usage should be
displayed."* — i.e. the **glance** layer is a single number (position/length-free, but the fastest
possible read: read-the-digit), and the **drill** layer (the full trend chart) sits one click away
behind a dedicated button, never inline by default. This is the two-tier structure §39.1 asks for,
already codified in a real, live BAS-estate standard.

**Alarm salience budget ties directly to [Block 29] §29.3's ISA-101 gray-default rule**
`[INFER]`: if position/length is reserved for the primary metric and color is reserved for
state (per §39.3 below), then a dashboard that also colors every tile, borders every card, and
bolds every label has spent its entire pre-attentive budget on decoration before an actual alarm
needs to compete for attention — the same "if everything is loud, nothing is" argument [Block 29]
makes for material color now applies one layer up, to the dashboard chrome itself. A gray/neutral
default at the **widget** level (tile background, chart line weight, card border) is the direct
generalization of ISA-101's gray/neutral default at the **equipment-material** level.

## 39.2 — Chart-type discipline for HVAC telemetry `[CERT-doc]` / `[CERT-a]`

| Signal shape | Right chart | Wrong chart | Why |
|---|---|---|---|
| Temperature/pressure/RPM over time | line chart (uPlot, [Block 30] §30.3) | bar chart per tick, 3D line chart, radial gauge with a moving needle | time-series is exactly rank-1/rank-2 position-on-a-common-scale (§39.1); a 3D tilt or a needle sweep adds angle/curvature distortion (rank 3-5) for zero informational gain |
| Setpoint vs actual (the delta is the point) | banded/dual line — actual as a solid line, setpoint as a reference line or shaded tolerance band around it | single gauge with a "target" tick mark | a band is still position-encoded and shows the FULL history of the deviation, not just its current instant |
| Distributions (e.g. histogram of daily peak-load samples) | rare in HVAC ops dashboards — occasionally a simple histogram/box plot for a post-mortem/analytics view, never on the live glance layer | — | operational dashboards answer "is it OK right now / what's the trend", not "what's the statistical shape of this metric" — that is an analytics-tool question, out of scope for the glance layer |
| A single current scalar with a known safe range (fan %, filter dP vs max-rated dP) | horizontal bar / linear gauge-replacement (rank-1 position/length) | radial dial, speedometer-style gauge, ANY 3D-rendered gauge mesh | this is precisely the "gauges-abuse" case: a dial encodes the same scalar with angle (rank 3) instead of length (rank 1) for no reason other than looking like an instrument-panel; a 3D dial adds a THIRD lossy dimension (perspective/foreshortening) on top of that |

**Official precedent for "no 3D charts, no gauge dials" in a real BAS standard** `[CERT-doc]`
(`sources/manuals/bas-graphics-standard-monash-v1.4.pdf` §4.11 "Meters", p.43-44): the standard's
own Trend Data section shows only a flat, 2D, adjustable-interval time-period line chart — *"The
page has a 'Trend Data' section where the graphic time period can be adjusted"* — across every
meter type (power, water, gas, thermal, solar). There is no gauge, dial, or 3D rendering anywhere
in this official facilities-engineering standard's chart vocabulary; every numeric trend in the
document is a flat 2D line chart or a plain tabular value. This is the same conclusion [Block 30]
§30.3 reached independently from the general charting-library landscape ("every real dashboard
reference found in this sweep puts charts in DOM panels... never inside the 3D scene") — §39.2
adds the chart-*type* half of that discipline: even within the DOM panel, the chart itself stays
flat and 2D.

## 39.3 — Color in data: sequential vs diverging, colorblind-safe ramps `[CERT-doc]` / `[CERT-web]`

Official taxonomy (`sources/web-snapshots/matplotlib.org_stable_users_explain_colors_colormaps.html.md`,
Matplotlib docs — a de-facto standard reference for colormap categories, 2026):

| Category | Rule | HVAC use |
|---|---|---|
| **Sequential** | monotonic lightness/saturation change, single hue family; "should be used for representing information that has ordering" | an absolute reading with no natural midpoint — raw duct temperature, RPM, humidity % on its own |
| **Diverging** | two hues meeting at an unsaturated midpoint; "should be used when the information being plotted has a critical middle value... or when the data deviates around zero" | **exactly** the setpoint-deviation case: a value that can be too high OR too low relative to a target |
| **Cyclic** | wraps at the endpoints | not applicable to HVAC scalars (no wraparound quantity in this domain) |
| **Qualitative** | miscellaneous, unordered hues | discrete equipment/zone identity coloring, not a data ramp |

**The Monash standard already implements an (unlabeled) diverging ramp for exactly this case**
`[CERT-doc]` (`sources/manuals/bas-graphics-standard-monash-v1.4.pdf` §4.4.5 "Zones", p.28,
the "spectrum binding" default): green at setpoint, orange/red as temperature rises above
setpoint, cyan/blue as it falls below — a real, deployed, official diverging color rule keyed to
deviation from a target value, with concrete hex values (`Green #8044c185`, `Red #80ff0000`,
`Blue #80055ff`, orange/cyan driven by the spectrum binding itself). This is a direct real-world
confirmation of Matplotlib's abstract rule: **setpoint deviation is a textbook diverging-ramp
case**, and Monash independently arrived at the same shape a data-viz style guide would prescribe.

**Colorblind safety** `[CERT-web]` (same Matplotlib source, "Color vision deficiencies" section):
*"The most common form of color vision deficiency involves differentiating between red and
green. Thus, avoiding colormaps with both red and green will avoid many problems in general."*
This is a direct correction to the naive HVAC-thermal convention noted in [Block 29] §29.3
(solid red-hot/blue-cold gradients for airflow/thermal overlays) — red/blue is safe (it is
red-green pairing that fails), but **the Monash zone rule above mixes red AND green in the same
ramp** (green=on-target, red=high deviation), which is exactly the pairing Matplotlib's guidance
flags as risky for the ~8% of men with red-green deficiency ([Block 29] §29.3's own accessibility
clause). **The viridis family** (viridis/plasma/inferno/magma/cividis, Matplotlib's "Perceptually
Uniform Sequential" set) is the standard colorblind-safe AND perceptually-uniform choice for
sequential data; for the diverging/setpoint case, the corpus-facing recommendation `[INFER]` is a
**blue↔orange diverging pair** (avoiding red-green entirely) rather than reusing Monash's
green/red spectrum verbatim — same semantic (below-target / at-target / above-target), safer
channel choice.

**Feeds [Block 36]'s token roles** `[INFER]`: this gives the planned 2D-token system two distinct
color-role families that must not be conflated — a **discrete alarm-state palette** (ISA-101
gray/amber/red, [Block 29] §29.3 — a *qualitative* ramp, unordered states) and a **continuous
deviation ramp** (blue↔neutral↔orange, this section — a *diverging* ramp, ordered by magnitude).
They look similar (both use "red-ish = bad") but encode different things and should be named as
separate token roles, not one shared "danger color."

## 39.4 — Micro-charts in context: when a number beats a chart `[CERT-doc]` / `[INFER]`

**The Monash SLD rule already answers this** `[CERT-doc]` (§4.11.1, p.44-45, cited in full in
§39.1): the default, always-visible unit of information is **one number** (instantaneous value);
a chart only appears behind an explicit history/drill action. Applied to the corpus's own
hotspot/equipment-card mechanism ([Block 30] §30.1's `CSS2DObject` anchors, [Block 29] §29.4's
Blender-empty-style anchor pattern):

| Context | Default display | When to promote to a sparkline |
|---|---|---|
| In-scene hotspot / equipment-card label (`CSS2DObject`, [Block 30] §30.1) | number + status-color fill (§39.3's diverging/qualitative rule) | almost never — a hotspot label is typically too narrow to render a legible trend shape, and reading a precise value is exactly what the label is for |
| Equipment-card expanded panel (a drill-down, not the in-scene label itself) | number stays primary | sparkline earns its place here **only** if the trend's *shape* (ramping up, oscillating, flatlined) is itself the actionable signal — not merely as decoration alongside a number that already tells the whole story |
| Side-panel trend chart ([Block 30] §30.3) | full uPlot/Chart.js line chart | this is the correct home for real charting; not the in-scene layer |

**Rule of thumb** `[INFER]`: a sparkline is worth its pixels when the *rate of change* is the
actionable fact (a slowly climbing discharge-air temp that hasn't yet crossed an alarm threshold,
where the trend itself is the early warning); a plain number + status color suffices whenever the
current state alone is actionable (already in alarm, already normal) — which is the common case
for an in-scene hotspot glanced at while orbiting the model, and exactly why Monash's own SLD
convention defaults to number-first everywhere.

## 39.5 — SYNTHESIS: the dashboard style contract `[INFER assembled]`

Per-widget rules, built entirely from §39.1-39.4 plus the machinery [Block 29]/[Block 30] already
established — a contract, not a new stack:

| Widget | Encoding | Color rule | Chart tech | Built from |
|---|---|---|---|---|
| **Trend panel** (side-panel, historical) | line, position/length-encoded, ≤2-3 series per chart (§39.1 encoding-overload caution) | sequential ramp for a lone absolute metric; diverging blue↔orange for a setpoint-relative metric (§39.3) | uPlot/Chart.js DOM panel ([Block 30] §30.3) | §39.2 line-chart-only rule + §39.3 ramp choice |
| **Current-value tile** (equipment card / hotspot) | number, largest legible digit on the tile | status-color fill: qualitative ISA-101 gray/amber/red for alarm state ([Block 29] §29.3) | `CSS2DObject` anchor ([Block 30] §30.1) | §39.4 number-first rule |
| **Alarm row** (console/list) | text + icon, NOT a chart | qualitative priority-tier color (Monash §9 P0-P6, [Block 30] §30.4) | plain DOM list, deep-links to a camera preset ([Block 30] §30.4) | a chart is the wrong tool for a discrete, itemized list — position/length has nothing to encode here |
| **Setpoint-deviation overlay** (zone/floor color OR a banded trend line) | color fill (zone) or a shaded band (trend) — both diverging, anchored at setpoint | blue↔neutral↔orange diverging ramp, NOT Monash's literal red/green (§39.3 colorblind correction) | zone material color ([Block 29] §29.3's emissive-write mechanism) or a banded-line series ([Block 30] §30.2 material/instance mutation, generalized to a 2D chart series) | Monash §4.4.5 spectrum-binding precedent, corrected for colorblind safety |
| **Gauge-replacement bar** (single scalar, known range — fan %, filter ΔP vs max) | horizontal bar, length-encoded (rank 1, §39.1) | sequential ramp OR a single status color at the fill, never a needle/dial | plain DOM/CSS bar, or a `CSS2DObject`-hosted mini-bar | §39.1 ranking + §39.2's explicit "no dial" rule |

**What this contract explicitly forbids** `[INFER]`: 3D-rendered gauge meshes, radial dial/needle
widgets for any single scalar, red-green diverging pairs, more than ~2 pre-attentive channels
stacked on one chart element, and charts inside the WebGL scene itself (the one narrow exception
being the already-deprioritized CanvasTexture-sparkline novelty [Block 30] §30.3 flags as
"the wrong tool for anything the user needs to read precisely"). Every row above is achievable
with the corpus's existing standalone-HTML, no-bundler posture ([Block 1] §1.2) — this is a style
contract on top of tech [Block 30]/[Block 29] already inventoried, not a new dependency.

## 39.x — Connections

- **[Block 29]** — the ISA-101 gray-default/alarm-color rule (§29.3) is the direct ancestor of
  this block's alarm-salience budget (§39.1) and qualitative-palette row (§39.5); its "red-hot/
  blue-cold" thermal convention is the naive baseline §39.3's colorblind correction revises.
- **[Block 30]** — this block is the HOW to [Block 30]'s WHERE: §30.1's `CSS2DObject` anchors
  host §39.4's number-first equipment cards; §30.2's material/instance-mutation mechanism is the
  render-side implementation of §39.5's setpoint-deviation overlay; §30.3's DOM-panel-not-in-scene
  chart placement is extended here by §39.2's flat-2D chart-type discipline; §30.4's Monash-derived
  alarm-priority navigation is generalized into §39.5's alarm-row contract.
- **[Block 36]** (2D design tokens, planned/parallel) — §39.3's two distinct color-role families
  (discrete qualitative alarm palette vs continuous diverging deviation ramp) are the input this
  block hands to [Block 36]'s token-role naming; the two must not collapse into one "danger color"
  token.
- **[Block 22]** — the audited neutral PBR palette is the material-level baseline that §39.1's
  widget-level gray-default generalizes one layer up (dashboard chrome, not just equipment
  materials).
- **G39 closed** — data-viz craft for the dashboards; remaining run-6 gaps (G34, G35, G37, G38)
  are unrelated to chart/color/hierarchy craft and out of scope here.

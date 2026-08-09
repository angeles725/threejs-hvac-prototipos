# Belt cooling tunnel (chocolate / bakery) — preserved source extracts

Fetched: 2026-08-09
Block: B102 (range proceso/fluidos/utilities B100–B119; number assigned by session-A, not claimed from disk)
Marker: [CERT-web] quoted vendor statement, page opened and read · [CERT-a] secondary/aggregated,
page NOT opened · [INFER] derived here.

Serves: `disenos/catalog/proceso/tunel-enfriamiento/`

---

## 1. Envelope and belt — Selmi Tunnel 300/400

Source: Selmi Group, "Chocolate enrobing, moulding and cooling Tunnel 300/400 mm"
URL: https://www.selmi-group.com/chocolate-coating-enrobing-tunnel-300-400.html
Status: page opened and read 2026-08-09. [CERT-web]

> "Working width: 320/420 mm"

> "Dimensions: l. 4/5/8/12/16 m, d. 1000 mm"

> "The production speed of this unit can vary from 30 to 200 cm/min"

> "Cooling unit: 3800/4000 frigories/h"

> "400 V three phase - 50 Hz" · "Power required: 4 Kw – 16 A – 5 poles"

> "Optimal room temperature: 19/23 °C, air-conditioned and dehumidified room with approx. 45% humidity"

**What this pins down:** the machine is LONG and NARROW — 1.00 m across regardless of length, with a
belt less than half that width. The published length list is discrete (4/5/8/12/16 m), so a modelled
length must be ONE of those values, not an average. 5 m is the shortest length that still has a
closed tunnel section between two open ends (see §2).

The page states no working height and no overall height. Neither does any other page reached.

## 2. Structure — ChocoMa DS 60_030 (C+CS series)

Source: Vantage House, "Cooling Tunnel For Chocolate & Bakery Products — 600mm Wide — 10.6m In
Length — ChocoMa DS Series — CMA DS 60_030"
URL: https://www.vantagehouse.com/product/vh-equipment/equipment/eqt-cm/eqt-cm-refrigeration/eqt-cm-refrigeration-tunnels/cma-ds-60_030/
Status: page opened and read 2026-08-09. [CERT-web]

> belt width 600 mm · total length 10,600 mm · belt speed "0.0-3.0m/min, Others on request"

> Insulation — conveyor table: 25 mm · Insulation — top covers: 50 mm

> Cooling liquid: R134 · Power supply: 3 x 400 VAC

> the tunnel carries "an open decorating table for decoration of the products" at the front (1 metre)
> and "an open packing table" at the rear (1 metre)

> the conveyor table has "insulated top sections of 1 meter", "light weight construction easy to
> handle without use of tools"

**What this pins down — and it is the SHAPE fact of the whole subject:** the insulated part is a
**LID, not a box**. The covers are separate 1 m sections that lift off by hand; the belt and its
table run continuously underneath them and emerge onto OPEN tables at both ends. So the tunnel is:

    open table (1 m) → N insulated 1 m top sections → open table (1 m)

A cooling tunnel modelled as a closed insulated crate with a belt stopping at each face is a
different machine. The product must be visible entering and leaving on bare table, and the hood
must read as removable sections sitting ON something, not as walls reaching the floor.

Two independent vendors therefore converge on a 5 m machine: Selmi lists 5 m as a stock length, and
ChocoMa's 1 + N + 1 decomposition makes 5 m = 1 m open + 3 m hood (3 sections) + 1 m open.

## 3. Cooling zones and product clearance — secondary, NOT opened

Source: search-result summaries citing KeyChoc Ltd and AkayGAM cooling-tunnel pages, 2026-08-09.
Status: **both primary pages failed to open** — `akaygam.com/cooling-tunnel.html` returned HTTP 403,
`keychoc.com` failed TLS with a self-signed certificate. What follows is the aggregator's summary,
NOT a quote read at the source, and it is graded accordingly. [CERT-a]

- "Every 6 metres along the tunnel, an independent thermo-regulated cooling unit is added"; linear
  tunnels are supplied "with up to six independently cooled thermostatically controlled zones".
- "Standard 70 mm product height", with a taller option on request.
- Section temperatures quoted in the 15–20 °C band for chocolate setting; other sources quote 2–10 °C
  for deeper cooling.

**Consequence for a 5 m machine, and it is the honest one:** at 5 m the tunnel is BELOW the 6 m
spacing, so it carries exactly ONE cooling unit. The modelled asset therefore shows one evaporator
group over the hood — not a row of them. Drawing three zones on a 5 m tunnel would contradict the
only zone-spacing figure in reach.

## 4. Not found — declared, not invented

No source in reach gives:

- working height (belt top above floor) — every page states length, width and belt width, none the
  height. [INFER] 0.90 m bench height, LOW confidence, same treatment as the flow wrapper's
  `working_height_m` in B100.
- hood cross-section height, evaporator/fan dimensions, drum diameters, leg profiles.
- the internal air path (whether air is blown along the belt or down onto it). The model shows fans
  in the hood discharging DOWN over the belt, which is the arrangement implied by a lift-off top
  cover carrying the evaporator; it is [INFER] and declared low.

These are sized for plausibility against the two measured envelopes and are declared `low`, never
dressed up as datasheet values.

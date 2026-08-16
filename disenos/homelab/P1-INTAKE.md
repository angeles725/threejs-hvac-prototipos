# homelab — P1 Intake & Reference Research

**Status:** P1 (reference research). No geometry until each asset's DesignSpec is approved (design3d Hard Rule 2).
**Track:** threejs · **Mode:** heavy (multi-asset, one asset gated at a time) · **Design dir:** `disenos/homelab/`

---

## 1. Device inventory — SOURCE: `IPs_PEC.xlsx` (sheet "IPs PEC", 12 active rows) `[CERT-doc]`

Windows source path: `C:\Users\equipo\Downloads\IPs_PEC.xlsx` (WSL: `/mnt/c/Users/equipo/Downloads/IPs_PEC.xlsx`).
The "Notas" sheet says it was OCR-converted from `IP's PEC.pdf`, 15 records — verify any low-legibility field before treating as definitive inventory.

| IP | Fabricante | Comentario (rol) | Cantidad |
|---|---|---|---|
| .29 | Panduit Corp | **FMPS** (device type UNKNOWN — needs identification) | 1 |
| .31 | Axis Communications | **CÁMARA AXIS** (network camera) | 1 |
| .32 / .34 / .42 | Panduit Corp | **UPS** | 3 |
| .33 | Rockwell Automation | **SW STRATIX 5700** (industrial ethernet switch, Allen-Bradley) | 1 |
| .45 | Panduit Corp | **PDU EL2P** (rack PDU) | 1 |
| .53 / .54 / .55 / .56 / .57 | Panduit Corp | **PDU** (rack PDU) | 5 |

Distinct equipment TYPES to model: **rack PDU (Panduit), UPS (Panduit), industrial switch (Stratix 5700), network camera (Axis), FMPS (Panduit, unknown), and the 19" rack cabinet + scene that hosts them.**

---

## 2. Photographic reference — SOURCE: 7 site photos supplied by the user (viewed in-session) `[CERT]`

The site is a **Panduit datacenter "experience center" aisle** (confirmed by the "1956 / 1958 · Jack E. Caveney invents Pan-Duit" history graphic wall in the background), inside a modern office corridor.

**Observed, per subject:**
- **Rack cabinets (19"):** several, white frames + some dark/black. Doors are two kinds — **perforated mesh (hex/round-perf) swing doors** AND **glass doors with an LED edge-strip** glowing blue / white / green under the door frame. Black lever handles. Standard tall cabinet (~42U class). Cabinets stand in a **row/aisle** on a wood-look tile floor.
- **Vertical rack PDUs (the hero, most numerous):** black / **red** / **blue** vertical strips mounted at the rear posts — the red+blue pair is an **A/B dual power feed**. Panduit intelligent/monitored PDU: visible outlet columns, a **QR code**, a **USB firmware port**, and a small local display. Door spec sheet reads *"Aumentan la Eficiencia Energética del Rack"* — Alta Temperatura de Operación, Diseño de Bajo Perfil, Alta Densidad, monitoreo/medición (Panduit monitored rack PDU line; xlsx calls the family "PDU EL2P").
- **Cabling / passive:** red + blue power cords bundled vertically (A/B), **teal/cyan fiber cassettes** stacked (patch/fiber cassettes), vertical cable managers.
- **Environment (for the scene pass):** office corridor, wood-look tile floor, glass partition walls, floor-to-ceiling windows with a city skyline, black pendant lamps, lounge/bar seating in the adjacent room, carpet-tile floor beyond. A **person** appears in one frame → human scale reference.

**Reference-image note (for P6):** the photos live only in chat/clipboard right now, NOT on disk. Before P6 they must be saved to `disenos/homelab/references/` so the blind judge can compare render vs photo at the same viewpoint. Until then P1 evidence is the descriptions above + datasheets. (design3d GATES.md: no faked `reference-match`; if a device has no on-disk photo, gate it `spec-only` for that view.)

---

## 3. Reuse map — SOURCE: repo mapping (Explore agent, this session) `[CERT]`

None of the existing designs use the spec-first pipeline (no `design-spec.yaml` / gate); they are older standalone HTMLs. So homelab assets are authored **new and MODULAR** (kit v1.13 default), using the below as ART reference / scaffold only.

| Need | Reuse | Note |
|---|---|---|
| 19" rack cabinet | `disenos/server-rack/` (42U, rails, embedded vertical rack-PDU sub-part) | best art start; the embedded vertical PDU is the closest existing thing to the Panduit strip |
| Multi-equipment SCENE | `disenos/datacenter-dhl/` (the only MODULAR one: `src/scene`, `src/sim`, chip/sim registry) | scene scaffold to extend |
| UPS | `disenos/ups/` (40 kVA generic) | reuse visual, re-label to Panduit |
| PDU | `disenos/pdu/` (225 kVA FLOOR unit — wrong form factor) | NOT the rack strip; build a rack-PDU variant instead |
| Switch / Camera / FMPS | none | **NEW designs** — no near-neighbor blocks |

design3d library reusables that apply: `harness/stainless-equipment-shell`, `parts/prim-helpers`, `parts/round-box-casing`, `materials-textures/procedural-pbr-canvas`, `parts/merge-instancing-kit` (many identical outlets), QA hooks (`geom-verify`, `qa-framing-hook`).

---

## 4. Asset build order (heavy; one asset gated before the next)

1. **Rack cabinet 19"** (mesh + glass-LED doors) — reuse server-rack art. Dims from 19" EIA-310 standard + photos.
2. **Panduit vertical rack PDU** (red/blue dual-feed, monitored) — HERO, most numerous.
3. **Panduit UPS** — reuse ups art.
4. **Rockwell Stratix 5700 switch** — NEW (needs datasheet dims).
5. **Axis network camera** — NEW (needs model + datasheet).
6. **Panduit FMPS** — NEW (needs identification first).
7. **Scene assembly** — aisle of N cabinets with LED glass doors + passives.

---

## 5. Open research items (delegated to @ayudante, P1 datasheets)

- Panduit rack PDU "EL2P" family: real dimensions (U height / vertical 0U length, width, depth), outlet count/type, monitored-PDU display/USB/QR layout.
- Panduit UPS (rack or floor? the 3 units): model, kVA, dimensions.
- Rockwell/Allen-Bradley **Stratix 5700**: exact dimensions, port count/layout, DIN-rail vs rack, front-face graphics.
- **Axis camera** (MAC AC:CC:8E → Axis): identify likely model family, body form (dome/bullet/box), dimensions.
- **Panduit "FMPS"**: identify what this product is (Fiber? Monitoring? Power?), form factor, dimensions.

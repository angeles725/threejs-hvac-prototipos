# Cinemex HVAC LoRaWAN — P1 reference research

This research fixes the visual evidence and explicit assumptions for the DesignSpec. The SDD
specification is the authority for behavior, topology, counts, and acceptance. This document is
only the visual and spatial evidence used by `design3d`.

## Quick decisions

| Topic | Decision |
|---|---|
| Building | Conceptual 60 × 45 m single-storey multiplex; no real branch is reproduced. |
| Plan grammar | Public front → concessions/kitchen threshold → ticket checkpoint → central spine → four auditoriums per side → rear technical corridor. |
| Auditorium orientation | Screens face the exterior side walls. Seating depth runs from the central corridor toward each screen, allowing four rooms to stack along the 29 m corridor band. |
| Visual identity | Use a Cinemex-inspired red/white/gray/black palette and a generated word sign; do not reproduce movie art or a photographed branch. |
| System topology | Show only TC300 → wired RS-485 bus → assigned UC100 → wireless LoRaWAN → UG67 → Ethernet/IP boundary → Niagara. |
| Evidence assets | No vendor or copyrighted cinema imagery is copied into the project. CC-licensed image pages are referenced with attribution and suitability verdicts. |

## Spatial basis

The user and SDD `CIN-ARCH-001..003` establish the authoritative envelope and program:

- footprint: approximately 60 m × 45 m;
- public ceiling: 4.5 m;
- auditoriums: 7–9 m;
- eight rooms: two 80-seat small, four 120-seat medium, two 182-seat large;
- four rooms per side around a 7 m central corridor;
- front public band and rear 4 m service/technical band.

The room subdivision in `design-spec.yaml` is a conceptual fit test, not a construction plan.
Auditorium accessible spaces are integrated on a cross-aisle in the stadium seating zone. This
reflects the official ADA movie-theater guidance, which requires comparable viewing positions and
places stadium-style wheelchair spaces on a riser or cross-aisle, generally within the rear 60% or
the 40th–100th percentile of vertical viewing angles.

## Official and primary sources

| Source | What it proves | Design consequence |
|---|---|---|
| [Honeywell TC300 datasheet](https://buildings.honeywell.com/content/dam/hbtbt/en/documents/downloads/hon-ba-bms-tc300-datasheet-3.pdf) | 100 mm front width, 113.6 mm height, model-dependent depth 19.4–31.5 mm; RS-485 BACnet MS/TP and Modbus RTU; circular glass display and status ring. | Model at real scale on interior walls at 1.50 m AFF; use a black/glass face, circular display, blue status ring, and RS-485 indicator. |
| [Milesight UC100 datasheet](https://resource.milesight.com/milesight/iot/document/uc100-datasheet-en.pdf) | 70 × 45 × 13 mm excluding connectors; white PC+ABS; one RS-485 port; Modbus RTU/passthrough; LoRaWAN; power and system LED. | Use a small white industrial module inside an opened protected cabinet, with one terminal block, power terminals, LED, and antenna symbol. Do not overscale the real module; use cabinet/preset/highlight for legibility. |
| [Milesight UG67 datasheet](https://resource.milesight.com/milesight/iot/document/ug67-datasheet-en.pdf) | 240 × 164 × 90.9 mm; two N-female LoRa antenna connectors; three LEDs; RJ45 PoE/Ethernet; wall/pole mounting; 600 mm antennas supplied. | Keep the gateway at real scale, elevated 3.5 m with two vertical antennas and visible Ethernet/UPS paths. The requested dark presentation is a conceptual dark mounting shell/plate; current vendor housing is white. |
| [Milesight UC100 product introduction](https://www.milesight.com/products/docs/en/uc100/steps/uc100v2/product-introduction.html) | UC100 gathers Modbus RS-485 devices and transmits via LoRaWAN; indoor building-automation use. | Confirms that the four green routes terminate at UC100s and the next hop is wireless. |
| [Milesight UG67 product page](https://www.milesight.com/iot/product/lorawan-gateway/ug67) | Ethernet backhaul, two antennas, PoE, gateway role and physical presentation. | Confirms the high-wall gateway silhouette and continuous blue Ethernet leg. |
| [Niagara Supervisor datasheet](https://www.tridium.com/content/dam/tridium/en/documents/document-lists/niagara/tri-niagara4-supervisor-datasheet-en-2025-0011.pdf) | Browser graphics, analytics, centralized logging/trending, alarming, dashboarding, navigation, scheduling, database and enterprise integration. | External schematic may show these capabilities but must label the UG67-to-Niagara integration boundary as conceptual. |
| [ADA 2010 Standards §221](https://www.ada.gov/law-and-regs/design-standards/2010-stds/) | Wheelchair counts and stadium-style placement/dispersion principles. | Represent integrated wheelchair bays on an accessible cross-aisle, not isolated at the screen. This remains conceptual and is not a Mexican code claim. |
| [Dolby Speaker System 136 manual](https://professional.dolby.com/siteassets/cinema/dolby-audio-products/dolby_speaker_system_136_owners_manual_issue_2.pdf) | Typical screen-channel speaker placement behind the screen; acoustic center at about two-thirds screen height. | Use simplified L/C/R stacks behind the perforated-screen proxy and side surrounds. No Dolby branding is rendered. |
| [Cinemex official site](https://cinemex.com/) | Current public-facing Cinemex word mark/context and the existence of ticketing and concessions. | Use the requested word `Cinemex` and red-led identity only; generic abstract poster art avoids protected films. |

## Visual reference intake

These pages remain external references. No image file is redistributed in P0–P2.

| Reference | License / author | Verdict | Evidence and constraints |
|---|---|---|---|
| [Cinema seating Cinema 1 — 105 seats](https://commons.wikimedia.org/wiki/File:Cinema_seating_Cinema_1_-_105_seats.jpg) | CC BY-SA 4.0, Iantroberts | **pass** | Clear wide view of stepped red seating, aisles, dark acoustic enclosure and screen relationship. Use for tier rhythm and material read, not exact dimensions. |
| [A movie theater concession stand in Hiawassee, Georgia](https://commons.wikimedia.org/wiki/File:A_movie_theater_concession_stand_in_Hiawassee,_Georgia.jpg) | CC BY 4.0, Harrison Keely | **pass** | Clear wide reference for counter, overhead menus, POS, refrigerated display, popcorn equipment and queue-facing service line. Do not reproduce visible brands. |
| [SIFF Cinema lobby 01](https://commons.wikimedia.org/wiki/File:SIFF_Cinema_lobby_01.jpg) | CC BY-SA 3.0, Joe Mabel | **conditional** | Useful for lobby circulation, waiting, polished floor and lighting scale; older/smaller than the target, so palette and furnishings are not copied. |
| [January 2014 movie marquee](https://commons.wikimedia.org/wiki/File:January_2014_movie_marquee.jpg) | CC BY-SA 3.0, Daniel Case | **conditional** | Useful only for projecting-marquee depth and entrance emphasis. Movie titles and exact facade are explicitly excluded. |
| [Industrial bakery kitchen](https://commons.wikimedia.org/wiki/File:Industrial_bakery_kitchen.jpg) | CC BY-SA 4.0, Epolk | **conditional** | Useful for stainless worktables, clear service aisles and equipment density; the cinema kitchen remains smaller and enclosed. |
| Honeywell and Milesight official product imagery on the sources above | Vendor copyright; research-only | **pass** | Clear product silhouette and connector/LED placement. Do not embed or redistribute vendor images. |

## PBR evidence matrix

Values follow the repository `research/HANDBOOK.md` §3.1 and glTF metallic-roughness discipline:
paint, plastic, glass, carpet, rubber, ceramic and acoustic fabric are dielectric
(`metalness ≤ 0.05`); exposed stainless, aluminum and galvanized steel are metallic
(`metalness ≥ 0.85`). Colors derived from one photograph are capped below 0.86 confidence.

| Surface | Evidence | Authored read |
|---|---|---|
| Cinemex-inspired red | User/SDD palette plus official site context | Saturated red painted-metal/acrylic accents; not a calibrated brand match. |
| Lobby floor | SIFF lobby reference + commercial polished tile convention | Warm light-gray glossy ceramic, roughness ~0.18, restrained reflection. |
| Auditorium | CC auditorium reference | Deep charcoal acoustic fabric, burgundy/red seats, dark patterned carpet, warm low-level aisle LEDs. |
| Concessions | CC concession reference | Red/black front, clear glazing, stainless equipment, emissive menu panels. |
| Kitchen | CC industrial kitchen reference | Brushed stainless worktops and hood, light washable walls, darker anti-slip floor. |
| TC300 | Honeywell datasheet/product page | Near-black plastic/glass face, blue emissive ring and neutral white display. |
| UC100 | Milesight datasheet | White PC+ABS module, dark terminals, green status LED. |
| UG67 | Milesight datasheet + requested conceptual treatment | White device nested on a charcoal technical backplate/shell so the overall read remains dark without falsifying connector layout. |
| Communications | SDD legend | Green solid RS-485, blue dashed LoRaWAN, blue solid Ethernet/IP, red alarm, gray disconnected. |

## Layout and installation assumptions

- World axes: +X right, +Y up, +Z toward the front facade; origin at footprint center.
- The room band runs from `z=-18.5` to `z=10.5`; the front public band runs to `z=22.5`.
  Within the rear band, the accessible service corridor is a distinct 1.5 m strip at
  `z=-20.0..-18.5`; technical rooms are separated behind it at `z=-22.2..-20.2`, with doors
  opening into the corridor. These volumes never overlap.
- Screens face the outer east/west walls. Auditorium doors and projection niches face the
  central corridor; thermostat points sit on dividing walls in occupied zones, away from those
  doors and projector heat.
- TC300-05 sits on a neutral kitchen wall near the return-air side, away from the hood, steam,
  cooking line and direct diffuser discharge.
- UG67-01 is at `y=3.5 m`, near the central telecom niche, outside a closed metal cabinet; its two
  antennas are vertical.
- UC100 modules stay at real scale inside opened or transparent protective cabinets. Their
  cabinet/preset/highlight—not inflated product geometry—provides legibility.
- RS-485 follows four bus routes in technical containment. LoRaWAN is represented only by dashed
  waves/packets; there is no UC100–UG67 cable.
- The external Niagara cluster is a schematic outside the east footprint. It is visually linked
  but not represented as literal site placement.

## Protected-content and accuracy boundary

- Generic CanvasTexture poster art uses abstract gradients, geometric shapes and fictional
  titles only.
- The word `Cinemex` is contextual identification requested by the client; no vector logo asset
  or branch facade is copied.
- Product labels identify the conceptual devices; proportions come from official datasheets.
- RF survey, Modbus addressing/registers, network server, Niagara driver/adapter, cybersecurity,
  life safety and code compliance require project-specific engineering outside this model.

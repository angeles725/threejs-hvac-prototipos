# cinemex-hvac-lorawan

Eight-screen Cinemex multiplex (60×45 m) with its complete HVAC monitoring chain — 14× Honeywell
TC300 → RS-485 (4 buses, Modbus RTU) → 4× Milesight UC100 → LoRaWAN → Milesight UG67 →
Ethernet/Internet → Niagara supervisor + clients — plus deterministic fault/hot-state simulation
and an es-MX operations HUD. Built with the design3d HEAVY pipeline: every pass blind-review
gated; state derives from `runs/`, never from memory.

**Preview (importmap + ES modules — never `file://`):**

```bash
cd <repo-root>
python3 -m http.server 8123 --bind 127.0.0.1
# open http://localhost:8123/disenos/cinemex-hvac-lorawan/index.html
```

Deterministic QA states via URL: `?camera=<preset>&state=<architecture|engineering|fault-tc300|fault-uc100-b|fault-internet|hot-sala-3|hot-kitchen>&links=all&selection=TC300-08&tick=<0|30>`.

| File | Kind | Note |
|---|---|---|
| [index.html](index.html) | app | Scene + HUD; ES modules in `src/`, 211-test suite in `tests/` |
| [design-spec.yaml](design-spec.yaml) | spec | DesignSpec (P3-gated; `p6.comparison: spec-only`) |
| [cinemex-hvac-lorawan-hero.png](cinemex-hvac-lorawan-hero.png) | hero | 4K supersample, complete-network engineering view, selection active |
| [cinemex-hvac-lorawan-thumb.png](cinemex-hvac-lorawan-thumb.png) | thumbnail | 640 px catalog card, neutral architecture view |
| [cinemex-hvac-lorawan.glb](cinemex-hvac-lorawan.glb) | asset | Export .glb (GLTFExporter r160 via `research/tools/export-glb.mjs`; non-drawable DataTexture/PMREM slots stripped) |
| [cinemex-hvac-lorawan-opt.glb](cinemex-hvac-lorawan-opt.glb) | asset | Draco-compressed (gltf-transform: 1.09 MB → 1.03 MB — file is CanvasTexture-dominated, so geometry compression buys little; plain `optimize` MEASURED WORSE at 1.16 MB and was discarded) |
| [runs/REPORT.md](runs/REPORT.md) | report | Per-pass gate table (8/8 passed) + mechanical summary |
| [runs/DEFERRED-CORRECTIONS.md](runs/DEFERRED-CORRECTIONS.md) | ledger | Open polish items awaiting user decision |

Gate summary: blockout 0.79 · structural 0.82 · materials 0.81 · surface 0.81 (L2) ·
lighting 0.80 (L2) · interaction-ui 0.81 · optimization 0.82 · **P6 final 0.78 (L2)** — peak perf
209/550 draws, 47.4k/750k tris. The L2 round added the 14 rooftop package units (one per TC300
zone), the reframed checkpoint/kitchen/technical presets, per-family roof articulation, and three
UX fixes: the Techo toggle now hides interior ceilings too, wheel zoom is smoothed (OrbitControls
never damps dolly natively), and a boot-time shader warm-up removes the first-use freeze on the
Sección toggle and device selection.

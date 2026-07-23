# REPORT — compresor-tornillo-aire (design3d, track threejs, mode standard)

Compresor de aire de tornillo lubricado industrial, marca-neutral ("AIRTECH"), clase 45 kW,
estilo Atlas Copco GA. Reference-backed (fotos reales del cliente en `refs/`).

## Resultado
**APROBADO — gate final P6 PASS (global 0.83).** 8 gates pasados, sin massing drift, reference-match Atlas GA confirmado.

## Tabla por pase

| Pase | Estado | Attempts | Score | Screenshot |
|---|---|---|---|---|
| blockout (voxel massing) | passed | 1 (lineage l2) | 0.80 | runs/blockout-l2-attempt1.png |
| structural (geometría paramétrica) | passed | 1 | 0.80 | runs/structural-attempt1.png |
| materials (PBR + gris Atlas) | passed | 2 | 0.82 | runs/materials-attempt2.png |
| surface (CanvasTexture detalle) | passed | 1 | 0.82 | runs/surface-attempt1.png |
| lighting-camera (rig producto) | passed | 1 | 0.78 | runs/lighting-camera-attempt1.png |
| interaction-ui (hotspots + panel) | passed | 1 | 0.80 | runs/interaction-ui-attempt1.png |
| optimization (perf + deferred) | passed | 1 | 0.85 | runs/optimization-attempt1.png |
| **p6-final** | **passed** | 1 | **0.83** | runs/p6-final-attempt1.png |

## Critical features (P6 final)
- airend-screw-block 0.82 / 0.78 ✓  (cuerpo mecanizado figura-8 + bridas + mirilla)
- acoustic-canopy 0.83 / 0.75 ✓  (gris Atlas, paneles de acceso, puerta, louvers)
- air-train-coherence 0.82 / 0.75 ✓  (airend→separador→aftercooler→válvula, cobre)
- aftercooler-fan 0.83 / 0.75 ✓  (fan axial + guarda, radiador aluminio)
- hmi-control-panel 0.84 / 0.75 ✓  (display emisivo + e-stop hongo)
- important_average 0.80 / 0.65 ✓  (motor TEFC, líneas cobre, nameplate AIRTECH)

## Mecánica
307 draws / 51.9k tris (budget 500 / 1.5M) · consola limpia · sin suite de tests.

## Historia y lecciones (staged para retro P8)
- blockout l1 → failed(3) @ 0.75 por el airend; **calibración por pase autorizada**: airend 0.72 en blockout (massing), 0.78 en structural+ (detalle). Lineage reset l2 → PASS.
- **RectAreaLight rompe la captura headless** (SwiftShader shader-compile stall → probe 0 draws + timeout). Reemplazado por DirectionalLight softbox.
- **MeshPhysicalMaterial clearcoat** encarece la captura → canopy a MeshStandard; hero/train a DPR 1-2.
- **Gris tonemapping**: RAL 7035 (#c9cdce) renderiza casi blanco bajo ACESFilmic → albedo bajado a #54585c para que el render lea gris grafito.
- **Coverage de evidencia**: el aftercooler-fan (cara −X) fallaba por encuadre, no por ausencia → query `?view=cooler`.
- **Reference intake mid-run**: el cliente aportó fotos Atlas GA en structural → cara frontal reworkeada a paneles de acceso; el diseño pasó a reference-backed.

## Entregables (P7) — COMPLETOS
- `compresor-tornillo-aire-realistic-v1.html` — modelo interactivo (source, hook `__airtechApp` + `data-app-ready`).
- `compresor-tornillo-aire-voxel-v1.html` — blockout voxel.
- `compresor-tornillo-aire.glb` — **modelo reutilizable, 866 KB, glTF v2 VÁLIDO** (texturas no-drawable/PMREM strip-eadas; CanvasTextures incluidas; escena completa exterior+interior).
- `hero.png` (DPR 2) + `thumbnail.png` (DPR 1).
- `README.md` (carpeta) con tabla de archivos + entregables.
- `refs/` — 4 fotos de referencia Atlas GA.

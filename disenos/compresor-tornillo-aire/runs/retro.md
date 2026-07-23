---
design: compresor-tornillo-aire
track: threejs
mode: standard
result: PASS (P6 final 0.83)
review-status: pending
date: 2026-07-22
---

# Retro — compresor-tornillo-aire

Modelo 3D dedicado de un compresor de aire de tornillo industrial marca-neutral (Atlas GA style),
completado en un run autónomo (loop autorizado por el usuario). 8 gates pasados.

## Qué funcionó
- **Reutilización de geometría del repo**: airend de `chiller-tornillo`, motor/acople de `bomba-centrifuga`,
  materiales de `trane-rtu`. Aceleró el structural enormemente.
- **Calibración de umbral por pase** (autorizada por el usuario): destrabó el blockout tras failed(3) sin
  bajar el contrato final. El airend cerró 0.72 en massing y 0.78-0.83 desde structural.
- **Reference intake mid-run**: las fotos Atlas GA del cliente llegaron en structural → el diseño pasó de
  spec-only a reference-backed y la cara frontal se reworkeó a paneles de acceso. Mejoró el realismo y dio
  base de comparación al P6.
- **Un solo modeler reanudado por SendMessage** a lo largo de todo el pipeline: mantuvo el contexto del
  layout entre pases.

## Qué falló / costó (lecciones → §Staged)
1. **RectAreaLight rompe la captura headless** (SwiftShader shader-compile stall → probe 0 draws + timeout).
2. **MeshPhysicalMaterial clearcoat** encarece la captura → timeout a DPR alto; canopy a MeshStandard, shots pesados a DPR 1-2.
3. **Gris + tonemapping**: RAL 7035 (#c9cdce) renderiza casi blanco bajo ACESFilmic → albedo a #54585c.
4. **Coverage de evidencia**: el aftercooler-fan (cara −X) falló 2 veces por ENCUADRE, no por ausencia → `?view=cooler`.
5. **export-glb** requiere `data-app-ready` flag + hook `globalThis.<name>.runtime.scene`.
6. **Naming del pase**: review/screenshot deben usar el pass name EXACTO (lighting-camera) o gate-state deriva locked/drift.
7. **capture --shots pipeline**: el 3er+ navigate a DPR 3 timeout-ea → capturar shots pesados por separado.

## Deltas de kit PROPUESTOS (no aplicados — decisión del usuario)
- TRACK-THREEJS §Generic defaults: "EVITAR RectAreaLight en captura headless (SwiftShader stall); usar
  DirectionalLight/SpotLight. MeshPhysicalMaterial clearcoat encarece la captura → preferir MeshStandard o DPR bajo."
- TRACK-THREEJS §QA commands: "Shots pesados (hero con sombras completas, clearcoat) capturar INDIVIDUALES a
  DPR 1-2; el 3er+ navigate de un --shots pipeline a DPR 3 timeout-ea."
- TRACK-THREEJS §Delivery kit: "export-glb requiere `<html data-app-ready="true">` + hook
  `globalThis.<name>.runtime.scene`; el modeler debe incluirlos de entrada en el pase interaction-ui/optimization."
- DESIGNSPEC.md: documentar `blockout_threshold` (umbral de massing por pase) para critical features de detalle fino.
- GATES.md §Preflight coverage: enfatizar que cada critical feature ocluida necesita un query de cámara propio.

## Library extractions PROPUESTAS (staged — evidencia de gate: P6 0.83)
- `parts/screw-airend`: airend de tornillo paramétrico (Lathe figura-8 + costillas torus + bridas succión/descarga
  + mirilla latón/vidrio + acople). Source: compresor-tornillo-aire-realistic-v1.html. Reusable para compresores.
- `parts/atlas-ga-canopy`: gabinete acústico estilo Atlas GA (paneles de acceso + puerta bisagra + HMI display
  emisivo + e-stop hongo + louvers bajos + nameplate CanvasTexture + cáncamo + skid). Reusable para equipos con canopy.
- `markers-ui/hotspot-info-panel`: hotspots raycast (esferas pick colorWrite:false + marcadores billboard) +
  tooltips + panel DOM lateral, con derivación única `sync()` (botón y 3D nunca se contradicen) + `?sel=` para captura.

## Métricas
307 draws / 51.9k tris (budget 500/1.5M). GLB 866 KB glTF v2. Attempts totales: blockout 3+1(l2), materials 2, resto 1.

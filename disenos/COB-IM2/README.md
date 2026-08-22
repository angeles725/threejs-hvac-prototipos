# COB-IM2 — Nivel 4 HVAC (INBAS) · Reconstrucción 3D

Reconstrucción 3D del **nivel 4** del edificio COB (disciplina IM2, HVAC — firma INBAS),
a partir de tres planos AutoCAD-2018 (`14A`/`14B`/`14C`). Los tres planos son **tercios
contiguos de un mismo piso lineal de ~152 m** (ejes de columna 1–18), co-registrados en
un marco común.

> **Este entregable es el producto de un estudio Research-SDD**, no de un DesignSpec inventado.
> La geometría es **evidencia certificada**, no supuesta. El corpus completo (14 bloques citados,
> con probes reproducibles) vive en `~/investigacion/COB-IM2/` (target #26).

## Archivos

| Archivo | Qué es |
|---|---|
| **`cob-im2-3d.html`** | **Entregable: visor 3D offline single-file (~3.4 MB). Abre con doble clic — cero internet.** |
| `app.mjs` | Fuente del visor (se empaca en el HTML offline). |
| `vendor/` | Three.js 0.160.0 + OrbitControls vendorizados (para el bundle offline). |
| `cob-im2-floor.json` | Capa de datos del piso: ductos, tomas redondas, terminales, malla, contexto. |
| `extract-floor.py` | Extractor read-only que regenera el JSON desde los 3 DXF. |
| `build.sh` | Rebuild reproducible: extrae datos → empaca con esbuild → ensambla el HTML offline. |
| `qa-check.sh` | Guard de regresión rápido (sin browser): valida geometría sana, sin dead-code, datos embebidos. |
| `qa-render-offline.png` | Captura de QA (headless Chrome). |

> **`cob-im2-3d.html` no se edita a mano** — es el espejo construido. Edita `app.mjs` /
> `extract-floor.py` y corre `./build.sh`.

## Qué muestra

- **Red de ductos** (teal) a su elevación real **BOD** (bottom-of-duct, mediana 3.76 m), con
  **altura por-ducto** leída de la etiqueta `W"xH"` (B8 §8.3): 16 secciones de 4″ a 44″
  (0.10–1.12 m). 86% de los tramos toman su altura de la etiqueta más cercana (≤2.5 m); el resto
  usa la mediana etiquetada (0.254 m).
- **Tomas redondas** (naranja) con diámetro certificado (etiquetas `N"ø`).
- **Terminales** (579): difusores de suministro (azul) vs retornos (naranja) vs dampers (gris).
- **Malla de columnas** (18 ejes, bahías de 9.20 m — de las burbujas del plano).
- **Contexto arquitectónico** ghosted (perímetro, núcleos, particiones) — trazado del PDF,
  marcado como aproximado `[INFER]`, nunca como cota certificada.

## Procedencia certificada (corpus COB-IM2)

| Dato | Fuente | Bloque |
|---|---|---|
| Unidad = 1 m | testigo autodeclarante 6″ø (error 0.7%) | B1 |
| Malla / plato | burbujas `PDF2_Text` (9.20 m), no geometría autorizada | B2 |
| Co-registro A/B/C | offsets B→A +37.235, C→A +33.775 (verificado por ductos) | B4 |
| Ducto = doble línea + piezas Fabrication | `HVAC-Ductos` + `M-HVAC-DUCT` | B5 |
| Secciones redondas ø / rectangulares W″×H″ | etiquetas | B6, B8 |
| Merge draw-once (partición en costuras) | ~30/32/28% por tercio | B7 |
| Elevación BOD (mediana 3.76 m, 886 tags) | evidencia, no derivada | B8 |
| Terminales + AHU (2 zonas) | 626 terminales, ~200k CFM | B9 |
| Contexto ghosted | 256 polilíneas trazadas | B10 |

## Uso

Abre `cob-im2-3d.html` con doble clic (no necesita servidor ni internet). Órbita con el mouse;
los botones **Rasante / Planta / Iso** cambian de vista; la leyenda enciende/apaga cada capa.
Para QA reproducible, `?cam=x,y,z,tx,ty,tz` fija el punto de vista (coords de mundo).

## Rebuild

```bash
./build.sh    # extrae datos de los DXF → empaca con esbuild → ensambla el HTML offline
```

## Pendiente

- **Techo de cobertura (~45% del largo abierto)**: son ductos de **línea simple** y fittings aislados
  (bucket "isolated" del probe), sin pared opuesta que emparejar — no recuperables por geometría de doble-línea.

## Hecho

- **Encuadre rasante**: cámara baja (17 m) apuntando a la banda de ductos, para que la altura/volumen
  se aprecie de entrada.
- **v4 — Altura por-ducto** desde la etiqueta `W"xH"` (B8 §8.3), reemplaza la altura fija de 0.42 m.
- **v5 — Ancho por-ducto (cerrados)**: los footprints cerrados se rinden como **cajas sólidas** al ancho
  real de su rectángulo de área mínima (B14, piso 0.13 m para conservar el 6″); ~1,493 tramos.
- **v6 — Ancho por-ducto (doble-línea abierta)**: emparejamiento de paredes opuestas (B6 §6.4, piso
  0.13 m) → ~552 cajas sólidas más (guard L>w descarta pares falsos), inset 2 cm, sin z-fighting.
- **v7 — Cobertura de emparejamiento 16%→52%**: el matcher v6 emparejaba a nivel de *segmento*, así que
  un muro dibujado como muchos segmentos cortos perdía el concurso mutual-closest (buckets non-mutual +
  low-overlap = ~2,600 de 3,100 sin emparejar — artefacto de fragmentación, no ambigüedad, corpus probe
  `edge-pairing-ceiling.py`). v7 **agrega los segmentos colineales en líneas-de-muro** antes de emparejar
  y usa nearest-mutual **por lado** (una pared puede servir a dos ductos de un banco; una pared más cercana
  del mismo lado bloquea rellenos de pasillo fantasma). **Ningún guard numérico se aflojó** (PAR/OVL/WMIN/
  L>w idénticos): el salto viene de la estructura, no de tolerancias. Menos cajas (~405) pero cada una es
  un *run* continuo, no un fragmento — el archivo offline no crece.
- **v8 — Massing del AHU medido** (B9 §9.3): el mech-room no tiene bloque nombrado, así que se ancla por
  los tags de trunk de descarga ≥2500 CFM. El extractor deriva las cajas del cúmulo (dedup por ownership),
  las coloca en la **X/Y medida** (antes estaban en `D/2`, mal) y **subdivide por hueco en Y** para que la
  zona este rinda **dos cajas** en vez de una losa que cruzara su hueco de 16 m. [INFER], transparentes.
  La caja central cae exactamente en la convergencia de troncales — verificación visual del anclaje.
- **v11 — Render instanciado (~1025 → 22 draw calls)**: las 421 tomas redondas se creaban como Mesh
  individuales, **cada uno con su propia `CylinderGeometry`**, y los 579 terminales como Mesh sueltos
  (~1000 draw calls, 421 geometrías). Ahora son `InstancedMesh` (1 para rounds con escala per-instancia
  = ø/2; 3 por rol de terminal). Draw calls medidos **22** (`window.__info`), geometrías de cilindro
  421 → 1. Pixel-diff vs. v10: **0.000%** — idéntico, solo más liviano en la GPU del cliente.
- **v10 — Tomas redondas desde la etiqueta certificada (100 → 421)**: el extractor sacaba los rounds
  de geometría **CIRCLE** (100 círculos de 5–343 mm en capas HVAC), que resultaron ser un conjunto
  **disjunto** de las tomas reales (0 de 421 a <0.5 m de una etiqueta ø). B6 §6.1 certifica que el
  diámetro ES la etiqueta `N"ø` ("no inference"). Ahora se construyen desde esas etiquetas: **421
  deduplicadas** (~97% de 6″, esparcidas por todo el piso, 91% a <2 m de un difusor). Reconcilia el
  código con la tabla de Procedencia, que ya citaba la etiqueta como fuente.
- **v9 — Poda de ruido de fittings (−30% de archivo)**: el 72% de los outlines de ducto medían <0.3 m
  (mediana 5 cm de diagonal, 1,720 degenerados de largo cero) — detalle de piezas Fabrication sobre las
  juntas (98% a <0.5 m de un ducto real), **invisible a escala de 155 m** pero el 52% de los bytes de
  ductos. Se descartan en el extractor los outlines con bbox < 0.10 m (bajo la sección real más chica,
  6″=0.15 m; también los glifos cerrados 25–75 mm de B14). Verificado por pixel-diff: **0.07% de píxeles
  cambian** en la vista hero. Archivo 4.9 → 3.4 MB, red de ductos idéntica.

# COB-IM2 — Nivel 4 HVAC (INBAS) · Reconstrucción 3D

Reconstrucción 3D del **nivel 4** del edificio COB (disciplina IM2, HVAC — firma INBAS),
a partir de tres planos AutoCAD-2018 (`14A`/`14B`/`14C`). Los tres planos son **tercios
contiguos de un mismo piso lineal de ~152 m** (ejes de columna 1–18), co-registrados en
un marco común.

> **Este entregable es el producto de un estudio Research-SDD**, no de un DesignSpec inventado.
> La geometría es **evidencia certificada**, no supuesta. El corpus completo (10 bloques citados,
> con probes reproducibles) vive en `~/investigacion/COB-IM2/` (target #26).

## Archivos

| Archivo | Qué es |
|---|---|
| **`cob-im2-3d.html`** | **Entregable: visor 3D offline single-file (~4.8 MB). Abre con doble clic — cero internet.** |
| `app.mjs` | Fuente del visor (se empaca en el HTML offline). |
| `vendor/` | Three.js 0.160.0 + OrbitControls vendorizados (para el bundle offline). |
| `cob-im2-floor.json` | Capa de datos del piso: ductos, tomas redondas, terminales, malla, contexto. |
| `extract-floor.py` | Extractor read-only que regenera el JSON desde los 3 DXF. |
| `build.sh` | Rebuild reproducible: extrae datos → empaca con esbuild → ensambla el HTML offline. |
| `qa-render-offline.png` | Captura de QA (headless Chrome). |

> **`cob-im2-3d.html` no se edita a mano** — es el espejo construido. Edita `app.mjs` /
> `extract-floor.py` y corre `./build.sh`.

## Qué muestra (v1)

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
la leyenda enciende/apaga cada capa.

## Rebuild

```bash
./build.sh    # extrae datos de los DXF → empaca con esbuild → ensambla el HTML offline
```

## Pendiente

- **Encuadre por defecto**: la cámara alta subvende la altura variable; un ángulo más rasante
  (o un preset lateral) la haría legible de entrada.
- **Ancho de los tramos de doble-línea abierta**: v5 da ancho real solo a los footprints CERRADOS
  (~1,493, vía rectángulo de área mínima, B14); los ~24,873 tramos de doble-línea abierta siguen como
  muros-contorno y esperan el emparejamiento de bordes B6 §6.4.
- **Massing del AHU** con footprint medido del cúmulo (hoy son cajas nominales en las 2 zonas).

## Hecho

- **v4 — Altura por-ducto** desde la etiqueta `W"xH"` (B8 §8.3), reemplaza la altura fija de 0.42 m.
- **v5 — Ancho por-ducto (parcial)**: los footprints cerrados se rinden como **cajas sólidas** al ancho
  real de su rectángulo de área mínima (B14, piso 0.13 m para conservar el 6″); ~1,493 tramos.

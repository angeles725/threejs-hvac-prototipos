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
| **`cob-im2-3d.html`** | **Entregable: visor 3D offline single-file (~4.9 MB). Abre con doble clic — cero internet.** |
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
- **Massing del AHU** con footprint medido del cúmulo (hoy son cajas nominales en las 2 zonas).

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

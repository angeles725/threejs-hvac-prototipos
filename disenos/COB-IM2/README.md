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
| `cob-im2-3d-v1.html` | Visor Three.js (v1). Abre con un server estático (ver abajo). |
| `cob-im2-floor.json` | Capa de datos del piso: ductos, tomas redondas, terminales, malla, contexto. |
| `extract-floor.py` | Extractor read-only que regenera el JSON desde los 3 DXF. |
| `qa-render-v1.png` | Captura de QA (headless Chrome). |

## Qué muestra (v1)

- **Red de ductos** (teal) a su elevación real **BOD** (bottom-of-duct, mediana 3.76 m).
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

## Rebuild

```bash
# 1. regenerar la capa de datos desde los DXF (read-only)
python3 extract-floor.py /home/cristian/investigacion/COB-IM2/raw cob-im2-floor.json

# 2. servir y abrir el visor
python3 -m http.server 8177   # → http://localhost:8177/cob-im2-3d-v1.html
```

## Pendiente (v2)

- Ductos como **sólidos extruidos** a su sección real (ø / W″×H″) en vez de líneas — usando
  el emparejamiento de bordes robusto (B6 §6.4) para los centerlines rectangulares.
- Empaquetado **offline single-file** (embeber Three.js + JSON en un solo HTML).
- Massing del AHU en las dos zonas (central X≈90–100, este X≈164).

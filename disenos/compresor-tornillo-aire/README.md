# Compresor de tornillo · Aire

Diseños 3D de este equipo. `realistic` = PBR fotorrealista · `voxel` = voxel massing (blockout).
Compresor de aire de tornillo lubricado industrial, marca-neutral (**"AIRTECH"**), clase 45 kW, estilo **Atlas Copco GA**.

| Archivo | Estilo | Título |
|---|---|---|
| [compresor-tornillo-aire-realistic-v1.html](compresor-tornillo-aire-realistic-v1.html) | realistic | COMPRESOR DE TORNILLO · AIRE |
| [compresor-tornillo-aire-voxel-v1.html](compresor-tornillo-aire-voxel-v1.html) | voxel (blockout) | Compresor de tornillo · massing |

## Entregables (design3d P7)
- [compresor-tornillo-aire.glb](compresor-tornillo-aire.glb) — **modelo 3D reutilizable** (866 KB, glTF v2) — cargable por otros proyectos (p.ej. el dashboard gobernador-aire).
- [hero.png](hero.png) · [thumbnail.png](thumbnail.png)
- [refs/](refs/) — fotos de referencia reales (Atlas Copco GA22/GA110 + sistema en planta).
- [runs/REPORT.md](runs/REPORT.md) — bitácora de gates y lecciones.

## Interactivo (query params)
`?run=1` compresor ON (fans + HMI LOAD) · `?door=1` abrir canopy · `?train=1` cutaway tren de aire ·
`?view=cooler` cámara al aftercooler · `?sel=airend|motor|separator|cooler|hmi|valve` ficha de parte · `?spin=1` auto-rotate.

## Estado
**Aprobado design3d** — gate final P6 **0.83**. 8 gates pasados (blockout→P6). Reference-backed. ~307 draws / 52k tris.

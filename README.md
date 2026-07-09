# Diseños 3D HVAC — Three.js

Workspace de **diseños 3D de equipos HVAC** construidos con Three.js. Cada equipo existe en
dos estilos:

- **`realistic`** — malla PBR fotorrealista (MeshStandardMaterial, IBL, sombras).
- **`voxel`** — voxel art isométrico (el estilo se diseña **primero** en voxel y luego se pasa a realista).

Los diseños están organizados **por tipo de equipo**: una carpeta por equipo, con sus versiones
realistic y voxel juntas. Cada carpeta tiene su propio `README.md` con la lista de archivos y títulos.

## Diseños por equipo

| Carpeta | Equipo | Realistic | Voxel |
|---|---|:---:|:---:|
| [ahu/](ahu/) | Manejadora de aire (AHU) | 1 | 1 |
| [bomba-centrifuga/](bomba-centrifuga/) | Bomba centrífuga end-suction | 1 | 1 |
| [caldera-acs/](caldera-acs/) | Caldera pirotubular + tanque ACS | 1 | 1 |
| [carcamo/](carcamo/) | Cárcamo de agua | 1 | — |
| [chiller/](chiller/) | Chillers (aire / tornillo-agua) | 2 | 3 |
| [cuarto-frio/](cuarto-frio/) | Cuarto frío | 2 | 1 |
| [ducteria/](ducteria/) | Ductería HVAC (catálogo) | 1 | 1 |
| [extractor/](extractor/) | Extractores (hongo / cocina) | 1 | 2 |
| [fcu/](fcu/) | Fan coil de plafón (FCU) | 1 | 1 |
| [filtrado-alberca/](filtrado-alberca/) | Filtrado de alberca | 1 | 1 |
| [generador/](generador/) | Generador eléctrico diésel | — | 1 |
| [intercambiador-placas/](intercambiador-placas/) | Intercambiador de placas | 1 | 1 |
| [mcc-vfd/](mcc-vfd/) | Muro técnico MCC + VFD | 1 | 1 |
| [split-minisplit/](split-minisplit/) | Splits, Liebert y mini-splits | 2 | 4 |
| [tanques/](tanques/) | Tanques de expansión / buffer | 1 | 1 |
| [torre-enfriamiento/](torre-enfriamiento/) | Torre de enfriamiento | 1 | 1 |
| [trane/](trane/) | Equipos Trane (RTU / Foundation / Tracer) | 1 | 4 |
| [tuberia-hidraulica/](tuberia-hidraulica/) | Tubería hidráulica (catálogo) | 1 | 1 |
| [vav/](vav/) | Cajas VAV (terminales) | 1 | 3 |
| [escenas/](escenas/) | Escenas compuestas (hoteles, campus, datacenter) | 1 | 6 |

**Total: 59 diseños** — 22 realistic + 35 voxel en carpetas, + 2 deployables en la raíz (abajo).

## Deployables (raíz, NO mover)

Estos dos archivos son **el producto desplegado** a producción y forman parte del pipeline
(`build-publish.mjs`). Viven en la raíz a propósito: el dashboard embebe al hotel por `iframe`
con ruta relativa, y moverlos rompería el deploy.

| Archivo | Qué es |
|---|---|
| `hotel-realista-ensamblado.html` | Hotel realista ensamblado (gemelo 3D desplegado) |
| `dashboard-energetico-v1.html` | Landing + tablero de consumo energético (embebe el hotel) |

Deploy: `node build-publish.mjs` → Cloudflare Pages (ofuscado). Ver [DEV.md](DEV.md).

## Otras carpetas

| Carpeta | Contenido |
|---|---|
| [client-designs/](client-designs/) | Copias de diseños 3D rescatados de proyectos de cliente (ver su README) |
| `publish/` | Build ofuscado generado para deploy (no editar a mano) |
| `tools/` | Utilidades (p. ej. `gen-catalog.py`) |
| `sources/` | Fuentes/documentos preservados de la investigación Research-SDD |
| `retros/` | Retrospectivas de sesión |

## Corpus de investigación (Research-SDD)

Los archivos `threejs-block*.md`, [`INDEX.md`](INDEX.md) y [`CATALOG.md`](CATALOG.md) son un
corpus de investigación **read-only** sobre cómo estos prototipos usan Three.js. No son diseños;
son documentación técnica. `CATALOG.md` se autogenera con `python3 tools/gen-catalog.py`.

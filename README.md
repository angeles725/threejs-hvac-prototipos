# Diseños 3D HVAC — Three.js

Workspace de **diseños 3D de equipos HVAC** construidos con Three.js. Cada equipo existe en
dos estilos:

- **`realistic`** — malla PBR fotorrealista (MeshStandardMaterial, IBL, sombras).
- **`voxel`** — voxel art isométrico (el estilo se diseña **primero** en voxel y luego se pasa a realista).

## Estructura del repositorio

| Carpeta / archivo | Qué contiene |
|---|---|
| [`disenos/`](disenos/) | Todos los diseños 3D, una carpeta por equipo (realistic + voxel juntos) |
| [`research/`](research/) | Corpus de investigación Research-SDD: `threejs-block*.md`, `INDEX.md`, `CATALOG.md`, `HANDBOOK.md`, `sources/`, `retros/`, `tools/` |
| [`client-designs/`](client-designs/) | Copias de diseños 3D rescatados de proyectos de cliente (ver su README) |
| `dashboard-energetico-v1.html` · `hotel-realista-ensamblado.html` | **Deployables** (raíz, ver abajo) |
| `build-publish.mjs` | Pipeline de deploy ofuscado → Cloudflare Pages |
| `publish/` · `node_modules/` | Generados (no editar a mano) |
| [`EQUIPOS-PENDIENTES.md`](EQUIPOS-PENDIENTES.md) | Backlog de diseños por crear, con prompts listos para claude.ai |
| [`DEV.md`](DEV.md) | Workflow de desarrollo (servidor localhost, sesiones) |

## Diseños por equipo (`disenos/`)

Una carpeta por equipo, con sus versiones realistic y voxel. Cada carpeta tiene su propio
`README.md` con la lista de archivos y títulos.

| Carpeta | Equipo | Realistic | Voxel |
|---|---|:---:|:---:|
| [ahu/](disenos/ahu/) | Manejadora de aire (AHU) | 1 | 1 |
| [bomba-centrifuga/](disenos/bomba-centrifuga/) | Bomba centrífuga end-suction | 1 | 1 |
| [caldera-acs/](disenos/caldera-acs/) | Caldera pirotubular + tanque ACS | 1 | 1 |
| [carcamo/](disenos/carcamo/) | Cárcamo de agua | 1 | — |
| [chiller/](disenos/chiller/) | Chillers (aire / tornillo-agua) | 2 | 3 |
| [cuarto-frio/](disenos/cuarto-frio/) | Cuarto frío | 2 | 1 |
| [ducteria/](disenos/ducteria/) | Ductería HVAC (catálogo) | 1 | 1 |
| [extractor/](disenos/extractor/) | Extractores (hongo / cocina) | 1 | 2 |
| [fcu/](disenos/fcu/) | Fan coil de plafón (FCU) | 1 | 1 |
| [filtrado-alberca/](disenos/filtrado-alberca/) | Filtrado de alberca | 1 | 1 |
| [generador/](disenos/generador/) | Generador eléctrico diésel | — | 1 |
| [intercambiador-placas/](disenos/intercambiador-placas/) | Intercambiador de placas | 1 | 1 |
| [mcc-vfd/](disenos/mcc-vfd/) | Muro técnico MCC + VFD | 1 | 1 |
| [split-minisplit/](disenos/split-minisplit/) | Splits, Liebert y mini-splits | 2 | 4 |
| [tanques/](disenos/tanques/) | Tanques de expansión / buffer | 1 | 1 |
| [torre-enfriamiento/](disenos/torre-enfriamiento/) | Torre de enfriamiento | 1 | 1 |
| [trane/](disenos/trane/) | Equipos Trane (RTU / Foundation / Tracer) | 1 | 4 |
| [tuberia-hidraulica/](disenos/tuberia-hidraulica/) | Tubería hidráulica (catálogo) | 1 | 1 |
| [vav/](disenos/vav/) | Cajas VAV (terminales) | 1 | 3 |
| [escenas/](disenos/escenas/) | Escenas compuestas (hoteles, campus, datacenter) | 1 | 6 |

### Equipos de datacenter

Conjunto generado para elevar la escena de datacenter al nivel de un render de referencia
(imagen objetivo). Todos voxel; los prompts viven en [`EQUIPOS-PENDIENTES.md`](EQUIPOS-PENDIENTES.md) (sección DATACENTER).

| Carpeta | Equipo | Voxel |
|---|---|:---:|
| [server-rack/](disenos/server-rack/) | Rack de servidores (42U) | 1 |
| [crac/](disenos/crac/) | CRAC/CRAH de precisión (downflow) | 2 |
| [in-row/](disenos/in-row/) | Enfriador in-row | 1 |
| [pdu/](disenos/pdu/) | PDU · distribución de energía | 1 |
| [dry-cooler/](disenos/dry-cooler/) | Dry cooler (banco de condensadores) | 1 |
| [contencion-pasillo/](disenos/contencion-pasillo/) | Contención de pasillo | 1 |
| [ups/](disenos/ups/) | UPS + banco de baterías (oficial claude.ai + 2 alternativas propias) | 3 |

**Total: 69 diseños** — 22 realistic + 45 voxel en `disenos/`, + 2 deployables en la raíz.

## Deployables (raíz, NO mover)

Estos dos archivos son **el producto desplegado** a producción y forman parte del pipeline
(`build-publish.mjs`, que los lee desde la raíz por nombre). El dashboard embebe al hotel por
`iframe` con ruta relativa; moverlos rompería el deploy.

| Archivo | Qué es |
|---|---|
| `hotel-realista-ensamblado.html` | Hotel realista ensamblado (gemelo 3D desplegado) |
| `dashboard-energetico-v1.html` | Landing + tablero de consumo energético (embebe el hotel) |

Deploy: `node build-publish.mjs` → Cloudflare Pages (ofuscado). Ver [DEV.md](DEV.md).

## Corpus de investigación (`research/`)

`research/threejs-block*.md`, [`research/INDEX.md`](research/INDEX.md) y
[`research/CATALOG.md`](research/CATALOG.md) son un corpus de investigación **read-only** sobre
cómo estos prototipos usan Three.js. No son diseños; son documentación técnica. `CATALOG.md` se
autogenera con `python3 research/tools/gen-catalog.py`.

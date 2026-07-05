# Manual del Diseñador 3D — Handbook del estudio three.js

> Síntesis terminal del corpus de investigación (39 bloques, `threejs-block1.md` a
> `threejs-block39.md`, más `WORKFLOW.md`, `INDEX.md` y `CATALOG.md`). Este documento es el manual
> de uso diario del equipo: qué hacemos, cómo lo hacemos, y qué normas no se negocian. Cada
> afirmación tiene su bloque de origen citado entre corchetes — si algo no cuadra con lo que ves en
> el código, el bloque citado tiene la evidencia completa (cita `file:line`, fuente oficial, o
> ambas).

---

## 1. Qué es este estudio

Este repositorio es un **estudio de diseño 3D**: producimos visualizaciones de equipos HVAC
(chillers, RTUs, splits, cuartos fríos, cárcamos de agua, data centers) y de su entorno/
infraestructura (plantas, terrenos, edificios), primero como arte voxel y después como render
realista. No construimos dashboards ni integraciones — eso lo hacen **proyectos de integración**
aparte (Tridium, Honeywell, bms-casino), que consumen los diseños que este estudio produce
[`client-designs/README.md`; Block 33 §33.1, §33.4].

La evidencia de esa separación de responsabilidades está en `client-designs/`: son copias de
rescate de tres integraciones cliente (`tridium-datacenter/`, `honeywell-mx60/`, `bms-casino/`)
que **reinventaron por su cuenta** el mismo scaffolding de renderer/luces/controles que este
repo ya tiene resuelto — prueba de que, si exportamos bien, esas reinvenciones dejan de ser
necesarias [Block 33 §33.1].

### Mapa del repositorio

| Carpeta/archivo | Qué contiene |
|---|---|
| `voxel/*.html` | Pase 1 — arte voxel (massing, InstancedMesh, cámara fake-isométrica) |
| `*-realistic*.html`, `*-realistico*.html`, `cuarto-3d.html` | Pase 2 — render realista (PBR, IBL, sombras horneadas) |
| `client-designs/` | Copias de rescate de proyectos de integración cliente (referencia, NO se edita) |
| `tools/probe.mjs` | Mide draws/triángulos en vivo vía Puppeteer/SwiftShader [Block 26] |
| `tools/capture.mjs` | Captura 4K supersample de cualquier prototipo [Block 38 §38.4] |
| `tools/gen-catalog.py` | Regenera `CATALOG.md` a partir de los bloques |
| `sources/web-snapshots/` | Fuentes oficiales preservadas (Filament, Khronos, W3C WAI, etc.) |
| `sources/manuals/` | Documentos oficiales descargados (ej. estándar BAS de Monash) |
| `CATALOG.md` | Tabla plana de los 39 bloques |
| `INDEX.md` | Mapa por capas (layers) de la investigación |
| `WORKFLOW.md` | Documento de proceso + punch list con marcadores DONE |
| `threejs-block1.md` … `threejs-block39.md` | El corpus de investigación completo |

Este manual **no reemplaza** el corpus — lo destila. Cuando necesites el detalle completo (cita
exacta, contraejemplo, fuente oficial), la Sección 5 te dice qué bloque leer.

---

## 2. El protocolo de creación

Cada pieza de equipo nuevo pasa por el mismo proceso de dos pases, validado en 25+ prototipos
del corpus [Block 12 §12.1]. No te saltes pasos: el pase voxel es barato y evita rehacer masa y
composición sobre geometría paramétrica cara.

### Paso 0 — Pedido

Define qué equipo es, a qué familia pertenece (chiller, RTU, split, cuarto frío, cárcamo,
data center...) y en qué contexto vive (unidad aislada vs. sala/planta/campus). Esto determina
si necesitas un shell compuesto (`lib/shells/room.js`, `datacenter.js`, etc. — ver Block 33
§33.3) además del componente de equipo.

### Paso 1 — Pase voxel (massing)

Objetivo: silueta, proporciones, bloques de color y descomposición en partes, a un cubo de
granularidad [Block 12 §12.2].

- Una sola `BoxGeometry(1,1,1)` compartida + un `InstancedMesh` por grupo de color
  (`setMatrixAt` + `instanceMatrix.needsUpdate = true`) [Block 2 §2.3].
- Partes animadas (fan, damper) **fuera** del InstancedMesh, como `Group`s independientes
  [Block 2 §2.3].
- `MeshStandardMaterial` de color plano — sin texturas, sin environment map.
- Cámara `PerspectiveCamera`, FOV ~40° (fake isométrico — nunca `OrthographicCamera`)
  [Block 7 §7.1].

### Paso 2 — Pase realista (build-out)

Objetivo: fidelidad de presentación sobre la masa ya validada en el paso 1. El archivo voxel es
la especificación dimensional/compositiva [Block 12 §12.3].

- **Geometría paramétrica** [Block 8 §8.1]: Cylinder (el caballo de batalla, 54 usos en el
  corpus), Torus, Extrude con bisel, Lathe, Shapes curvos, edición directa de vértices para
  partes a medida (aspas de ventilador).
- **Paleta PBR** con los valores corregidos (tabla completa en §3.1 de este manual)
  [Block 22 §22.5].
- **IBL**: `scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture` — sin
  descargar HDRs, el prototipo se mantiene autocontenido [Block 4 §4.1].
- **Sombras horneadas**: `PCFSoftShadowMap` 2048², frustum ortográfico ajustado a mano, bias
  −0.0003, y `renderer.shadowMap.autoUpdate = false` + `needsUpdate = true` una sola vez para
  escenas de sol estático (el ahorro de rendimiento más grande y más barato del corpus)
  [Block 5 §5.4].
- `THREE.Fog` escalado por escena, `CanvasTexture` para aletas/placas (dibujar, no descargar)
  [Block 9 §9.1].

### Paso 3 — Composición y cámara

- **Gramática diagonal**: azimut ~40-45°, elevación 20-28° — es la convención no escrita del
  corpus, medida en 19/21 archivos muestreados [Block 37 §37.2, §37.3].
- **FOV por tipo de toma**: hero de equipo 32-42° (banda normal/short-normal, ni gran angular ni
  teleobjetivo); planta/campus debería ir más ancho (70-90°) — hoy el corpus usa el mismo FOV
  para ambos, es una brecha real a corregir [Block 37 §37.1].
- Usa la tabla de spec de thumbnail de catálogo (§3.4 de este manual) para renders de comparación
  consistentes [Block 37 §37.5].

### Paso 4 — Verificación (gate)

No se entrega nada sin pasar este gate:

1. **Consola limpia** — sin errores ni warnings de three.js en devtools.
2. **Canvas visible** — la escena renderiza, controles responden.
3. **Screenshot de referencia** — captura con `tools/capture.mjs` para comparación visual
   [Block 38 §38.4].
4. **Presupuesto de rendimiento** — corre `node tools/probe.mjs "<archivo>"` contra un servidor
   local (`python3 -m http.server 8123`, nunca `file://` — rompe CORS de ES modules
   [Block 26 §26.2]) y compara contra la tabla de presupuestos por dispositivo (§3.2 de este
   manual) [Block 27 §27.4].

### Paso 5 — Kit de entrega

Por cada equipo, el kit completo [Block 38 §38.6]:

| Entregable | Cómo se genera |
|---|---|
| Hero PNG 4K | `tools/capture.mjs`, supersample vía DPR 4 [Block 38 §38.4] |
| Thumbnail de catálogo | Mismo harness, con el framing fijo de §3.4 [Block 37 §37.5] |
| `.glb` del modelo | `GLTFExporter` [Block 19 §19.2], optimizado con glTF-Transform/gltfpack [Block 25] |

---

## 3. Las normas

### 3.1 — Paleta PBR corregida (por familia de superficie)

Regla de oro, respaldada por Filament y por la especificación glTF 2.0: **el metalness casi
binario** — 0 para dieléctricos (pintura, plástico, caucho, vidrio, agua), cerca de 1 para
metales comprometidos (acero galvanizado, aluminio). Un metalness intermedio (0.2-0.55) en una
superficie sólida sin textura es un artefacto de mezcla de texel del *shader model*, no una
opción de autoría válida [Block 22 §22.3].

| Entrada | Antes | Corregido | Motivo |
|---|---|---|---|
| `skid` | metalness 0.55 | 0.9–1.0 | acero galvanizado/desnudo |
| `skidDark` | metalness 0.42 | 0.85–1.0 | variante oxidada del mismo |
| `coil` | metalness 0.55 | 0.9–1.0 | aletas de aluminio |
| `coilFrame` | metalness 0.5 | 0.85–1.0 | marco de acero |
| `compBody` | metalness 0.55 | 0.0–0.05 | carcasa pintada — dieléctrico |
| `compDark` | metalness 0.45 | 0.0–0.05 | carcasa pintada — dieléctrico |
| `compDome` | metalness 0.45 | 0.0–0.05 (mantener clearcoat) | domo pintado brillante — clearcoat ya modela el brillo |
| `panelBox` | metalness 0.22 | 0.0–0.05 | panel de gabinete pintado |
| `panelDk` | metalness 0.3 | 0.0–0.05 | panel de gabinete pintado |
| `hmi` | metalness 0.4 | 0.0 | bisel de plástico/vidrio |
| `spring` | metalness 0.5 | 0.0 (si pintado) o 1.0 (si acero desnudo) — elegir uno, no dejarlo intermedio | resorte aislador, hoy ambiguo |
| `hose` | metalness 0.4 | 0.0 | manguera de caucho, dieléctrico |
| `water` | metalness 0.55 | 0.0, reflectance≈0.5 (→F0 4%) o IOR 1.33 vía `MeshPhysicalMaterial` | líquido dieléctrico, 2% reflectancia medida |
| `copper` | `0xc0762e` | más cerca de `#f0a67a`–`#f7bc9e` | alinear al F0 de cobre medido por Filament, hoy demasiado oscuro/marrón |

Fuente completa de la auditoría: [Block 22 §22.4-22.5].

### 3.2 — Presupuestos de rendimiento por dispositivo

Draws (CPU-bound) y triángulos (GPU-bound) no se compensan 1:1 — el pase realista del corpus
está limitado por draws (1,539-2,747), el pase voxel está limitado por triángulos (>500k)
[Block 27 §27.1].

| Clase de dispositivo | Presupuesto de frame | Draws (objetivo) | Triángulos (objetivo) |
|---|---|---|---|
| Desktop, GPU integrada | 16.6 ms | ~500-800 | ~1-2M |
| Desktop, GPU dedicada | 16.6 ms | ~1000-1500 | ~3-5M+ |
| Móvil gama media (60 Hz) | 16.6 ms | ~300-500 | ~300-500k |
| Móvil ProMotion (120 Hz) | 8.3 ms | ~150-250 | ~150-250k |

Palancas: BatchedMesh/merge de draws para el pase realista; LOD/simplify/`instanceColor` para
reducir triángulos en el pase voxel [Block 27 §27.4, Block 11 §11.4].

### 3.3 — Rig de luces + variante estudio

El rig de tres luces del corpus ya implementa la teoría key/fill/rim sin haberlo declarado nunca
así [Block 23 §23.5]:

| Rol | Elemento | Valor |
|---|---|---|
| Key | `DirectionalLight(0xffffff, 1.5)`, con sombra | — |
| Fill | `DirectionalLight(0x88aaff, 0.4)` azul frío | ratio key:fill ≈ 3.75:1 |
| Rim | `DirectionalLight(0x00d4aa, 0.2)` teal | el más tenue de los tres |
| Ambient/bounce | `AmbientLight(0xffffff, 0.22-0.25)` + IBL (`scene.environment`) | fill distribuido y omnidireccional |

**Variante estudio** (opt-in, para shots de producto en metal reflectivo — el metal metálico-
binario necesita fuentes grandes y suaves para revelar curvatura, no un highlight puntual y
plano) [Block 23 §23.2, §23.6]:

| Luz | Tipo | Intensidad | Tamaño/ángulo | Posición |
|---|---|---|---|---|
| Key | `RectAreaLight` | ~5-8 | ancho/alto ≈ 1-1.5× la cara mayor del equipo | ~45° cámara-izquierda, en alto |
| Fill | `RectAreaLight` menor o `DirectionalLight(0x88aaff, 0.4)` | ~1/3-1/4 de key | panel menor | ~45° cámara-derecha |
| Rim | `DirectionalLight(0x00d4aa)` o `RectAreaLight` angosta | tenue | estrecha/dura si se quiere borde nítido | opuesta a key |

Requisito: `RectAreaLightUniformsLib.init()` debe correr una vez antes de renderizar cualquier
`RectAreaLight`; **no soporta sombras** — mantener el sol `DirectionalLight` para la sombra de
contacto [Block 23 §23.3-23.4].

### 3.4 — Colores de estado ISA-101 + tokens UI

Regla ISA-101, invertida respecto a la intuición ingenua: **gris/neutro es el estado normal**;
el color se reserva para lo anormal/accionable — si todo es colorido siempre, el operador deja
de prestarle atención al color [Block 29 §29.3].

```css
--status-neutral: #5a6878;   /* default/normal — gris, según ISA-101, no verde */
--status-ok:      #00ff66;   /* "encendido"/confirmado-bueno, únicamente */
--status-advisory:#ffb020;   /* ámbar — nivel advisory */
--status-alarm:   #ff2233;   /* rojo — alarma que requiere acción */
```

Tokens UI base (`lib/theme.css`, el sexto módulo de la librería — deliberadamente separado de la
paleta PBR de materiales 3D: uno gobierna cómo rebota la luz en un `MeshPhysicalMaterial`, el
otro de qué color es el texto de un `<div>`) [Block 36 §36.2]:

```css
:root {
  --bg: #06080d;
  --surface: rgba(10,14,22,.86);
  --border: rgba(0,212,170,.18);
  --text: #c8d4dc;
  --text-muted: #8fa0ab;   /* corregido — el valor auditado #5a6878 falla contraste 4.5:1 */
  --accent: #00d4aa;
  --fs-micro: 9px; --fs-body: 10px; --fs-label: 11px; --fs-heading: 13px;
  --font-mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px;
}
```

Los siete niveles de prioridad de alarma de Monash (P0-P6) se muestran como texto/rango, nunca
como un séptimo matiz de color — mezclar prioridad de ruteo con severidad visual falla la
seguridad para daltonismo [Block 36 §36.2, Block 39 §39.3].

### 3.5 — Vocabulario de motion

| Movimiento | Duración sugerida | Easing | Base |
|---|---|---|---|
| Hover/highlight (`OutlinePass`) | ~100-150ms | ease-out | NNG, nivel micro-feedback |
| Cambio de estado por click | ~150-250ms | ease-in-out | NNG, elemento UI pequeño |
| Cámara preset-a-preset / focus-on-part | ~700-1200ms | ease-in-out cúbico | dato propio del corpus (700ms, `data_center_voxel_isometrico_3d.html`) |
| Tour orbital continuo | N/A (barrido continuo de `theta`) | velocidad angular lineal | ver Block 34 §34.3 (interpolar por esféricas, no `lerpVectors` lineal — puede atravesar la geometría) |
| Vista explotada 0→1 | ~500-800ms, stagger opcional 40-80ms/parte | `smootherstep` | convención de un único uniforme 0→1 |
| Apertura de puerta/panel | ~400-600ms | ease-in-out, anticipación opcional | — |
| Movimiento de damper/louver | ~200-350ms | ease-in-out | **debe** re-hornear sombra si la escena usa sombras horneadas |

Fuente completa: [Block 34 §34.1, §34.5]. Gotcha de sombras horneadas + animación: ver §6 de
este manual.

### 3.6 — Reglas dataviz por widget

Ranking de Cleveland-McGill: posición/longitud (barra) es más precisa que ángulo (aguja de
gauge), que a su vez es más precisa que color/sombreado — nunca uses un dial 3D o una aguja para
un escalar simple [Block 39 §39.1-§39.2].

| Widget | Codificación | Regla de color | Base |
|---|---|---|---|
| Panel de tendencia | línea, posición/longitud, ≤2-3 series | secuencial (métrica absoluta) o divergente azul↔naranja (relativa a setpoint) | Block 39 §39.5 |
| Tile de valor actual | número, dígito legible | relleno ISA-101 gris/ámbar/rojo | Block 39 §39.4 |
| Fila de alarma | texto + icono, NUNCA un gráfico | color de prioridad cualitativo (Monash P0-P6) | Block 39 §39.5 |
| Overlay de desviación de setpoint | relleno o banda, divergente, anclado en el setpoint | azul↔neutro↔naranja — NO el rojo/verde literal de Monash (falla daltonismo) | Block 39 §39.3 |
| Barra reemplaza-gauge | barra horizontal, codificada por longitud | secuencial o color de estado único, nunca aguja/dial | Block 39 §39.2 |

Prohibido explícitamente: gauges 3D, agujas radiales para un escalar único, pares rojo-verde
divergentes, más de ~2 canales pre-atentivos apilados en un elemento, gráficos dentro de la
escena WebGL [Block 39 §39.5].

### 3.7 — Accesibilidad mínima

- **Contraste de texto ≥ 4.5:1** contra el fondo (`#06080d`) — verificado con la fórmula WCAG de
  luminancia relativa; el único fallo encontrado en el corpus fue `--text-muted` (`#5a6878`,
  3.52:1) — usar `#8fa0ab` (~6.4:1) en su lugar [Block 36 §36.3].
- **Nunca solo color**: todo estado/leyenda debe combinar color + texto (+ icono cuando aplique)
  — regla WCAG 1.4.1, ya cumplida por accidente en algunos botones del corpus, nunca formalizada
  [Block 36 §36.3].
- **Target táctil ≥ 24×24px CSS** — el botón estándar del corpus renderiza ~22px, justo debajo
  del mínimo; subir el padding vertical a `--space-2` (8px) lo corrige [Block 36 §36.3].
- **`prefers-reduced-motion`**: ninguno de los 27 prototipos lo implementa hoy, ni siquiera para
  la única animación CSS existente (`.alarm { animation: blink 1s infinite; }`). Mínimo
  obligatorio en `lib/theme.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .alarm { animation: none; box-shadow: 0 0 0 2px var(--status-alarm); }
}
```

[Block 36 §36.3].

---

## 4. Recetas rápidas

### 4.1 — Escena base (scaffolding + sombras horneadas)

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06080d);
scene.fog = new THREE.Fog(0x06080d, 30, 90); // scale per scene size

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // baked shadows — biggest cheap perf win
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
camera.position.set(6, 5, 8); // ~45deg azimuth, ~24deg elevation — house hero convention

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0003;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0x88aaff, 0.4));
scene.add(new THREE.DirectionalLight(0x00d4aa, 0.2));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

function bakeShadows() { renderer.shadowMap.needsUpdate = true; } // call once after scene is built,
                                                                    // and again after any shadow-caster moves

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
bakeShadows();
animate();
```

Base: [Block 1 §1.3, Block 33 §33.2, Block 5 §5.4].

### 4.2 — InstancedMesh por color

```js
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const mesh = new THREE.InstancedMesh(cubeGeo, material, positions.length);
mesh.castShadow = mesh.receiveShadow = true;

const m = new THREE.Matrix4();
positions.forEach((p, i) => {
  m.setPosition(p.x + 0.5, p.y + 0.5, p.z + 0.5);
  mesh.setMatrixAt(i, m);
});
mesh.instanceMatrix.needsUpdate = true; // REQUIRED or the GPU never sees the transforms
mesh.computeBoundingSphere();           // instances have their OWN bounding volume, recompute after fill
scene.add(mesh);

// Animated parts (fans, dampers) stay OUTSIDE the InstancedMesh as separate Groups.
```

Base: [Block 2 §2.2-§2.3].

### 4.3 — Vista explotada animada

```js
import { MathUtils } from 'three';

// Precompute per-part offset vectors from an explosion center BEFORE any merge.
const explodeOffsets = parts.map(p => p.position.clone().sub(explosionCenter).normalize());

let explodeValue = 0; // single 0..1 uniform driving every part at once (industry convention)
function setExplode(target, durationMs = 650) {
  const start = explodeValue, t0 = performance.now();
  function step(now) {
    const t = Math.min((now - t0) / durationMs, 1);
    explodeValue = MathUtils.lerp(start, target, MathUtils.smootherstep(t, 0, 1));
    parts.forEach((part, i) => {
      const dist = explodeValue * explodeDistance;
      part.position.copy(restPositions[i]).addScaledVector(explodeOffsets[i], dist);
    });
    renderer.shadowMap.needsUpdate = true; // re-bake — parts moved (see §6 gotcha)
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

Base: [Block 29 §29.1, §29.6 fila 2; Block 34 §34.2, §34.4].

### 4.4 — Hotspot CSS2D

```js
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // clicks fall through to the canvas
document.body.appendChild(labelRenderer.domElement);

const div = document.createElement('div');
div.className = 'hotspot';
div.textContent = 'Compressor';
const hotspot = new CSS2DObject(div);
compressorAnchor.add(hotspot); // a plain Object3D positioned at the part's connection point

// in the render loop, alongside renderer.render(scene, camera):
labelRenderer.render(scene, camera);
```

Base: [Block 30 §30.1; Block 29 §29.4 — patrón Blender-empty, adaptado a anclas procedurales].

### 4.5 — Captura 4K

```bash
node tools/capture.mjs "trane-rtu-realistic-v10.html"
# viewport 960x720 CSS @ DPR 4 => framebuffer 3840x2880
# render-then-capture path (page.screenshot on the <canvas> element) —
# no preserveDrawingBuffer needed, works unmodified against any existing prototype
```

Base: [Block 38 §38.1, §38.4].

### 4.6 — Export `.glb` + optimización

```js
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
new GLTFExporter().parse(equipmentGroup, (result) => {
  saveArrayBuffer(result, 'equipment.glb'); // result is an ArrayBuffer when binary:true
}, console.error, { binary: true, onlyVisible: true });
```

Perfil "web-viewer" (catálogo con auto-framing) [Block 25 §25.5a]:

```bash
gltf-transform dedup in.glb tmp1.glb
gltf-transform prune tmp1.glb tmp2.glb
gltf-transform weld tmp2.glb tmp3.glb
gltf-transform resize tmp3.glb tmp4.glb --width 1024 --height 1024
gltf-transform etc1s tmp4.glb out.glb --compression 3
gltf-transform meshopt out.glb out.glb --level high
```

Perfil "mapa MapLibre" (equipo georreferenciado, repetido muchas veces) [Block 25 §25.5c]:

```bash
gltfpack -i in.glb -o out.glb -cc -si 0.5 -tc -mi
```

---

## 5. Ruta de lectura del corpus

| Si vas a... | Lee estos bloques |
|---|---|
| Crear un equipo nuevo desde cero | Block 12 (síntesis del flujo), Block 1 §1.3 (scaffolding) |
| Corregir un material que se ve "raro" (plástico, apagado) | Block 22 (valores PBR), Block 3 (sistema de materiales) |
| Diseñar un rig de luces para un shot de producto | Block 23 (teoría + RectAreaLight), Block 4 (rig de casa + IBL) |
| Elegir cámara/FOV/composición para un hero shot | Block 37 (gramática diagonal, FOV, thumbnail spec), Block 7 (histograma de FOV) |
| Optimizar draws/triángulos | Block 11 (playbook), Block 27 (presupuestos por dispositivo), Block 26 (baseline medido) |
| Agregar exploded view, X-ray, hotspots o colores de estado | Block 29 (checklist HVAC completo) |
| Animar cualquier transición (cámara, puerta, explosión) | Block 34 (timing/easing/machinery), Block 5 §5.4 (gotcha de sombras) |
| Construir un dashboard con datos en vivo | Block 30 (arquitectura), Block 39 (craft de gráficos) |
| Diseñar los tokens 2D/CSS del overlay | Block 36 (tokens + accesibilidad) |
| Exportar a `.glb` o publicar en un mapa/visor | Block 19 (export/import), Block 25 (pipeline de optimización), Block 16 (MapLibre) |
| Modelar terreno o edificio de contexto | Block 31 (terreno), Block 32 (edificios/BIM) |
| Traer una pieza desde Blender (orgánica, con bake de AO) | Block 28 (round-trip Blender ↔ three.js) |
| Entender qué mueve el rendimiento hoy (medido, no intuido) | Block 26 (baseline en vivo), Block 27 (presupuestos) |
| Entregar el kit final (4K, thumbnail, `.glb`, QA visual) | Block 38 (contrato de captura + regresión de screenshots) |
| Entender por qué se propone una librería `lib/` compartida | Block 33 (arquitectura del sistema de diseño) |

---

## 6. Errores que ya cometimos (no repetir)

1. **Metalness intermedio en superficies sólidas.** 13 de 24 entradas de la paleta tenían
   metalness entre 0.2 y 0.55 en materiales sin textura (carcasas pintadas, mangueras, agua). Es
   un artefacto de mezcla de texel según Filament y la spec glTF, no una opción de autoría —
   corrige a 0 (dieléctrico) o ~1 (metal), nunca a la mitad
   [`chiller-aircooled-realistic (7).html:177-202`; Block 22 §22.3-§22.5].

2. **`transmission` mezclado con `opacity` en vidrio.** Los materiales de vidrio del corpus
   usaban `transmission:0.9` junto con `opacity:0.5` — la documentación exige `opacity:1` cuando
   se usa transmission física; la opacidad reducida ya la resuelve la propia transmission
   [Block 3 §3.4; corregido 2026-07-04, commit `2750b9d`].

3. **`CanvasTexture` sin `colorSpace = SRGBColorSpace`.** Las texturas de aletas y placas
   dibujadas con `CanvasTexture` no declaraban su espacio de color — el color sale desplazado
   respecto a lo que ves en el canvas 2D de origen [Block 9 §9.3; corregido 2026-07-04, commit
   `2750b9d`].

4. **`FloatType` en iOS.** DataTextures con `FloatType` fallan en iOS con filtrado lineal; el fix
   verificado en el foro es `HalfFloatType` (o `NearestFilter` si no se necesita interpolación)
   [Block 20 §20.1].

5. **Sombras sin hornear.** Dejar `shadowMap.autoUpdate` en `true` (el default) para escenas de
   sol estático recalcula el shadow pass cada frame sin necesidad — es la ganancia de
   rendimiento más grande y más barata disponible; `cuarto-3d.html` ya la adoptó
   [Block 5 §5.4; backporteado a 22 archivos, commit `d420dab`]. **Gotcha**: si horneas sombras Y
   animas una parte que proyecta sombra (puerta, damper, vista explotada), la sombra se queda
   congelada en la pose previa a menos que llames `renderer.shadowMap.needsUpdate = true` durante
   la animación [Block 34 §34.4].

6. **FOV de hero en escenas de planta.** Usar el mismo FOV normal (38-42°) tanto para un shot de
   equipo individual como para una planta o campus completo — una toma de planta necesita un FOV
   mucho más ancho (70-90°) para tener sentido compositivo; hoy el corpus no varía el FOV por
   escala de la toma, y es una corrección pendiente, no solo una observación
   [`cuarto-frio-plano-realistic (6).html:86`; Block 37 §37.1].

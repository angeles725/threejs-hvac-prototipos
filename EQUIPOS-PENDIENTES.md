# Equipos pendientes de crear (voxel art · claude.ai)

> Lista de trabajo. Cada equipo trae su **PROMPT listo para pegar en claude.ai** (pase 1: voxel
> art). El pase 2 (realistic) se hace DESPUÉS con la plantilla del final, usando el voxel como
> especificación dimensional. Soltar cada HTML en `voxel/` con el nombre indicado; Claude Code
> lo baselinea, audita e integra. Marcar `[x]` al entregar.

## ESTADO DEL INVENTARIO — 2026-07-05

**✅ Entregados e integrados en el hotel (v4, commit 215d9e5):**

| # | Equipo | Archivo entregado | Baseline standalone |
|---|--------|-------------------|---------------------|
| 1 | Bomba centrífuga | `voxel/bomba-centrifuga-voxel.html` | 183 draws / 320,591 tris |
| 2 | Manejadora / AHU | `voxel/ahu-cuarto-maquinas-voxel.html` | 252 draws / 104,918 tris |
| 3 | Fan Coil de plafón | `voxel/fcu-plafon-voxel.html` | 779 draws / 339,640 tris |
| 4 | Chiller enfriado por agua | `voxel/chiller-tornillo-agua-voxel-v1.html` | 86 draws / 174,642 tris |

**📦 Ya existen en `voxel/` (era claude.ai — NO recrear; se auditan y rescatan al integrar):**

- Torre de enfriamiento → `voxel/cooling-tower-voxel (1).html` (pendiente de trasplante al hotel, v5)
- Caja VAV → `voxel/vav-box-voxel.html` + variantes `(2)`/`(7)` (pendiente de trasplante al hotel, v5)
- Chiller enfriado por aire → `voxel/chiller-aircooled-voxel (7).html` / `chiller-enfriado-aire-voxel (7).html`
- RTU paquete → `voxel/trane-rtu-voxel__6_ (3).html` · Tracer/tablero → `voxel/tracer-package-voxel (3).html`
- Minisplit / split / Liebert → `voxel/minisplit-voxel-v2 (4).html`, `split-system-voxel.html`, `liebert-split-voxel*.html`
- Extractor de cocina → `voxel/extractor-cocina-voxel (2).html` · Generador → `voxel/generador-electrico-voxel (1).html`

**❌ Faltan por crear (prompts abajo):** 5 caldera+ACS · 6 intercambiador de placas (lo pide el
cuarto de máquinas de alberca del hotel) · 7 tablero VFDs · 8 extractor hongo · 9 kit ductos ·
10 tanque expansión · **11 filtro de arena + bomba de alberca (lo pide el hotel — NUEVO)**.

## REGLAS DE CASA — pegar al FINAL de cada prompt

```
Reglas técnicas obligatorias: three.js r0.160.0 vía importmap (unpkg). TODOS los voxeles
estáticos en InstancedMesh por color (BoxGeometry(1,1,1) compartida, setMatrixAt +
instanceMatrix.needsUpdate); partes animadas (aspas, acoplamientos, turbinas) en Groups
SEPARADOS fuera del InstancedMesh. Renderer: ACESFilmicToneMapping exposure 1.05,
outputColorSpace SRGBColorSpace, PCFSoftShadowMap 2048, setPixelRatio(min(devicePixelRatio,2)).
Rig de luces: sol blanco 1.5 con sombras + relleno azul 0x88aaff 0.4 + rim teal 0x00d4aa 0.2 +
ambiente 0.25 + scene.environment con PMREMGenerator/RoomEnvironment. OrbitControls con
damping 0.08 y autoRotate con toggle. Declara la escala en comentario: // SCALE: 1 voxel = 0.1 m
y respeta las dimensiones reales indicadas. PROHIBIDO: geometría suave (cilindros/esferas de
alta segmentación), texturas de imagen, librerías extra. UI: header con nombre del equipo,
leyenda de colores de flujos arriba-derecha, panel CONTROL DE EQUIPO abajo-derecha con los
toggles indicados, fondo oscuro #06080d, fuente monoespaciada.
```

---

## 🔴 PRIORIDAD ALTA (los pide el hotel)

- [x] **1. Bomba centrífuga** → entregado: `voxel/bomba-centrifuga-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una BOMBA
CENTRÍFUGA montada en base (end-suction) de cuarto de máquinas HVAC, con alta densidad de
micro-voxeles (miles de cubos pequeños, estilo detallado).
Partes obligatorias: skid/base de concreto con pernos de anclaje; motor eléctrico con aletas de
enfriamiento y caja de conexiones; guarda-acoplamiento con rejilla (el ACOPLAMIENTO gira —
animado); voluta espiral con brida de descarga vertical hacia arriba y succión horizontal;
manómetros en succión y descarga (carátulas de color); válvulas de compuerta en ambas líneas con
volantes rojos; tramo de tubería con bridas de pernos visibles en ambos extremos.
Dimensión real: ~1.4 m largo × 0.6 m ancho × 0.8 m alto (más tubería).
Colores: voluta azul industrial, motor gris oscuro, base concreto, tubería con bandas de color
según flujo (azul agua fría), acentos amarillos de seguridad en la guarda.
Leyenda de flujos: Succión / Descarga / Sentido de giro.
Panel CONTROL DE EQUIPO: BOMBA ON-OFF (acelera/detiene el acoplamiento con inercia),
VIBRACIÓN ON-OFF (jitter sutil del conjunto motor-bomba), AUTO-ROTATE.
```

- [x] **2. Manejadora / AHU** → entregado: `voxel/ahu-cuarto-maquinas-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una MANEJADORA
DE AIRE (AHU) horizontal de cuarto de máquinas, seccionada tipo CORTE para ver el interior,
con alta densidad de micro-voxeles. (NO es un rooftop RTU: es la caja modular interior.)
Partes obligatorias, en tren de izquierda a derecha: sección de MEZCLA con dos compuertas de
persianas (retorno arriba, aire exterior atrás — las persianas ROTAN, animadas); banco de
FILTROS plisados (paneles en zigzag, color crema, removibles visualmente); SERPENTÍN de
enfriamiento con aletas finas (celosía teal/cobre) y charola de condensados con drenaje;
sección de VENTILADOR centrífugo tipo plug-fan con rodete de álabes visibles (GIRA — animado)
y motor; puertas de acceso con bisagras y manijas en cada sección; conexión de ducto de
suministro con transición. Panel de control lateral con LEDs.
Dimensión real: ~3.5 m largo × 1.6 m ancho × 2 m alto.
Colores: paneles exteriores gris claro con marcos oscuros, interior por sección (filtros crema,
serpentín teal, ventilador azul), tubería de agua helada entrando al serpentín con bandas azules.
Leyenda: Aire retorno / Aire exterior / Aire suministro / Agua helada.
Panel CONTROL DE EQUIPO: VENTILADOR ON-OFF, COMPUERTAS ABRIR-CERRAR, CORTE ON-OFF (muestra/
oculta los paneles frontales para ver el interior), AUTO-ROTATE.
```

- [x] **3. Fan Coil (FCU) de plafón** → entregado: `voxel/fcu-plafon-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un FAN COIL
horizontal oculto de plafón (como los de cuartos de hotel), con vista de CORTE, alta densidad
de micro-voxeles.
Partes obligatorias: gabinete plano galvanizado; turbina tangencial o doble turbina centrífuga
pequeña (GIRAN — animadas); serpentín a 2 tubos con aletas (celosía teal) y conexiones de agua
con válvulas pequeñas; charola de condensados con tubito de drenaje; plenum de descarga con
rejilla lineal; filtro plano de retorno; cableado a un termostato de pared (pieza aparte,
pequeña, con display).
Dimensión real: ~1.1 m largo × 0.6 m fondo × 0.3 m alto (es DELGADO — respeta la esbeltez).
Colores: gabinete galvanizado claro, turbinas azules, serpentín teal, charola oscura.
Leyenda: Agua helada / Retorno / Suministro / Condensados.
Panel CONTROL DE EQUIPO: VENTILADOR 3 VELOCIDADES (OFF-LO-HI, cambia velocidad de giro),
CORTE ON-OFF, AUTO-ROTATE.
```

- [x] **4. Chiller enfriado por agua** → entregado: `voxel/chiller-tornillo-agua-voxel-v1.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un CHILLER
ENFRIADO POR AGUA de tornillo para cuarto de máquinas, alta densidad de micro-voxeles, al nivel
de detalle de un render técnico de fabricante.
Partes obligatorias: DOS barriles horizontales apilados (evaporador abajo, condensador arriba)
con tapas bridadas de pernos visibles; compresor de TORNILLO montado longitudinalmente sobre
los barriles con motor acoplado; panel de control grande con pantalla (LEDs animables) y
gabinete eléctrico; tubería de interconexión de refrigerante entre barriles; CUATRO bocas de
agua bridadas grandes (entrada/salida evaporador en azul, entrada/salida condensador en rojo)
con tramos de tubería; válvulas de servicio; placa de datos; patas/aisladores de neopreno.
Dimensión real: ~4.5 m largo × 1.8 m ancho × 2.2 m alto.
Colores: barriles verde industrial oscuro (estilo Trane/York) o azul (elige uno y sé
consistente), compresor gris metálico, tubería agua helada AZUL y agua de condensados ROJA.
Leyenda: Agua helada (salida/retorno) / Agua condensados (a torres) / Refrigerante.
Panel CONTROL DE EQUIPO: COMPRESOR ON-OFF (vibración sutil + LEDs del panel), % CARGA
(25/50/75/100 — cambia intensidad de LEDs), AUTO-ROTATE.
```

## 🟡 PRIORIDAD MEDIA (cuarto de máquinas completo)

- [ ] **5. Caldera + tanque ACS** → `voxel/caldera-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una CALDERA de
tubos de humo horizontal con su TANQUE vertical de agua caliente sanitaria al lado, alta
densidad de micro-voxeles.
Partes: cuerpo cilíndrico voxelizado de la caldera con tapa frontal abisagrada y mirilla;
quemador frontal con tren de gas (tubería amarilla con válvulas); chimenea vertical con
sombrerete; panel de control con display; tanque ACS vertical aislado (bandas de color) con
termómetro; bomba de recirculación pequeña entre ambos; tubería de agua caliente NARANJA/ROJA
con válvulas y check.
Dimensión real: caldera ~2.5 m largo × 1.5 m alto; tanque ~1 m diámetro × 2 m alto.
Colores: caldera azul oscuro o verde con frente negro, quemador metálico, gas AMARILLO,
agua caliente NARANJA.
Leyenda: Gas / Agua caliente / Recirculación / Gases de combustión.
Panel CONTROL DE EQUIPO: QUEMADOR ON-OFF (resplandor naranja animado en la mirilla + humo
sutil de chimenea con sprites), BOMBA RECIRC ON-OFF, AUTO-ROTATE.
```

- [ ] **6. Intercambiador de placas** → `voxel/intercambiador-placas-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un
INTERCAMBIADOR DE CALOR DE PLACAS con bastidor, alta densidad de micro-voxeles.
Partes: paquete de placas corrugadas visible de canto (láminas alternadas con separación —
patrón de aletas); bastidor con placa fija y placa móvil; tirantes/espárragos largos con
tuercas a los lados; 4 bocas bridadas (2 circuito caliente ROJO, 2 circuito frío AZUL) con
tramos de tubería y termómetros; base metálica.
Dimensión real: ~1.5 m largo × 0.6 m ancho × 1.4 m alto.
Leyenda: Circuito primario (caliente) / Circuito secundario (frío).
Panel CONTROL DE EQUIPO: FLUJO ON-OFF (partículas animadas entrando/saliendo por las bocas),
AUTO-ROTATE.
```

- [ ] **7. Tablero eléctrico + VFDs** → `voxel/tablero-vfd-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un muro técnico
con TABLERO ELÉCTRICO MCC y TRES VARIADORES DE FRECUENCIA (VFD) de pared, alta densidad de
micro-voxeles.
Partes: gabinete MCC de piso con puertas (manijas y ranuras de ventilación), interruptor
principal con palanca; 3 VFDs de pared de distintos tamaños con displays (LEDs de 7 segmentos
simulados con voxeles emisivos), botoneras y potenciómetro; tubería conduit metálica conectando
todo con codos y cajas condulet; canaleta portacables; etiquetas de seguridad amarillas;
lámpara piloto roja/verde por equipo.
Dimensión real: muro ~4 m; MCC ~2 m alto; VFDs ~0.4-0.7 m.
Leyenda: Alimentación / Control / A motor.
Panel CONTROL DE EQUIPO: VFD-1/2/3 ON-OFF (cambia LEDs y lámparas piloto), FALLA SIMULADA
(parpadeo rojo en un VFD), AUTO-ROTATE.
```

- [ ] **8. Extractor de azotea (hongo)** → `voxel/extractor-azotea-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un EXTRACTOR
DE AIRE tipo HONGO de azotea sobre su base curb, alta densidad de micro-voxeles.
Partes: curb de azotea con impermeabilizante marcado; garganta con rejilla anti-pájaros;
campana hongo con domo escalonado voxelizado; rodete centrífugo visible por debajo de la
campana (GIRA — animado); motor con capuchón; ducto corto de conexión bajo el curb;
desconectador eléctrico pequeño al lado.
Dimensión real: ~1.2 m diámetro campana × 1.1 m alto total.
Colores: campana aluminio, curb gris oscuro, rodete azul.
Leyenda: Aire de extracción.
Panel CONTROL DE EQUIPO: EXTRACTOR ON-OFF (giro con inercia + partículas de aire saliendo),
AUTO-ROTATE.
```

- [ ] **11. Filtro de arena + bomba de alberca** → `voxel/filtro-arena-alberca-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: el EQUIPO DE
FILTRADO DE ALBERCA de un cuarto de máquinas de hotel — FILTRO DE ARENA + BOMBA DE ALBERCA
con trampa de pelos — con alta densidad de micro-voxeles.
Partes obligatorias: tanque de filtro de arena vertical (casquetes voxelizados, boca de
inspección superior con abrazadera, mirilla lateral); válvula multipuerto de 6 posiciones
encima o al lado con palanca; manómetros de entrada/salida (carátulas de color); bomba de
alberca con trampa de pelos de tapa transparente (canastilla visible) y motor con aletas
(el impulsor/acoplamiento GIRA — animado); tubería PVC con válvulas de bola de palanca roja;
tramo de retorno y tramo de succión con bridas; base/patín con anclas.
Dimensión real: filtro ~1.2 m diámetro × 1.5 m alto; bomba ~0.8 m largo; conjunto ~2.5 m.
Colores: tanque azul o arena (elige uno y sé consistente), multipuerto negra con palanca
amarilla, PVC blanco/gris claro, trampa transparente, motor gris oscuro.
Leyenda: Succión (de alberca) / Retorno (a alberca) / Retrolavado (a drenaje).
Panel CONTROL DE EQUIPO: BOMBA ON-OFF (giro con inercia), RETROLAVADO ON-OFF (invierte el
sentido de las partículas de flujo), AUTO-ROTATE.
```

## 🟢 PRIORIDAD BAJA (kit de acabados)

- [ ] **9. Kit ductos/difusores** → `voxel/kit-ductos-voxel.html`

```
Crea una ESCENA-CATÁLOGO de VOXEL ART 3D en un solo archivo HTML standalone: piezas modulares
de DUCTERÍA HVAC exhibidas en fila sobre pedestales, alta densidad de micro-voxeles.
Piezas: tramo recto rectangular con brida tipo TDC; codo 90° con álabes guía visibles (corte);
transición rectangular-a-circular; ducto flexible (anillos voxelizados); difusor de plafón de
4 vías con conos concéntricos; rejilla lineal de suministro; rejilla de retorno con filtro;
compuerta de volumen manual con cuadrante y manija.
Escala real: tramos de ~1.2 m, difusores de 0.6 m.
Colores: ducto galvanizado claro, aislamiento exterior gris en un tramo (medio forrado para
mostrar ambos), difusores blancos, manijas rojas.
Leyenda: Suministro / Retorno / Extracción.
Panel CONTROL DE EQUIPO: COMPUERTA ABRIR-CERRAR (rota la hoja), ETIQUETAS ON-OFF (nombre
flotante sobre cada pieza), AUTO-ROTATE.
```

- [ ] **10. Tanque de expansión / buffer** → `voxel/tanque-expansion-voxel.html`

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un TANQUE DE
EXPANSIÓN de membrana vertical y un TANQUE BUFFER de agua helada al lado, alta densidad de
micro-voxeles.
Partes: tanque de expansión con casquetes voxelizados y banda de color marcando la línea de
membrana, válvula de aire tipo Schrader arriba, conexión inferior con válvula; tanque buffer
más grande aislado con 4 bocas bridadas y termómetros; manómetros; patas con anclas; placa
de datos en ambos.
Dimensión real: expansión ~0.6 m diámetro × 1.5 m alto; buffer ~1.2 m diámetro × 2 m alto.
Colores: expansión rojo industrial, buffer azul con aislamiento gris.
Leyenda: Agua helada / Aire precarga.
Panel CONTROL DE EQUIPO: NIVEL/PRECARGA (sube-baja la banda de membrana), AUTO-ROTATE.
```

---

## PASE 2 — REALISTIC (usar DESPUÉS, cuando el voxel esté aprobado)

Plantilla — sustituir `<EQUIPO>` y adjuntar/referenciar el archivo voxel aprobado:

```
Crea la versión SEMI-REALISTA en un solo HTML standalone del <EQUIPO> adjunto en voxel art.
El voxel es la ESPECIFICACIÓN DIMENSIONAL Y DE COMPOSICIÓN: respeta tamaños, proporciones,
posiciones de partes y paleta de colores por zona. Técnica: geometría paramétrica de three.js
(Cylinder/Torus/Extrude/Lathe con biseles — nada de cubos ahora), materiales
MeshStandardMaterial con valores PBR físicamente plausibles (metal pintado: metalness 0,
roughness 0.5-0.6; metal desnudo: metalness 1, roughness 0.3-0.45; NUNCA metalness intermedio
en color sólido), MeshPhysicalMaterial solo para vidrio (transmission, opacity 1) y clearcoat;
scene.environment con PMREMGenerator/RoomEnvironment; ACESFilmicToneMapping 1.05;
SRGBColorSpace; PCFSoftShadowMap 2048 con sombras horneadas (autoUpdate=false, needsUpdate en
toggles); niebla sutil; texturas SOLO procedurales por CanvasTexture (aletas, placas de datos)
con colorSpace SRGBColorSpace. Mismas animaciones y mismo panel CONTROL DE EQUIPO que el voxel.
r0.160.0 vía importmap unpkg. // SCALE: 1 unidad = 1 m.
```

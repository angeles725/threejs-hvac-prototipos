# Equipos pendientes de crear (voxel art · claude.ai)

> Lista de trabajo. Cada equipo trae su **PROMPT listo para pegar en claude.ai** (pase 1: voxel
> art). El pase 2 (realistic) se hace DESPUÉS con la plantilla del final, usando el voxel como
> especificación dimensional. Soltar cada HTML en **su carpeta de equipo dentro de `disenos/`** con
> el nombre indicado (tras las reorg de 2026-07-09 ya **no existe** `voxel/`; los diseños viven en
> `disenos/<equipo>/`, p. ej. `disenos/server-rack/`, `disenos/ups/`). Las rutas `voxel/…` de las
> tablas de abajo son HISTÓRICAS: su ubicación real ahora es `disenos/<equipo>/<archivo>`.
> Claude Code lo baselinea, audita e integra. Marcar `[x]` al entregar.

## ESTADO DEL INVENTARIO — 2026-07-05

**✅ Entregados e integrados en el hotel (v4, commit 215d9e5):**

| # | Equipo | Archivo entregado | Baseline standalone |
|---|--------|-------------------|---------------------|
| 1 | Bomba centrífuga | `voxel/bomba-centrifuga-voxel.html` | 183 draws / 320,591 tris |
| 2 | Manejadora / AHU | `voxel/ahu-cuarto-maquinas-voxel.html` | 252 draws / 104,918 tris |
| 3 | Fan Coil de plafón | `voxel/fcu-plafon-voxel.html` | 779 draws / 339,640 tris |
| 4 | Chiller enfriado por agua | `voxel/chiller-tornillo-agua-voxel-v1.html` | 86 draws / 174,642 tris |
| 6 | Intercambiador de placas | `voxel/intercambiador-placas-voxel-v1.html` | 112 draws / 674,457 tris |
| 8 | Extractor de azotea (hongo) | `voxel/extractor-hongo-voxel-v1.html` | 253 draws / 648,540 tris |
| 9 | Kit ductos/difusores | `voxel/ducteria-catalogo-voxel-v1.html` | 55 draws / 1,262,043 tris |
| 10 | Tanque expansión / buffer | `voxel/tanques-expansion-buffer-voxel-v1.html` | 53 draws / 236,339 tris |
| 11 | Filtro de arena + bomba alberca | `voxel/filtrado-alberca-voxel-v1.html` | 107 draws / 413,292 tris |
| 5 | Caldera + tanque ACS | `voxel/caldera-acs-voxel.html` | 139 draws / 553,062 tris |
| 7 | Tablero eléctrico + VFDs | `voxel/mcc-vfd-voxel-v1.html` | 229 draws / 1,289,844 tris |
| 12 | Kit tubería hidráulica | `voxel/tuberia-hidraulica-catalogo-voxel-v1.html` | 269 draws / 2,298,469 tris |

**📦 Ya existen en `voxel/` (era claude.ai — NO recrear; se auditan y rescatan al integrar):**

- Torre de enfriamiento → `voxel/cooling-tower-voxel (1).html` (pendiente de trasplante al hotel, v5)
- Caja VAV → `voxel/vav-box-voxel.html` + variantes `(2)`/`(7)` (pendiente de trasplante al hotel, v5)
- Chiller enfriado por aire → `voxel/chiller-aircooled-voxel (7).html` / `chiller-enfriado-aire-voxel (7).html`
- RTU paquete → `voxel/trane-rtu-voxel__6_ (3).html` · Tracer/tablero → `voxel/tracer-package-voxel (3).html`
- Minisplit / split / Liebert → `voxel/minisplit-voxel-v2 (4).html`, `split-system-voxel.html`, `liebert-split-voxel*.html`
- Extractor de cocina → `voxel/extractor-cocina-voxel (2).html` · Generador → `voxel/generador-electrico-voxel (1).html`

**✅ Equipos: 12/12 entregados.** **❌ Pendiente: 13 edificio torre hotel (arquitectura — feedback
del equipo: la torre actual no lee como hotel real; cuartos con MINISPLIT c/u, fachada sur limpia,
condensadoras en racks al norte).**

> Nota (feedback 2026-07-05): el equipo de la alberca NO es UMA — es un **calentador de
> resistencias eléctricas** para el agua de la alberca. La estructura del gabinete existente
> sirve; se convierte en escena (v6.1): sin ducto de aire, conectado al circuito de agua
> después del filtro, resistencias emisivas al encender. UMA-2 → "RESISTENCIAS · ALBERCA".

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

- [x] **5. Caldera + tanque ACS** → entregado: `voxel/caldera-acs-voxel.html`

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

- [x] **6. Intercambiador de placas** → entregado: `voxel/intercambiador-placas-voxel-v1.html`

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

- [x] **7. Tablero eléctrico + VFDs** → entregado: `voxel/mcc-vfd-voxel-v1.html`

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

- [x] **8. Extractor de azotea (hongo)** → entregado: `voxel/extractor-hongo-voxel-v1.html`

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

- [x] **11. Filtro de arena + bomba de alberca** → entregado: `voxel/filtrado-alberca-voxel-v1.html`

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

- [x] **9. Kit ductos/difusores** → entregado: `voxel/ducteria-catalogo-voxel-v1.html`

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

- [x] **10. Tanque de expansión / buffer** → entregado: `voxel/tanques-expansion-buffer-voxel-v1.html`

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

- [x] **12. Kit tubería hidráulica** → entregado: `voxel/tuberia-hidraulica-catalogo-voxel-v1.html`

```
Crea una ESCENA-CATÁLOGO de VOXEL ART 3D en un solo archivo HTML standalone: piezas modulares
de TUBERÍA HIDRÁULICA HVAC (lado de agua) exhibidas en fila sobre pedestales, alta densidad de
micro-voxeles. Es el gemelo hidráulico del catálogo de ductería.
Piezas: tramo recto bridado con pernos visibles en ambos extremos; codo 90° bridado; tee con
derivación bridada; reducción concéntrica; válvula de COMPUERTA con volante rojo y vástago
ascendente; válvula de MARIPOSA con palanca y cuadrante; válvula CHECK de columpio (corte que
muestra la clapeta); colador tipo Y con tapa bridada y tapón de drenado; junta flexible de
neopreno con bridas (anillos arrugados); manómetro en línea con carátula de color y llave de
aguja; termómetro de carátula en termopozo; soporte tipo rack de trapecio con varillas roscadas
y abrazaderas; tramo con AISLAMIENTO a medio forrar (mitad forrado con chaqueta gris y cinta,
mitad tubo desnudo — para mostrar ambos).
Escala real: tubería Ø4" (~0.10 m) como diámetro base; tramos de ~1.2 m; válvulas ~0.35 m.
Colores: acero al carbón gris azulado, bridas gris medio con pernos oscuros y tuercas claras,
volantes/palancas ROJOS, cuerpo de válvulas azul industrial, colador verde oscuro, junta negra,
aislamiento gris claro con cinta plateada, bandas de flujo AZUL (agua helada) en un tramo y
ROJA (condensados) en otro.
Leyenda: Agua helada / Agua condensados / Sentido de flujo.
Panel CONTROL DE EQUIPO: VÁLVULAS ABRIR-CERRAR (rota volante de compuerta + palanca de
mariposa + clapeta del check), ETIQUETAS ON-OFF (nombre flotante sobre cada pieza),
AUTO-ROTATE.
```

## 🏨 ARQUITECTURA

- [ ] **13. Edificio torre hotel (VAV)** → `voxel/hotel-torre-voxel.html`
  > Corrección cliente (2026-07-05): el sistema del hotel es **VAV** (aire central por ductos),
  > NO minisplit. Sin condensadoras exteriores, fachadas limpias, sin letrero.
  > Rev-2 (feedback Cristian): la 1ª generación VAV leía como **apartamentos/condominio** (balcones
  > privados profundos + base débil). Prompt reforzado con señales de HOTEL: porte-cochère, podio de
  > doble altura, balcones someros tipo Juliet, amenidad en azotea. Prompt completo abajo.

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: la TORRE DE UN
HOTEL DE PLAYA de 8 pisos + planta baja, con arquitectura CREÍBLE de hotel real, alta densidad
de micro-voxeles. Este edificio reemplazará la torre esquemática de una escena mayor — la
FACHADA SUR es la cara protagonista (da a la alberca y al mar).
CRÍTICO — DEBE LEERSE COMO HOTEL, NO como edificio de apartamentos/condominio. Señales de hotel
OBLIGATORIAS: (1) PORTE-COCHÈRE — marquesina grande volada sobre un acceso de autos con drop-off;
(2) PODIO de doble altura en la base, visualmente DISTINTO de la torre de cuartos, con lobby
acristalado y recepción visible; (3) balcones de cuarto SOMEROS y UNIFORMES (tipo Juliet, poco
voladizo), NUNCA terrazas privadas profundas (eso lee como condominio); (4) amenidad en azotea.
Sin letrero de texto.
Partes obligatorias:
— PODIO / PLANTA BAJA (base de HOTEL, distinta de la torre): LOBBY de DOBLE ALTURA con ventanal
corrido de piso a techo y recepción + estar de lobby visibles al interior; un PORTE-COCHÈRE
prominente — marquesina volada (losa + columnas) cubriendo un ACCESO DE AUTOS con drop-off (poné
un auto y palmeras alineando la llegada); acento de madera en la cenefa; jardineras. La base debe
leerse PÚBLICA (hotel), no como estacionamiento residencial.
— PISOS TIPO (8): ~11 módulos de cuarto por piso en fachada sur (módulo ~4 m), IDÉNTICOS y
repetidos (ritmo cerrado y uniforme = hotel). Balcón SOMERO y UNIFORME por cuarto (tipo Juliet:
losa de poco voladizo ~0.4 m + barandal de cristal casi al ras), NO una terraza privada profunda.
Puerta corrediza de vidrio de 2 hojas. TODAS las fachadas van LIMPIAS (sin equipos colgados, sin
condensadoras) — el sistema es de AIRE CENTRAL VAV, toda la máquina va adentro o en azotea.
— CLIMA CENTRAL VAV (aire por ductos, NO minisplit): una UTA/manejadora en azotea trata el aire
y lo inyecta a un DUCTO TRONCAL VERTICAL que baja por el núcleo; en cada piso salen RAMALES por
el plafón del pasillo hacia cada cuarto. En cada cuarto: una CAJA VAV (caja rectangular metálica
en el plafón, con compuerta interna y actuador) sobre el ramal, y un DIFUSOR/rejilla de suministro
en el plafón + una rejilla de retorno. NADA de unidades de pared, NADA de condensadoras exteriores.
— CUARTOS EN CORTE: la fachada sur debe poder OCULTARSE por completo (toggle CORTE) revelando
3-4 cuartos amueblados por piso: cama con cabecera, buró, TV en muro, clóset, puerta de baño, y en
el PLAFÓN el ramal de ducto + la caja VAV + el difusor (el equipo de clima del cuarto) — el resto
de cuartos como volúmenes sugeridos.
— NÚCLEO: pasillo central iluminado, núcleo de 2 elevadores + escalera, y un SHAFT DE DUCTOS (el
ducto troncal vertical del VAV) en el extremo norte, visible en corte, subiendo hasta la azotea.
— FACHADAS ESTE/OESTE/NORTE: ventanería menor, escalera de emergencia exterior en la norte. La
fachada norte va LIMPIA (ya no lleva racks de condensadoras).
— AZOTEA: pretil perimetral; una AMENIDAD de azotea que grite "hotel de playa" — solárium con
camastros + una pérgola/bar (opcional pequeña alberca/jacuzzi), separada del área técnica; el
cuarto de máquinas de elevadores; la SALIDA del ducto troncal (penetración capada donde conecta la
UTA); y zona plana ~10×8 m de bases libres para equipos (la UTA/manejadora y un extractor se
colocan después).
Dimensión real: ~44 m largo (sur) × 18 m fondo × 30 m alto (PB 4 m + 8 pisos de 3 m + pretil).
// SCALE: 1 voxel = 0.25 m.
Colores: cuerpo blanco arena con losas de balcón en blanco puro, barandales de cristal
azul-verde translúcido con postes aluminio, ventanería vidrio azul, acentos de madera clara
(marquesina, cenefa); ductos y cajas VAV en gris galvanizado con difusores blancos.
Leyenda: Fachada / Balcones / Núcleo / Ductos VAV / Azotea.
Panel CONTROL DE EQUIPO: CORTE FACHADA ON-OFF (oculta fachada sur y muestra cuartos + ductos),
LUCES NOCHE ON-OFF (ventanas emisivas), AUTO-ROTATE.
SIN letrero de hotel — no incluir ningún cartel de texto.
```

---

## 🖥️ DATACENTER (referencia: Tridium c3ntro)

> Objetivo: elevar `disenos/escenas/data_center_voxel_isometrico_3d.html` (hoy muy básico, sin
> `<title>`) al nivel de la escena de referencia real `cliente/Tridium/datacenter-c3ntro` (copias
> del renderer en `client-designs/tridium-datacenter/`). Estos son los equipos que le faltan a la
> escena, identificados de una foto del datacenter objetivo.
> Escala sugerida: gabinetes (racks, CRAC, in-row, PDU, UPS) a `// SCALE: 1 voxel = 0.025 m`;
> piezas grandes de exterior/escena (dry cooler, contención) a `// SCALE: 1 voxel = 0.05 m`.
> Reutilizables ya existentes: `chiller`, `torre-enfriamiento`, `tuberia-hidraulica`, `mcc-vfd`,
> `generador`.
>
> **Parámetros MEDIDOS del renderer de referencia** (`client-designs/tridium-datacenter/`, unidades reales m):
> — Rack: **0.6 ancho × 0.85 fondo × 2.0 alto m**, paso horizontal 0.62 m; **12 LEDs por rack**
>   (6 filas × 2 columnas). Cuerpo `#2d2d3a`, puerta perforada `#222233`/`#1a1a28`, LEDs verde
>   `#4caf50` · cyan `#00bcd4` · rojo `#f44336` · ámbar `#ff8f00`. **60 racks en 6 filas de 10**;
>   zonas de carga: inferencia AI, entrenamiento GPU, orquestación/red, almacenamiento/backup.
> — Sala principal ~9.4 × 10.6 × 3.0 m (~200 m²); pasillos ~1.12–1.17 m; margen perimetral 0.6 m.
> — Piso técnico: altura **0.35 m**, baldosa **0.6 × 0.6 m** (perforadas), pedestales cada 0.6 m.
> — CRAC del renderer: 0.75 × 0.85 × 0.4 m, **montados en las paredes laterales** (no en cabecera),
>   ~14 unidades, cuerpo rojo `#e53935`. Bandejas de cable overhead grises `#607080` con haces de
>   cable azul `#1565c0` / verde `#2e7d32`, cada 2.2 m.
> — El renderer actual **NO tiene** PDU, dry cooler, tubería de agua roja/azul, ni contención física
>   (solo franjas verdes en el piso) → esos prompts son mejoras genuinas hacia la foto objetivo.
>
> **Progreso: 7/7 entregados** ✅ — todos los equipos DATACENTER generados (D1–D7) y ubicados en su
> carpeta `disenos/<equipo>/`.

- [x] **D1. Rack de servidores TI** → ✅ `disenos/server-rack/rack-42u-voxel-v1.html` (claude.ai)

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un GABINETE RACK
de servidores de datacenter de 42U (estándar 19"), alta densidad de micro-voxeles, al nivel de un
render técnico de fabricante. Es el equipo CENTRAL del datacenter.
Partes obligatorias: gabinete metálico negro con marco de 42U; puerta frontal PERFORADA (malla de
ventilación) con manija y bisagras — la puerta ABRE (animada, toggle) para ver el interior;
poblado de equipos de TI apilados: varios SERVIDORES 1U y 2U (frentes con rejillas, botones,
bahías de discos y filas de LEDs de estado verdes/ámbar que PARPADEAN), 1-2 SWITCHES de red con
muchos puertos y LEDs de enlace, un PATCH PANEL con cables de red de colores saliendo, y algunos
blanking panels; dos PDU verticales (regletas) en los rieles traseros con salidas y un LED;
organizadores de cable horizontales; ventiladores internos girando (flujo frente→atrás). Ruedas y
niveladores en la base.
Dimensión real: 0.6 m ancho × 0.85 m fondo × 2.0 m alto (42U). Pon una tira de ~12 LEDs de estado
(6 filas × 2 columnas) en la cara frontal que PARPADEEN (unos pocos cambian cada ~15 frames).
Colores (paleta del datacenter de referencia): gabinete gris-azulado oscuro #2d2d3a, puerta
perforada casi negra #1a1a28, servidores gris grafito con frentes negros; LEDs verde #4caf50 ·
cyan #00bcd4 · rojo #f44336 (falla) · ámbar #ff8f00; cables de red azul #1565c0 / verde #2e7d32 /
amarillo; cobre en las barras de PDU.
Leyenda: Aire frío (frente) / Aire caliente (atrás) / Red / Energía.
Panel CONTROL DE EQUIPO: PUERTA ABRIR-CERRAR, CARGA TI (LO/HI — más LEDs activos y ventiladores
más rápidos), FALLA SIMULADA (LED rojo parpadeante en un servidor), AUTO-ROTATE.
```

- [x] **D2. CRAC/CRAH de precisión** → ✅ `disenos/crac/crac-downflow-voxel.html` (+ variante `disenos/crac/datacenter-crac-condenser-v1.html`) (claude.ai)

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una unidad de
enfriamiento de precisión CRAC/CRAH de piso (computer room air handler) tipo DOWNFLOW de
datacenter, alta densidad de micro-voxeles, seccionable tipo CORTE.
Partes obligatorias: gabinete alto de piso; en la parte SUPERIOR dos o tres VENTILADORES EC de
gran diámetro (GIRAN — animados) que aspiran el aire caliente del cuarto; interior en corte: banco
de FILTROS plano arriba, SERPENTÍN de agua helada aletado (celosía teal), bandeja de condensados;
sección de HUMIDIFICADOR con lámina de agua; conexiones de agua helada (entrada azul / salida roja)
bridadas al costado con válvulas; panel de control HMI frontal con display y LEDs; el gabinete
descarga aire frío hacia ABAJO — incluye un tramo de PISO TÉCNICO ELEVADO con losetas y un pedestal
para mostrar el plenum inferior. Puertas frontales con manijas.
Dimensión real: ~0.9 m ancho × 0.9 m fondo × 2.0 m alto (+ piso técnico ~0.6 m).
Colores: gabinete negro/gris oscuro (estilo Liebert/Vertiv), ventiladores EC con buje azul,
serpentín teal, agua helada AZUL, retorno ROJO, display emisivo.
Leyenda: Aire caliente (retorno, arriba) / Aire frío (impulsión, abajo) / Agua helada / Retorno.
Panel CONTROL DE EQUIPO: VENTILADORES ON-OFF (giro con inercia + partículas de aire), CORTE ON-OFF
(oculta el panel frontal para ver serpentín y filtros), AGUA ON-OFF, AUTO-ROTATE.
```

- [x] **D3. Enfriador in-row** → ✅ `disenos/in-row/inrow-cooler-voxel.html` (claude.ai)

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un ENFRIADOR
IN-ROW (in-row cooler) de datacenter — gabinete ESTRECHO que se instala ENTRE dos racks en la fila
para enfriar el pasillo caliente, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: gabinete negro estrecho (mismo alto que un rack); fila vertical de
VENTILADORES (3-4, GIRAN — animados) que jalan aire caliente por la CARA TRASERA (pasillo caliente)
y lo devuelven frío por la CARA FRONTAL (pasillo frío); SERPENTÍN de agua helada aletado visible en
corte (celosía teal); conexiones de agua helada abajo (entrada azul / salida roja) con válvulas de
balanceo; controlador con display y LEDs; puertas perforadas frontal y trasera. Muestra el flujo de
aire cruzando el gabinete (partículas rojas entrando atrás, azules saliendo al frente).
Dimensión real: ~0.3 m ancho × 1.1 m fondo × 2.0 m alto (es DELGADO — respeta la esbeltez).
Colores: gabinete negro mate, ventiladores oscuros con buje azul, serpentín teal, agua AZUL/ROJA.
Leyenda: Aire caliente (entrada) / Aire frío (salida) / Agua helada / Retorno.
Panel CONTROL DE EQUIPO: VENTILADORES ON-OFF (velocidad variable), CORTE ON-OFF, AUTO-ROTATE.
```

- [x] **D4. PDU / distribución de energía** → ✅ `disenos/pdu/pdu-datacenter-voxel-v1.html` (claude.ai)

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una PDU de
datacenter (Power Distribution Unit) de piso con su panel de distribución, alta densidad de
micro-voxeles, seccionable.
Partes obligatorias: gabinete de piso; en corte, un TRANSFORMADOR de aislamiento en la base
(núcleo con bobinas voxelizadas); INTERRUPTOR principal con palanca; dos PANELBOARDS con filas de
INTERRUPTORES termomagnéticos (breakers) en columnas, cada uno con su palanca ON/OFF; un
MEDIDOR/monitor de energía frontal con display (kW · V · A, con dígitos de 7 segmentos voxelizados);
BARRAS DE COBRE de distribución (bus bars); mazos de cable de salida saliendo por la parte inferior
hacia los racks; etiquetas de circuito; lámpara piloto.
Dimensión real: ~0.9 m ancho × 0.9 m fondo × 2.0 m alto.
Colores: gabinete gris claro o negro, breakers negros con palancas, barras de COBRE, display
emisivo verde, cables de energía negros/rojos, etiquetas amarillas de seguridad.
Leyenda: Alimentación de entrada / Salidas a racks / Barras / Control.
Panel CONTROL DE EQUIPO: BREAKERS ON-OFF (grupo — cambia palancas y LEDs de circuito), CORTE ON-OFF
(abre la puerta para ver breakers y barras), FALLA SIMULADA (breaker disparado + piloto rojo),
AUTO-ROTATE.
```

- [x] **D5. Dry cooler (banco de condensadores)** → ✅ `disenos/dry-cooler/dry-cooler-voxel-v1.html` (claude.ai)

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un DRY COOLER
(enfriador seco / banco de condensadores) de AZOTEA, alta densidad de micro-voxeles — es el módulo
grande de ventiladores del render, que rechaza el calor del agua del datacenter al aire.
Partes obligatorias: estructura larga tipo skid de acero; SERPENTÍN aletado en configuración de V
invertida (dos bancos inclinados de aletas, celosía metálica densa); FILA de 8-12 VENTILADORES
AXIALES grandes en la parte superior (GIRAN — animados, con rejillas de protección circulares
voxelizadas); cabezales/manifolds de agua a los extremos con las bocas de ENTRADA (agua caliente,
roja) y SALIDA (agua enfriada, azul) bridadas y tramos de tubería; patas/soportes; caja de control
eléctrico lateral con display; placa de datos.
Dimensión real: ~8 m largo × 2.3 m ancho × 2.2 m alto (grande — es exterior).
Colores: estructura gris claro/blanco, aletas aluminio, ventiladores con aspas negras, tubería de
agua ROJA (caliente, entrada) y AZUL (fría, salida).
Leyenda: Agua caliente (entrada) / Agua enfriada (salida) / Aire de rechazo.
Panel CONTROL DE EQUIPO: VENTILADORES ON-OFF (arranque escalonado por etapas con inercia),
% CARGA TÉRMICA (25/50/75/100 — cuántos ventiladores activos), AUTO-ROTATE.
```

- [x] **D6. Kit de contención de pasillo** → ✅ `disenos/contencion-pasillo/datacenter-pasillo-voxel.html` (claude.ai)

```
Crea una ESCENA-KIT de VOXEL ART 3D en un solo archivo HTML standalone: un TRAMO DE PASILLO de
datacenter con CONTENCIÓN DE PASILLO frío/caliente y su infraestructura aérea, alta densidad de
micro-voxeles. Es el 'esqueleto' que organiza una fila de racks (los racks se colocan aparte).
Partes obligatorias: PISO TÉCNICO ELEVADO con losetas cuadradas, algunas PERFORADAS (rejilla) y
pedestales visibles en un corte lateral; dos filas cortas de siluetas de rack formando un pasillo;
TECHO DE CONTENCIÓN sobre el pasillo (paneles, algunos translúcidos) con PUERTAS CORREDIZAS en los
extremos; sobre los racks, TUBERÍA OVERHEAD de agua helada (dos tubos: suministro AZUL y retorno
ROJO) con soportes tipo trapecio; BANDEJAS PORTACABLES (charolas) con mazos de cable de red; un
BUSWAY eléctrico aéreo con cajas de derivación (tap-off); iluminación LED lineal en el techo del
pasillo; señalización de pasillo frío/caliente.
Dimensión real: pasillo ~1.15 m ancho, racks 0.6 × 0.85 × 2.0 m, piso técnico elevado 0.35 m con
baldosa 0.6 × 0.6 m, techo de contención a ~2.4 m, tramo ~4 m largo.
Colores: baldosas gris claro reflectivo #d8dce8 (perforadas más oscuras), contención blanca con
paneles translúcidos azulados, tubería AZUL/ROJA, bandejas de cable grises #607080 con haces azul
#1565c0 / verde #2e7d32, busway gris, LEDs emisivos.
Leyenda: Agua helada (suministro/retorno) / Red / Energía (busway) / Aire frío (bajo piso).
Panel CONTROL DE EQUIPO: PUERTAS CONTENCIÓN ABRIR-CERRAR, LUCES ON-OFF, FLUJO AGUA ON-OFF
(partículas en la tubería overhead), AUTO-ROTATE.
```

- [x] **D7. UPS + banco de baterías** → ✅ **OFICIAL: `disenos/ups/ups-40kva-voxel.html`** (claude.ai, elegido por el usuario). Alternativas propias: `disenos/ups/ups-voxel-v1.html` (cutaway) · `disenos/ups/ups-voxel-v2.html` (fusión).

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un UPS industrial
trifásico (~40 kVA) con su gabinete de baterías, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: GABINETE UPS principal con puerta y panel HMI frontal (display LCD con un
'mímico' de flujo de energía, fila de LEDs de estado ONLINE/BATERÍA/BYPASS/FALLA, un medidor de
carga %); en corte: módulos RECTIFICADOR, INVERSOR y CARGADOR, bypass estático, barras de cobre;
GABINETE DE BATERÍAS contiguo con filas de baterías VRLA visibles (bornes rojo + / negro −);
rejillas de ventilación con 2-3 ventiladores girando; interruptores de entrada/salida/bypass;
cableado codificado por color. Placa 'UPS 40 kVA · 3Ø 480V'.
Dimensión real: gabinete UPS ~0.6 ancho × 0.85 fondo × 1.75 alto m; gabinete de baterías contiguo
de tamaño similar.
Colores: gabinetes negro mate (estilo datacenter), display emisivo, LEDs verde/ámbar/azul/rojo,
baterías gris oscuro con bornes rojo/negro, barras de COBRE.
Flujos: ámbar #ffb300 ENTRADA AC (red) · verde #0f8a4f SALIDA AC (carga) · rojo #c22233 DC batería
· azul #3aa0ff control.
Leyenda: Entrada AC / Salida AC / DC batería / Control.
Panel CONTROL DE EQUIPO: MODO (ONLINE / EN BATERÍA / BYPASS — cambia el mímico y el LED activo),
SIMULAR CORTE DE RED (transfiere a batería), FALLA SIMULADA (LED rojo parpadeante), CORTE ON-OFF
(abre el gabinete para ver los módulos), AUTO-ROTATE.
```

---

## 🧊 REFRIGERACIÓN COMERCIAL / INDUSTRIAL

> Cierra el dominio del cuarto frío (Safran): la cámara ya existe como escena, faltan sus equipos.
> Escala sugerida: `// SCALE: 1 voxel = 0.025 m`.

- [x] **R1. Central de refrigeración (rack de compresores)** → ✅ propio (subagente): `disenos/central-refrigeracion/central-refrigeracion-voxel-v1.html` · pendiente comparar con la versión claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una CENTRAL DE
REFRIGERACIÓN (rack de compresores) de supermercado/cámara fría, alta densidad de micro-voxeles.
Partes obligatorias: bastidor/skid de acero con 3-5 COMPRESORES en línea sobre aisladores, cada
uno con cabezal y caja de bornes (el conjunto vibra sutil al operar); colector de SUCCIÓN común
(tubo grande) y colector de DESCARGA con ramales a cada compresor; separador de aceite y RECIBIDOR
de líquido (tanques); filtros deshidratadores y visores de líquido; válvulas de servicio; manómetros
de alta/baja; tablero de control con display y LEDs por compresor; tubería de refrigerante codificada.
Dimensión real: ~3.0 m largo × 1.0 m ancho × 2.0 m alto.
Colores: bastidor gris oscuro, compresores negro/gris con cabezas de aluminio, succión AZUL (baja
presión), descarga ROJA/naranja (alta), recibidor de líquido rojo, aceite ámbar, cobre en tubería fina.
Leyenda: Succión (baja) / Descarga (alta) / Líquido / Aceite.
Panel CONTROL DE EQUIPO: COMPRESORES 1..N ON-OFF (escalonado, vibración + LEDs), FALLA SIMULADA
(compresor en rojo parpadeante), AUTO-ROTATE.
```

- [x] **R2. Unidad condensadora de refrigeración** → ✅ propio (subagente): `disenos/condensadora-refri/condensadora-refri-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una UNIDAD
CONDENSADORA de refrigeración de exterior/azotea, alta densidad de micro-voxeles.
Partes obligatorias: gabinete con SERPENTÍN condensador aletado en las caras (celosía densa); 1-2
VENTILADORES axiales arriba (GIRAN — animados) con rejilla de protección; compresor(es) en la base
visibles en CORTE; recibidor de líquido; conexiones de refrigerante (succión gruesa AISLADA + línea
de líquido fina); tablero eléctrico lateral con desconectador; patas/base con anclas.
Dimensión real: ~1.2 m × 1.0 m × 1.2 m.
Colores: gabinete gris claro, aletas aluminio, ventiladores oscuros con buje, succión aislada negra,
línea de líquido cobre.
Leyenda: Succión / Líquido / Aire de rechazo.
Panel CONTROL DE EQUIPO: VENTILADORES ON-OFF (giro + inercia), COMPRESOR ON-OFF, CORTE ON-OFF, AUTO-ROTATE.
```

- [x] **R3. Evaporador / unit cooler de cámara** → ✅ propio (subagente): `disenos/evaporador-camara/evaporador-camara-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un EVAPORADOR
(unit cooler) montado en el techo DENTRO de una cámara fría, alta densidad de micro-voxeles.
Partes obligatorias: carcasa alargada higiénica con SERPENTÍN aletado frontal (celosía teal con
ESCARCHA sugerida en blanco); 2-3 VENTILADORES axiales en el frente que empujan aire (GIRAN —
animados); charola de condensados con RESISTENCIAS de deshielo (líneas naranjas emisivas al
descongelar); línea de succión y de líquido con VÁLVULA DE EXPANSIÓN; soportes de techo; drenaje.
Dimensión real: ~1.5 m largo × 0.6 m fondo × 0.7 m alto.
Colores: carcasa blanca/gris claro, serpentín teal con escarcha blanca, ventiladores oscuros, línea
de líquido cobre, resistencias de deshielo naranja emisivo al activar.
Leyenda: Aire frío (impulsión) / Succión / Líquido / Deshielo.
Panel CONTROL DE EQUIPO: VENTILADORES ON-OFF, DESHIELO ON-OFF (resistencias naranjas + detiene
ventiladores), AUTO-ROTATE.
```

## ⚡ ELÉCTRICO / RESPALDO DE ENERGÍA

> Completa la cadena que ya empezaste con generador + UPS + MCC-VFD.
> Escala sugerida: `// SCALE: 1 voxel = 0.025 m`.

- [x] **E1. Transformador (seco / pad-mounted)** → ✅ propio (subagente): `disenos/transformador/transformador-voxel-v1.html` · pendiente comparar con la versión claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un TRANSFORMADOR
de distribución tipo SECO ventilado, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: gabinete metálico ventilado (rejillas); en CORTE el NÚCLEO con 3 columnas y
BOBINAS voxelizadas de cobre (devanados primario/secundario); BUJES/aisladores de alta tensión
(primario) y baja tensión (secundario) en la tapa; barras de conexión; placa de datos; base con
ruedas y anclas; etiquetas de peligro.
Dimensión real: ~1.5 m × 1.2 m × 1.8 m.
Colores: gabinete gris, bobinas de cobre/marrón sobre núcleo gris acero, aisladores crema/marrón,
barras de cobre, etiquetas de peligro amarillas.
Leyenda: Alta tensión (primario) / Baja tensión (secundario).
Panel CONTROL DE EQUIPO: CORTE ON-OFF (muestra núcleo y bobinas), ENERGIZADO ON-OFF (glow sutil en
las bobinas), AUTO-ROTATE.
```

- [x] **E2. Tablero de transferencia automática (ATS)** → ✅ propio (subagente): `disenos/ats/ats-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un TABLERO DE
TRANSFERENCIA AUTOMÁTICA (ATS) que conmuta entre red y generador, alta densidad de micro-voxeles.
Partes obligatorias: gabinete de piso con puerta; en CORTE dos juegos de CONTACTORES/interruptores
(uno RED, uno GENERADOR) con el mecanismo de transferencia central enclavado; controlador con
DISPLAY (fuente activa) y LEDs (RED / GENERADOR / TRANSFIRIENDO); barras de cobre de las 2 fuentes
de entrada y de la salida a carga; botones de prueba; cableado.
Dimensión real: ~0.8 m × 0.6 m × 2.0 m.
Colores: gabinete gris/negro, contactores negros, barras de cobre, LED RED verde, LED GENERADOR
ámbar, display emisivo.
Leyenda: Red (utility) / Generador / Carga.
Panel CONTROL DE EQUIPO: FUENTE (RED / GENERADOR — conmuta el ATS, cambia LEDs y el mímico),
SIMULAR CORTE DE RED (transfiere a generador), AUTO-ROTATE.
```

- [x] **E3. Switchgear / tablero principal** → ✅ propio (subagente): `disenos/switchgear/switchgear-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un TABLERO GENERAL
de distribución (switchgear) de baja tensión, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: fila de SECCIONES/columnas de gabinete metálico; INTERRUPTOR PRINCIPAL grande
tipo bastidor (extraíble) con palanca y display de medición; secciones de DERIVACIÓN con interruptores
de caja moldeada en columnas (palancas ON/OFF); BARRAS de cobre horizontales (bus) recorriendo arriba
(visibles en corte); relés/medidores de protección en las puertas; cableado inferior; etiquetas.
Dimensión real: ~3.0 m largo × 0.8 m fondo × 2.2 m alto.
Colores: gabinete gris claro, interruptores negros, barras de cobre, medidores con display emisivo,
etiquetas de seguridad amarillas.
Leyenda: Alimentación / Barras / Derivaciones.
Panel CONTROL DE EQUIPO: INTERRUPTORES ON-OFF (grupo), CORTE ON-OFF (ver barras internas), FALLA
SIMULADA (disparo + piloto rojo), AUTO-ROTATE.
```

## 🌀 HVAC — COMPLEMENTOS

> Escala sugerida: `// SCALE: 1 voxel = 0.025 m`.

- [x] **H1. Recuperador de energía (ERV / rueda entálpica)** → ✅ propio (subagente): `disenos/recuperador-energia/recuperador-energia-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un RECUPERADOR DE
ENERGÍA (ERV/HRV) de RUEDA ENTÁLPICA, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: gabinete tipo caja con CUATRO conexiones de ducto en las caras (aire exterior,
suministro, retorno, expulsión); RUEDA entálpica giratoria grande al centro (matriz tipo panal,
GIRA lentamente — animada) con su motor y banda; banco de FILTROS en las entradas; compuertas;
2 secciones de VENTILADOR (giran); charola. CORTE que muestra la rueda y el cruce de los 2 flujos.
Dimensión real: ~1.8 m × 1.4 m × 1.6 m.
Colores: gabinete gris claro, rueda con matriz panal dorado/bronce, filtros crema; flujos: aire
exterior VERDE, suministro AZUL, retorno NARANJA, expulsión gris.
Leyenda: Aire exterior / Suministro / Retorno / Expulsión.
Panel CONTROL DE EQUIPO: RUEDA ON-OFF (gira/detiene), VENTILADORES ON-OFF, CORTE ON-OFF, AUTO-ROTATE.
```

- [x] **H2. Bomba de calor (aire-agua)** → ✅ propio (subagente): `disenos/bomba-calor/bomba-calor-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una BOMBA DE CALOR
aire-agua reversible de exterior, alta densidad de micro-voxeles, seccionable.
Partes obligatorias: gabinete con SERPENTÍN aletado en las caras; VENTILADOR(es) axial arriba
(GIRAN — animados); COMPRESOR scroll en la base (corte); VÁLVULA DE 4 VÍAS de inversión frío/calor
con su tubería; INTERCAMBIADOR de placas del lado agua con conexiones de entrada/salida; recibidor;
tablero eléctrico lateral; patas.
Dimensión real: ~1.3 m × 0.6 m × 1.4 m.
Colores: gabinete gris claro, aletas aluminio, ventilador oscuro; refrigerante succión AZUL /
descarga ROJA; agua AZUL (frío) o ROJA (calor) según el modo.
Leyenda: Refrigerante / Agua / Aire · modo FRÍO/CALOR.
Panel CONTROL DE EQUIPO: MODO FRÍO/CALOR (invierte la válvula de 4 vías + colores del agua),
COMPRESOR ON-OFF, VENTILADOR ON-OFF, AUTO-ROTATE.
```

## 🚒 CONTRA INCENDIO

> Escala sugerida: `// SCALE: 1 voxel = 0.025 m`.

- [x] **F1. Sistema de bomba contra incendio** → ✅ propio (subagente): `disenos/bomba-incendio/bomba-incendio-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: un SISTEMA DE BOMBA
CONTRA INCENDIO sobre skid, con bomba principal y jockey, alta densidad de micro-voxeles.
Partes obligatorias: SKID rojo con BOMBA PRINCIPAL horizontal de gran caudal accionada por motor
eléctrico con guarda-acoplamiento (el acoplamiento GIRA — animado); BOMBA JOCKEY pequeña al lado;
cabezal de DESCARGA con válvulas, check y manómetros; TABLERO DE CONTROL contra incendio rojo con
display y luces piloto; tubería roja gruesa de succión y descarga con bridas; válvula de alivio;
sensor de presión; base con anclas.
Dimensión real: ~2.5 m largo × 1.2 m ancho × 1.5 m alto.
Colores: TODO rojo bombero (skid, tubería, tableros), motor gris oscuro, manómetros con carátula
de color, cobre en detalles.
Leyenda: Succión / Descarga (a red de rociadores) / Jockey.
Panel CONTROL DE EQUIPO: BOMBA PRINCIPAL ON-OFF (arranque + vibración + giro), JOCKEY ON-OFF,
ALARMA (luz roja + parpadeo), AUTO-ROTATE.
```

## 🖥️ DATACENTER — FUTURO (enfriamiento líquido / IA)

> Escala sugerida: `// SCALE: 1 voxel = 0.025 m`.

- [x] **C1. CDU (Coolant Distribution Unit) — enfriamiento líquido** → ✅ propio (subagente): `disenos/cdu-liquid/cdu-liquid-voxel-v1.html` · pendiente comparar con claude.ai

```
Crea una pieza de VOXEL ART 3D interactiva en un solo archivo HTML standalone: una CDU (Coolant
Distribution Unit) de enfriamiento líquido para datacenter de IA, formato rack, micro-voxeles.
Partes obligatorias: gabinete tipo rack; INTERCAMBIADOR de placas líquido-líquido (corte); DOS
circuitos — PRIMARIO (agua helada de la instalación) y SECUNDARIO (líquido técnico a los racks);
2 BOMBAS de circulación redundantes (impulsor que GIRA — animado); tanque de expansión; filtros;
MANIFOLD de distribución con múltiples conexiones rápidas (quick-connect) hacia los racks; sensores
de flujo/presión/fuga; tablero con DISPLAY (mímico de los 2 circuitos + caudales).
Dimensión real: ~0.6 m ancho × 1.2 m fondo × 2.0 m alto (formato rack).
Colores: gabinete negro datacenter; primario AZUL/ROJO (agua helada supply/return); secundario
CIAN/MORADO (líquido técnico); acero/cobre en las placas; display emisivo.
Leyenda: Primario (agua helada) / Secundario (a racks) / Bombas.
Panel CONTROL DE EQUIPO: BOMBAS P1/P2 ON-OFF (redundancia), MODO (normal / redundante), FUGA
SIMULADA (alarma roja), AUTO-ROTATE.
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

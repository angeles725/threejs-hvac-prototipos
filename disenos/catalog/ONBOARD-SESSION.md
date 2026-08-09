# Catalog session onboarding — generic autonomous prompt

Paste the block below as the FIRST message of a new Opus-5 session (set `/model` to Opus 5 first).
It self-selects a free worktree, claims a family from the manifest, and builds — no per-session wording needed.

---

```
Eres una sesión de modelado 3D del CATÁLOGO (repo three.js). Trabaja de forma autónoma.
No me preguntes qué hacer: elige tú el trabajo y ejecútalo hasta terminar tu familia.

PASO 0 — ELIGE WORKTREE Y FAMILIA (tú solo):
1. Corre `git -C /home/cristian/prototipos/three.js worktree list` para ver los worktrees catalog-*.
2. Corre la herramienta ListAgents: cada sesión viva tiene un nombre tipo "catalog-<x>-NN".
   Un worktree está OCUPADO si ya hay una sesión viva con ese nombre.
3. Elige un worktree catalog-* LIBRE (sin sesión viva). Su rama y familia están en
   disenos/catalog/catalog.yaml (campo owner = "catalog-<x> (opus5 worktree)").
   Mapa: catalog-hvac=hvac · catalog-electricos-dc=electricos+datacenter ·
   catalog-proceso=proceso+fluidos+utilities · catalog-retail-lab=retail+seguridad+laboratorio+instrumentacion ·
   catalog-robotica=robotica · catalog-transporte=transporte · catalog-automotriz=automotriz.
4. TRABAJA CON RUTAS ABSOLUTAS dentro de ESE worktree: /home/cristian/prototipos/three.js-worktrees/<worktree>/...
   Antes de empezar corre `git -C <worktree> merge --ff-only master` para estar al día.
   Si TODOS los worktrees están ocupados, dímelo y detente.

PASO 1 — CONTRATO (cada asset, o no integra):
- Ruta: <worktree>/disenos/catalog/<familia>/<slug>/{design-spec.yaml, <slug>.html}
- Parte SIEMPRE de disenos/catalog/shell-template.html. Lee también research/HANDBOOK.md §3
  (materiales) y un ejemplo hecho: disenos/catalog/estructuras/ o puertas/puerta-cuarto-frio/.
- Expone globalThis.__<slug>App.runtime + __qaRenderInfo + data-app-ready. Slug con guion → global
  camelCase (mi-asset → __miAssetApp), porque __mi-assetApp no es identificador válido.
- design-spec.yaml con complexity (8 ejes) + colorTarget MEDIDO del render (mide un crop del PNG de QA;
  NO inventes el sRGB). Referencias con evidencia real (datasheet/norma) cuando exista.
- Render-on-demand (block56): render gateado tras needsRender; controls.update() cada frame; CADA botón/
  resize/rama-de-animación llama requestRender(). Sombras autoUpdate=false, mapSize<=1024, DPR<=2.
- Instancing (block54 §2.3) SOLO donde hay repetición real (racks, correas, productos); en piezas únicas
  no aplica.

PASO 2 — QA OBLIGATORIA antes de cada commit (mismo gate que usa la integración):
    python3 -m http.server 8899 --bind 127.0.0.1 &
    SHOT_DIR=/tmp/shots disenos/catalog/tools/qa-lock.sh node disenos/catalog/tools/verify-catalog-asset.mjs <familia>/<slug>
  ENVUELVE SIEMPRE la sonda en qa-lock.sh (una invocación por vez): serializa con flock entre TODAS las
  sesiones y mata la contención (~70 chrome en 16 núcleos = exit 13). No sirve si solo lo usa una sesión;
  es un contrato compartido, úsalo aunque creas que estás sola. Transparente: stdout y exit code pasan tal cual.
  Exit 0 = pass (ready true, calls>0, 0 excepciones de consola, hook presente).
  Exit 1 = FALLO real de un asset. Exit 2 = NO CONCLUYENTE (servidor caído, o el lock no se adquirió: no se
  midió nada) → arranca el servidor y REINTENTA; nunca trates exit 2 como rechazo.
  ABRE el PNG que deja y REVÍSALO: geometría correcta (los conteos verdes NO ven bugs de geometría).
  Caveat: mide con SwiftShader → conteos reales, pero el TIEMPO DE FRAME no; no lo uses como criterio.

PASO 2b — QA DE ESTADO (OBLIGATORIA si tu asset tiene toggles). El gate del 2a captura SOLO el estado por
DEFECTO, así que cualquier cuerpo que viva detrás de un botón (revelado, corte, puerta, falla) NUNCA se mira
— ya se colaron ~15 defectos reales así, todos con exit 0. Acciona CADA botón y revisa el PNG resultante:
    SHOT_DIR=/tmp/shots BASE=http://127.0.0.1:8899 disenos/catalog/tools/qa-lock.sh node disenos/catalog/tools/probe-state.mjs <familia>/<slug> btnA,btnB [sufijo]
  (usa puerto CDP 9336, distinto del gate). Revisa: ¿el revelado muestra el cuerpo interno o una caja vacía?
  ¿la puerta abre a un vano o a metal macizo? ¿el corte deja ver lo que debe? Si no, arréglalo antes de commitear.

PASO 3 — COMMIT + STATUS:
- Commit por asset en tu rama (git -C <worktree> add/commit). NO hagas push.
- Marca status de TUS assets en catalog.yaml (pending→done). NO toques otras familias.
- session-A mergea tu rama a master con revisión. Cuando termines un lote, avísale por SendMessage
  (busca su nombre con ListAgents; suele ser la sesión en el worktree principal / master).

FAMILIAS needs-research (robotica, transporte, automotriz): corre /research-sdd PRIMERO para la técnica
dura (jerarquía de joints/IK; scroll de textura para banda). Sincroniza con
research-sdd-status.sh <target> --sync-state antes de tocar el envelope.

RANGOS DE BLOQUE RESEARCH (asignados para que NO colisionen números entre sesiones — usa el siguiente
libre DE TU RANGO; si te quedas sin, pide otro a session-A):
- session-B (puertas/almacenamiento): B57-B69   (B57/B58/B59/B60 ya en master)
- transporte: B70-B79   ·   robotica: B80-B89   ·   automotriz: B90-B99
Si ya escribiste un bloque fuera de tu rango (p.ej. transporte con B59-B61), RENUMÉRALO a tu rango antes de
pedir integración; session-A también reconcilia al mergear.

POLÍTICA para assets SIN ficha de fabricante (precedente barrera-vehicular): NO inventes cifras y las
declares "high". Modela con todas las confidences en LOW, documenta en el design-spec la lista de fuentes
intentadas, y avisa en el HUD que esa parte no está certificada. Es preferible un asset honesto-con-caveats
a dejarlo pendiente, salvo que el usuario pida esperar una ficha.

ESCALA: para assets pequeños/medianos usa la FIGURA humana de 1.8 m (HANDBOOK §3.0) como referencia, NO un
vehículo — un coche de 4.3 m domina el encuadre y compite con el sujeto.

GOTCHAS ya detectados (evítalos):
- Sujetos VERTICALES de metal desnudo (puertas, cladding, tableros) se leen gris plano. FÍSICA: una cara
  vertical NO puede recibir un reflejo especular de una luz ELEVADA, a cualquier altura de cámara (la
  geometría de reflexión lo impide) → el brillo lo da el IBL, no una luz de relleno. FORMULACIÓN CORRECTA
  (session-B, torniquete): sube environmentIntensity (p.ej. 2.8) para el término especular; el fill lateral
  solo ayuda al término DIFUSO. NUNCA bajes metalness (rompe HANDBOOK §3.1). Documenta la desviación en el spec.
- Racks/estructuras de carga: el bastidor debe cubrir la carga superior + margen (DGUV: +500 mm sobre el
  nivel más alto). No dejes carga volando por encima del puntal.
- ACERO PINTADO no es metal desnudo: con env 1.9-2.2 + exposure 1.15 los paneles claros se queman. Para
  superficies recubiertas usa env ~1.5 / exposure ~1.02 + fill lateral. El gotcha del metal vertical de
  arriba aplica SOLO a inox/acero desnudo.
- Una TIRA EMISIVA no ilumina nada: un gabinete/vitrina con vidrio necesita PointLights reales dentro o el
  producto sale negro detrás del cristal.
- VIDRIO a transmission 0.96 desaparece del render; usa ~0.72 con tinte leve para que el producto se lea y
  la superficie curva se note.
- MECANISMO EN UNA SOLA CARA (puerta seccional, cortina, cualquier equipo con corte): encuadra ESA cara. La
  vista canónica de una seccional es desde DENTRO (rieles + eje de muelles); de fuera cerrada es un panel liso.
- CONTEO ≠ CORRECTO: draw calls/tris verdes NO ven geometría rota (carga atravesando mallas, pernos flotando
  al ocultar una brida, carcasa translúcida con depthWrite tapando el corte, boca sobre el azimut de cámara).
  SIEMPRE abre el PNG del gate y revísalo.
- CylinderGeometry / BoxGeometry son SÓLIDAS: un "aro" o "marco" hecho con un cilindro OCLUYE lo de adentro
  (tapó ventiladores en torre y VRF). Aro → TorusGeometry o 4 tiras; marco → 4 barras, no una caja.
- Una PUERTA colgada sobre un muro MACIZO se ve bien cerrada y no revela nada al abrir → recorta el VANO en el
  muro (Shape con hole), como en bodega-shell/puerta-cuarto-frio.
- En metal, el `map` tiñe F0: un mapa OSCURO en cara vertical colapsa a negro y parece agujero → sube el VALOR
  del mapa, no bajes metalness.
- BLANCO sobre BLANCO es invisible aunque nada lo tape (aspa dentro de chimenea blanca). Diferencia el valor.
- Metal desnudo mirando hacia ABAJO también falla (refleja el cuarto oscuro → bandas negras). Un perfil T de
  falso techo es acero PINTADO = dieléctrico → valor correcto, no más luz.
- DISPOSICIÓN físicamente imposible pasa sin que nada la detecte: succión axial dentro del motor vecino, 2
  ventiladores Ø0.60 en 0.78 m de fondo, carga volando. Revisa cotas y holguras contra tu design-spec.
- HOJA/PUERTA con bug de SIGNO: una hoja en local -sign*w/2 gira HACIA ATRÁS con rotation.y positivo (el
  portón del barandal se abría sobre el vacío que protege). Verifica el sentido de giro con la sonda de estado.
- MARCAS DE PISO coplanares: no basta apilar en Y; el polygonOffset debe CRECER con la altura de capa, o una
  capa inferior tapa a la de arriba (rayado que desaparece bajo su propio fondo).
- LOSA grande + shadow map 1024 = acné en franjas → se arregla con sun.shadow.normalBias (~0.05), NO subiendo
  el bias de profundidad.
- OCLUSIÓN por puertas: con la cámara del catálogo en +X/+Z, cada puerta con bisagra a la izquierda tapa la
  sección a SU izquierda al abrir. No muevas la cámara: pon la sección importante en el extremo CERCANO a
  cámara, y pon la BISAGRA del lado LEJANO (una bisagra del lado de cámara cruza el vano y tapa el interior).
- El fix de plano vertical (fill+env alto) NO es preset GLOBAL: un sujeto horizontal/curvo (generador, torre)
  se APLANA si se lo aplicas. Úsalo solo en caras verticales; en el resto es "deliberate non-deviation".
- Un ESTADO revelado puede ser físicamente IMPOSIBLE (placa de presión saliéndose del bastidor): hazle a cada
  estado la misma pregunta que a la disposición, "¿esto puede existir?", y acota recorridos.
- Cuando la oclusión revelada es FÍSICA REAL (una puerta tapa de verdad la bahía de atrás), decláralo como
  `known_view_limit` en el spec en vez de forzar geometría imposible.
- PRODUCTO DE TECHO (difusor, VAV): el detalle va hacia la SALA y la cámara de revisión debe estar DEBAJO;
  conos escalonados hacia arriba se ven como placa lisa desde el único ángulo real (abajo).
- FOOTGUN three.js: Object3D.position no tiene setter (Object.defineProperties) → `Object.assign(obj,{position:
  new Vector3(...)})` LANZA en módulo strict y la página NUNCA marca data-app-ready (el gate lo ve como asset
  roto). Usa siempre `.position.set(...)`. Igual con .rotation/.scale.
- INFRA (no es fallo de asset): con varias sesiones corriendo QA a la vez, chrome-headless-shell se cae
  intermitente ("unsettled top-level await", exit 13) → REINTENTA, da exit 0. Junto con exit 2 (servidor
  caído) son los dos casos de "no concluyente"; nunca los trates como asset roto.
- CAUSA RAÍZ de la flakiness (medida): es CONTENCIÓN, no caídas aleatorias — ~70 chromes headless en 16
  núcleos (load 54.9) hacen que el arranque de chrome supere el timeout del WebSocket y el proceso muera sin
  decir por qué (la firma exit 13). REINTENTAR BAJO ESA CARGA LA EMPEORA (cada reintento suma otro chrome).
  El arreglo estructural es SERIALIZAR la QA entre sesiones: un flock sobre un archivo compartido alrededor de
  cada invocación de sonda encola las corridas en vez de que 7 sesiones disparen chrome a la vez.
- Bajo alta CONTENCIÓN (muchas sesiones con chrome a la vez) la captura puede salir VACÍA (HUD presente,
  canvas NEGRO) en un asset que en la corrida siguiente renderiza perfecto — y el gate da ready=undefined.
  Si auditas o integras POR CAPTURA, REINTENTA antes de reportar/rechazar; una captura vacía aislada es infra.
- "TAPA INVISIBLE" (regla fuerte para cualquier asset con INTERIOR): tres cosas tapan la boca sin verse en
  los conteos — (1) el gabinete como BOX macizo (su cara frontal queda tras el hueco) → constrúyelo como
  cascarón de 5 paneles; (2) la cara de sellado con CylinderGeometry = disco lleno → RingGeometry; (3) el
  empaque con cilindro = disco → TorusGeometry. Si tiene interior, todo lo que rodea la boca va anillo/toro
  y el gabinete NUNCA es box macizo. Se detecta SOLO abriendo la puerta/tapa en la captura de estado.
- GUILLOTINA (campana, cortina): la cenefa/caja debe ser al menos tan alta como el RECORRIDO de la hoja, o
  al subir sale por el techo.
- ILUMINACIÓN DE METAL — árbol de decisión (corrige y completa el gotcha del plano vertical):
  · superficie PLANA de metal desnudo → fill direccional del lado de la cámara.
  · cuerpo CURVO de metal (tanque, silo, tubo) → NUNCA el fill plano (lo aplana) y tampoco basta con nada
    (sale negro): usa la VARIANTE ESTUDIO de HANDBOOK §3.3 — RectAreaLight key+fill grandes, con
    RectAreaLightUniformsLib.init() UNA vez antes de renderizar. Resuelve el degradado vertical del casco.
  · superficie INCLINADA hacia abajo (tolva 60°, cono, cara inferior) → normalmente NO tiene arreglo por luz
    (medido: R = 2(N·V)N − V con normal de Y negativa y cámara sobre el horizonte deja la fuente BAJO el suelo;
    una tarjeta de rebote en la escena PMREM da efecto CERO, o revienta el mapa si la subes). Documéntalo como
    LÍMITE MEDIDO y elige el crop del colorTarget en una cara representativa que mire hacia arriba/afuera.
    (Si en algún asset se resolvió, fue con luz colocada BAJO el horizonte o un environment propio, no RoomEnvironment.)
- METALNESS casi BINARIO (HANDBOOK §3.1): en superficie sólida SIN textura, un metalness intermedio
  (0.2-0.55) es artefacto del shader, no autoría válida. Usa 0 (dieléctrico: pintado, plástico) o ~1 (metal
  desnudo). No dejes 0.35/0.4/0.7 en paneles lisos.
- ConeGeometry pone el ÁPICE en +Y → un cono de descarga (silo, tolva) se angosta hacia ABAJO y sale al
  revés; voltearlo con rotation.x=PI voltea también las NORMALES (sale carbón). Constrúyelo como TRONCO
  (CylinderGeometry con radio inferior), que además es lo real.
- Rotación desde un orden de Euler ADIVINADO falla en silencio (aros de jaula de escalera a un costado sin
  rodear nada) → compón desde rotaciones de EJE explícitas.
- Un CORTE que solo quita el techo NO es corte: el muro cercano sigue tapando el interior. El toggle CORTE
  quita techo + muro cercano + puerta JUNTOS.
- MALLA/REJILLA que debe dejar ver: el parámetro crítico es la PROFUNDIDAD de las barras, no el paso. Una
  puerta perforada con barras de 10 mm de fondo se apila visualmente en vista 3/4 y se vuelve OPACA (tapó 42U
  de equipo con exit 0); una perforada real es chapa ~1.5 mm → baja el fondo a ~2.5 mm y transparenta.
- OFFSETS encadenados que se salen de su base (alternador colgando fuera del patín, barras 90 mm fuera del
  gabinete): pon `console.assert` sobre la extensión resultante en vez de confiar en la aritmética; atrapa el
  error en el primer render, barato.
- FALSO NEGATIVO del gate (no es asset roto): `ready:false` + `error:'no-renderer'` + lista de errores VACÍA
  + cero globals `__` = infra (unpkg tosió). Un asset roto DE VERDAD deja rastro en `errors`. Reintenta.

Trabaja en bucle por todos los assets pendientes de tu familia. Cuando tu familia quede en done, avisa y
elige otra familia libre si queda, o detente.
```

## Auditoría de defectos — anclas obligatorias (evita falsos positivos)
- TODO TOGGLE ES UN INTERCAMBIO, y el sustituto no debe retirar NETO geometría. Un revelado oculta N piezas y
  muestra un grupo sustituto; si al sustituto le falta una pieza, lo que se apoyaba encima queda FLOTANDO, y el
  gate nunca lo ve porque el estado por defecto está intacto y los conteos siguen verdes. Caso real:
  suavizador-agua/btnCut ocultaba shell+domo pero el grupo `cut` solo reponía medio casco → cabezal flotando con
  0.117 m de hueco. Regla: cualquier asset con CORTE, tapa desmontable o panel retirable se audita midiendo los
  MISMOS puntos de referencia en AMBOS estados, no solo en el sospechoso. Un comentario en el código que promete
  "no se borra geometría" NO es evidencia; la medición sí. CRITERIO BARATO Y MEDIBLE = CONTINUIDAD: el cuerpo
  visible debe TOCAR a su vecino (hueco <= 0) en ambos estados; "lo que se oculta" y "lo que se repone" son dos
  listas distintas y su asimetría no la ven ni el gate ni los conteos (suavizador: gapBajoCuello contra el cuello;
  medidor-flujo: huecoHastaBrida contra la brida — el mismo defecto, cazado a propósito con esta regla).
- LA MEDICIÓN DE UN DEFECTO DE ESTADO DEBE DISCRIMINAR entre estados. Si tu consulta da el MISMO número en el
  estado normal y en el sospechoso, la sonda está mal ANTES que el reporte: casi seguro tu filtro agarró la pieza
  equivocada (una válvula en vez del casco). Un resultado idéntico no refuta el defecto, lo OCULTA — habrías
  concluido "no lo reproduzco" y refutado algo cierto. Dos estados que DEBEN diferir dando igual es sospechoso por
  sí mismo; re-ancla la identidad por geometry.parameters y vuelve a medir.
- Identifica una InstancedMesh por `geometry.parameters` (width/height/depth), NUNCA por `count` ni por índice
  de traversal: varias mallas comparten conteo por casualidad (24 aisladores vs 28 MCCB) y el orden de
  traversal cambia con cualquier edición → agarras la malla de al lado y reportas un defecto que no existe.
- CONTAR una InstancedMesh: lee `.count`, NUNCA su caja envolvente. Una InstancedMesh tiene UNA sola geometría,
  así que su bounding box es la del prototipo, no la del conjunto → contar por bbox/geometría siempre da 1 y
  reportas "2 filas de 6 racks" como si hubiera uno. (contencion-pasillo: bbox=1, `.count`=12, correcto.)
- Un pixel-diff que NO cambia solo prueba AUSENCIA si ANTES demuestras que el objeto era visible en ese estado.
  Si vive tras una tapa/puerta CERRADA, "ocultarlo no cambia el hash" es tautológico. Orden correcto: abre la
  tapa que lo cubre → confirma que aporta píxeles → recién entonces el diff prueba ausencia.
- RAYCAST al CENTRO de una instancia NO es prueba de visibilidad: el rayo choca con la carátula/manija del
  PROPIO dispositivo (autooclusión) → 0 hits aunque el cuerpo SÍ renderice. Da falsos positivos en casi todo
  (cualquier asset con detalle frontal). Trátalo como PISTA, nunca veredicto; excluye el objeto y sus
  accesorios, o muestrea la cara frontal, no el centro.
- MÉTODO DE AUDITORÍA (orden estricto, obligatorio antes de reportar un defecto de visibilidad):
  1) identidad por geometry.parameters (nunca count ni orden de traversal);
  2) probar PRESENCIA: abre lo que lo cubra y confirma que el hash del canvas CAMBIA;
  3) solo entonces un hash que NO cambia significa ausencia;
  4) raycast como pista, con el objeto y sus accesorios excluidos.
- Todo hallazgo de auditoría se REFUTA (verificación adversarial de la sesión dueña) ANTES de aplicarse como
  fix. Un reporte medido pero con la identidad de malla mal anclada parece sólido y no lo es.
- TRAMPA CRÍTICA — readback del CANVAS devuelve NEGRO: three.js crea el WebGLRenderer con
  preserveDrawingBuffer=false, así que hashear el canvas dentro de la página (drawImage(renderer.domElement)
  + getImageData) da píxeles TODOS NEGROS → el hash es CONSTANTE para CUALQUIER escena. Un checker así da
  veredictos idénticos y confiados sin medir nada (gate verde sobre su propio defecto). SIEMPRE hashea
  Page.captureScreenshot (que sí compone), NUNCA el canvas. Si alguien reportó ausencias con canvas-hash,
  DESCARTA esos reportes, no los revises.
- CAPTURA NEGRA POR BUFFER DESCARTADO (distinta del canvas-hash; artefacto de sonda, NO asset roto): incluso
  Page.captureScreenshot puede salir NEGRO en assets render-on-demand. Con preserveDrawingBuffer=false, cuando
  la animación suavizada termina ya nada repinta y el swapchain queda con un buffer DESCARTADO; la captura toma
  ese frame muerto. El asset NO tiene culpa (su handler sí llama requestRender()). FIX en probe-state.mjs: forzar
  UN render vía el contrato QA (buscar __<slug>App.runtime → r.renderer.render(r.scene,r.camera)) justo antes de
  cada captureScreenshot. REGLA: una captura negra es NO CONCLUYENTE, igual que exit 2 (servidor caído); nunca es
  veredicto de asset roto. Frecuencia ~1/40 capturas, intermitente (depende de cuándo asienta la animación).
- MÉTODO NO-RENDER vs NO-PIXELS (distingue defecto de límite de vista, con control): por cada botón NO-default-on:
  hash → clic → hash. Si cambió = ok. Si NO cambió, CONTROL: fuerza renderer.render(scene,camera) y re-hashea;
  si ahora cambia = NO-RENDER (la escena mutó pero no se dibujó → falta requestRender(), DEFECTO decisivo); si
  sigue igual = NO-PIXELS (el estado no aporta píxeles desde la cámara default → candidato a known_view_limit,
  NO defecto). El control prueba que los píxeles SÍ diferirían, así que un hash que no cambia es un render que
  falta, no un objeto ausente.
- FIRMA DE ESCENA CIEGA A TRANSFORMACIONES (si desempatas DEAD-HANDLER de NO-PIXELS por firma del grafo, no por
  el control de render de arriba): la firma DEBE incluir position/rotation/scale, no solo visibilidad + material.
  Un toggle que arranca una animación (ventilador que gira) no cambia visibilidad ni material, así que una firma
  sin transformaciones concluye "el grafo no cambió" y degrada NO-PIXELS a DEAD-HANDLER = FALSO POSITIVO
  (generador-diesel/btnFan: handler correcto, gira fuera de la cámara default). Tercer defecto de sonda de la
  misma familia — canvas negro, hash de página completa, firma sin transforms — todos se veían bien en el código
  y solo los cazó medir contra un espécimen de respuesta conocida. Límite del arreglo: en un asset con animación
  continua independiente del toggle la firma cambia sola, así que un handler MUERTO sale NO-PIXELS (falso
  negativo) — se acepta: mejor perder un hallazgo que mandar ruido.
- HERRAMIENTAS DE AUDITORÍA (read-only, en tools/): audit-asset.mjs (inventario por geometry.type+parameters
  + diff por botón + PNG por estado) y hole-probe.mjs (FONDO CENTINELA: repinta scene.background/fog a magenta
  y fuerza un render; todo píxel magenta = la cámara atraviesa el modelo → distingue PANEL oscuro de AGUJERO,
  cosa que el pixel-diff no puede). Úsalas para medir, no opinar.
- RECORRE Object3D COMPLETOS, no solo mallas: una animación casi siempre rota un GROUP, no una malla; un
  inventario solo-de-mallas dirá "el botón no hace nada" (falso). La identidad y el ALCANCE del recorrido
  importan tanto como el criterio.
- PUNTO CIEGO gate+sonda: ambos recorren `root`. Un objeto colgado de `scene` (no de root) no aparece en la
  cuenta. Cuelga todo de root salvo el plano de suelo.
- SIMETRÍA build↔auditoría: al CONSTRUIR la regla es "el conteo no ve geometría → abre el PNG". Al AUDITAR
  hace falta la INVERSA: el PNG TAMPOCO decide — una pieza pequeña, oscura u ocluida se lee igual que una
  ausente. El desempate barato es MEDIR la escena (contar instancias + visibilidad + bounding boxes en mundo),
  no mirar más fuerte. (31 assets auditados, 0 defectos reales; todas las falsas alarmas fueron de las sondas.)
- Un CHECKER estático de contrato solo sirve si LEE el spec: gritar sobre un metalness/desviación que el spec
  ya declara como EXCEPCIÓN documentada (con razón + confidence) es ruido. Y la banda §3.1 correcta es 0.06-0.84
  (0.85-1.0 es metal comprometido válido, no artefacto).
- LA SEÑAL VIENE DE MEDIR EL ESTADO CONCRETO, casi nunca de un patrón general. Los chequeos ESTÁTICOS/de-patrón
  fallan por ruido en este catálogo: "botón sin requestRender()" (24 falsos: el wiring usa helpers variados),
  cruce cita↔título (cruces legítimos), regex de geometría (casa dentro de Math.PI/2). El wiring y la geometría
  varían de forma legítima entre assets. Audita midiendo el estado específico (pixel-diff sobre el área del
  modelo excluyendo HUD/panel), no con un patrón sintáctico que "discrimine" sin medir.

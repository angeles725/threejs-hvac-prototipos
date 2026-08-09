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
    SHOT_DIR=/tmp/shots node disenos/catalog/tools/verify-catalog-asset.mjs <familia>/<slug>
  Exit 0 = pass (ready true, calls>0, 0 excepciones de consola, hook presente).
  Exit 1 = FALLO real de un asset. Exit 2 = NO CONCLUYENTE (servidor caído: no se midió nada) →
  arranca el servidor y REINTENTA; nunca trates exit 2 como rechazo.
  ABRE el PNG que deja y REVÍSALO: geometría correcta (los conteos verdes NO ven bugs de geometría).
  Caveat: mide con SwiftShader → conteos reales, pero el TIEMPO DE FRAME no; no lo uses como criterio.

PASO 2b — QA DE ESTADO (OBLIGATORIA si tu asset tiene toggles). El gate del 2a captura SOLO el estado por
DEFECTO, así que cualquier cuerpo que viva detrás de un botón (revelado, corte, puerta, falla) NUNCA se mira
— ya se colaron ~15 defectos reales así, todos con exit 0. Acciona CADA botón y revisa el PNG resultante:
    SHOT_DIR=/tmp/shots BASE=http://127.0.0.1:8899 node disenos/catalog/tools/probe-state.mjs <familia>/<slug> btnA,btnB [sufijo]
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
- "TAPA INVISIBLE" (regla fuerte para cualquier asset con INTERIOR): tres cosas tapan la boca sin verse en
  los conteos — (1) el gabinete como BOX macizo (su cara frontal queda tras el hueco) → constrúyelo como
  cascarón de 5 paneles; (2) la cara de sellado con CylinderGeometry = disco lleno → RingGeometry; (3) el
  empaque con cilindro = disco → TorusGeometry. Si tiene interior, todo lo que rodea la boca va anillo/toro
  y el gabinete NUNCA es box macizo. Se detecta SOLO abriendo la puerta/tapa en la captura de estado.
- GUILLOTINA (campana, cortina): la cenefa/caja debe ser al menos tan alta como el RECORRIDO de la hoja, o
  al subir sale por el techo.

Trabaja en bucle por todos los assets pendientes de tu familia. Cuando tu familia quede en done, avisa y
elige otra familia libre si queda, o detente.
```

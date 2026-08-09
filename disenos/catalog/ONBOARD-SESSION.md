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

PASO 3 — COMMIT + STATUS:
- Commit por asset en tu rama (git -C <worktree> add/commit). NO hagas push.
- Marca status de TUS assets en catalog.yaml (pending→done). NO toques otras familias.
- session-A mergea tu rama a master con revisión. Cuando termines un lote, avísale por SendMessage
  (busca su nombre con ListAgents; suele ser la sesión en el worktree principal / master).

FAMILIAS needs-research (robotica, transporte, automotriz): corre /research-sdd PRIMERO para la técnica
dura (jerarquía de joints/IK; scroll de textura para banda). Bloques de corpus arrancan en B59
(B57/B58 ya tomados); sincroniza con research-sdd-status.sh <target> --sync-state antes de tocar el envelope.

GOTCHAS ya detectados (evítalos):
- Sujetos VERTICALES de metal desnudo (puertas, cladding, tableros) reflejan el horizonte oscuro y se leen
  gris plano. NO subas metalness (rompe HANDBOOK §3.1): añade un fill hacia la normal del panel y sube
  environmentIntensity. Documenta la desviación en el design-spec.
- Racks/estructuras de carga: el bastidor debe cubrir la carga superior + margen (DGUV: +500 mm sobre el
  nivel más alto). No dejes carga volando por encima del puntal.

Trabaja en bucle por todos los assets pendientes de tu familia. Cuando tu familia quede en done, avisa y
elige otra familia libre si queda, o detente.
```

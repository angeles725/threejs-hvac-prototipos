<!--
PARA EL USUARIO: para lanzar una sesión nueva de modelado del catálogo, pon /model en Opus 5 y dile:
    Lee disenos/catalog/LAUNCH-PROMPT.md y síguelo al pie.
La sesión NO se auto-asigna worktree (eso fue el error que causó 6 sesiones sobre un worktree): pide asignación
a session-A y espera. session-A crea un worktree por sesión con rama propia y reparte slugs disjuntos.
-->

# Eres una sesión de modelado 3D del CATÁLOGO (repo three.js)

Trabajas de forma autónoma DENTRO de tu asignación, pero **NO eliges worktree tú**. La auto-selección se pisa:
varias sesiones eligen el mismo worktree porque ListAgents las nombra por el cwd (todas `three-js-XX`, nunca
`catalog-<x>-NN`), así que el chequeo de ocupación por nombre NUNCA da positivo. Sigue esto:

1. **Pide asignación a session-A y ESPERA.** No reclames worktree, no escribas en ningún árbol. session-A es la
   sesión en el worktree MASTER (checkout principal `/home/cristian/prototipos/three.js`, no un `catalog-*`).
   Búscala con `ListAgents` y mándale: "sesión de modelado nueva, pido asignación". Respóndele SIEMPRE al socket
   que te acuse recibo (su dirección cambia si se reinicia; no cablees un socket). Si no la alcanzas, DETENTE y
   dile al usuario que no hay quién asigne.
2. **session-A te responde: worktree propio + rama propia + slugs disjuntos.** Cada sesión escribe en SU worktree
   (índice git propio), así que dos `git add` nunca colisionan — la colisión que causó todo esto queda eliminada
   por construcción, no por vigilancia. `cd` a ese worktree para trabajar. La SEÑAL FIABLE de ocupación es tu
   `<worktree>/.session-claim.local` (untracked) con tu SOCKET + hora, contrastable contra ListAgents (socket vivo
   = respeta, ausente = huérfano, bórralo). OJO: el `cd` NO cambia tu nombre en ListAgents — ese se fija al NACER
   la sesión por el cwd, así que una sesión lanzada desde master siempre sale `three-js-XX`; por eso el nombre no
   sirve de testigo y el socket del claim sí. (Para que el nombre también sirva, la sesión tendría que lanzarse ya
   con el cwd dentro del worktree — es cosa del lanzamiento, no de este prompt.)
3. **Ponte al día:** `git -C <worktree> merge master` (NO `--ff-only`: tu rama tiene commits propios y el ff-only
   aborta). Si el worktree tiene `RESUME.md`, LÉELO y continúa lo que falta; no rehagas lo ya hecho.
4. **Modela con el pipeline canónico:** por CADA slug asignado corre `/design3d <slug> threejs` (spec-first + gates
   del skill design3d, track threejs — el catálogo vive en `disenos/`, que es su territorio). Contrato del catálogo
   y ~50 gotchas en `disenos/catalog/ONBOARD-SESSION.md` — léelo. QA envuelta en `qa-lock.sh`. Puerto HTTP PROPIO
   (no 8899, que sirve otro root) + `curl` contra una ruta que solo exista en tu worktree.
5. **Commit por asset a TU rama, rutas ESPECÍFICAS** (NUNCA `git add -A`). Marca done solo TUS slugs en catalog.yaml.
   Reporta por lote a session-A; ella mergea tu rama a master. Sin push.
6. **Handoff al ~70% de contexto:** para, commitea lo que pase gate, deja lo demás untracked, actualiza `RESUME.md`,
   avisa a session-A y cierra. No llegues al 100%.

---

## Estado (lo mantiene session-A)
- Worktrees de modelado ACTIVOS: catalog-proceso, catalog-proceso-2, catalog-proceso-3, catalog-session-b — todos
  con dueño. Una sesión nueva NO cabe salvo que session-A cree otro worktree; por eso pides asignación primero.
- Cerrados (familia completa e integrada, no relanzar): catalog-hvac, catalog-electricos-dc, catalog-robotica,
  catalog-automotriz. NOTA session-A: NO mergees `feat/catalog-robotica` (contenido ya en master; filas duplicadas en SOURCES.md).

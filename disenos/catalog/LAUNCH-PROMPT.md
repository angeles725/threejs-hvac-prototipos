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
   por construcción, no por vigilancia. `cd` a ese worktree para trabajar. La SEÑAL de ocupación es tu
   `<worktree>/.session-claim.local` (untracked) con `socket=`, `pid=`, `tmux=`, `name+ref` de ListAgents,
   `claimed=` y `last_activity=`. REGLAS DEL CLAIM (ninguna basta sola):
   - QUIEN CIERRA BORRA SU CLAIM — es parte del handoff, al mismo nivel que escribir RESUME.md y avisar a session-A.
   - El testigo de vitalidad VERIFICABLE es `ps -p <pid>` (+ correlación tmux/hora de arranque), NO "socket ausente
     en ListAgents": ListAgents NO muestra sockets, así que ese chequeo no se puede ejecutar. pid muerto = huérfano
     por MUERTE → bórralo y toma. pid vivo pero `last_activity` viejo + su RESUME dice cerrado = huérfano por
     TERMINACIÓN → confírmalo con la sesión (pregúntale) antes de tomar; no lo pises a ciegas.
   - VITALIDAD NO ES ACTIVIDAD: un pid vivo no significa que el trabajo siga. Por eso hacen falta las dos mitades
     (borrado al cerrar + last_activity), o un claim vivo-y-quieto bloquea el worktree para siempre.
   META-PRINCIPIO (vale para todo el contrato): cada señal que se aprieta suele medir algo DISTINTO de lo que la
   decisión necesita — el nombre de ListAgents mide el cwd (no la ocupación), un claim tracked mide el último
   commit (no al dueño), un lock por pid mide el proceso (no el trabajo). Antes de fijar una regla, pregunta qué
   mide exactamente y si es eso lo que decide.
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

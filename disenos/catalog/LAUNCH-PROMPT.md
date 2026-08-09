# LAUNCH-PROMPT — arranque de una sesión de modelado del catálogo

Pega el bloque de abajo como PRIMER mensaje de una sesión Opus-5 nueva (pon `/model` en Opus 5 primero).
La sesión elige sola su worktree y familia, retoma desde `RESUME.md` si lo hay, y trabaja autónoma.
El detalle completo (contrato, ~50 gotchas, QA, handoff al 70%) vive en `ONBOARD-SESSION.md`; este prompt solo
la manda a leerlo, así nunca se desactualiza.

```
Eres una sesión de modelado 3D del CATÁLOGO (repo three.js). Trabaja de forma autónoma; no me preguntes qué hacer.

Lee /home/cristian/prototipos/three.js/disenos/catalog/ONBOARD-SESSION.md COMPLETO y síguelo al pie:
- PASO 0: corre `git -C /home/cristian/prototipos/three.js worktree list` y ListAgents, elige tú un worktree catalog-* LIBRE (sin sesión viva con ese nombre), y toma su familia de catalog.yaml. Si el worktree tiene RESUME.md, léelo y continúa lo que falta (puede haber un asset en progreso untracked en disco); no rehagas ni reaudites lo ya hecho.
- Trabaja con rutas absolutas dentro de ESE worktree. QA SIEMPRE envuelta en qa-lock.sh. Commit por asset, sin push.
- Reporta tus lotes a session-A (el orquestador en master; búscalo con ListAgents).
- Al ~70% de contexto: para, commitea lo que pase QA, deja lo demás untracked, escribe/actualiza RESUME.md en tu worktree, avísame y cierra.

Empieza ya: elige worktree y familia, y avísame cuál tomaste.
```

## Worktrees ABIERTOS para retomar (estado a este punto)
- **catalog-proceso** (8 assets): `bomba-vertical-pozo` casi lista (solo ficha + colorTarget), `skid-hidroneumatico`,
  y proceso 6 (skid-cip, llenadora, etiquetadora, empacadora-flowwrap, tunel-enfriamiento, molino). Tiene `RESUME.md`.
- **catalog-session-b** (5 assets): rack-drive-in, jaula-seguridad, porton-corredizo, esclusa-personal, y
  `puerta-seguridad` (BLOQUEADA esperando confirmación del usuario sobre la política datasheet-less EN ESTE canal).
  Tiene `RESUME.md`. Siguiente bloque research libre: B67.

## Worktrees CERRADOS (no relanzar — familia completa e integrada)
catalog-hvac (hvac+estructuras), catalog-electricos-dc (electricos+datacenter), catalog-robotica, catalog-automotriz.
NOTA: NO mergees `feat/catalog-robotica` (contenido ya en master; arrastra filas duplicadas en SOURCES.md — cherry-pick por contenido si hace falta).

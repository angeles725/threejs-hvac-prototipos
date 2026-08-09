<!--
PARA EL USUARIO: para lanzar una sesión nueva de modelado del catálogo, pon /model en Opus 5 y dile solo:
    Lee disenos/catalog/LAUNCH-PROMPT.md y síguelo al pie.
Todo lo de abajo son instrucciones DIRECTAS a esa sesión; no tienes que pegar nada más.
-->

# Eres una sesión de modelado 3D del CATÁLOGO (repo three.js)

Trabaja de forma autónoma. No preguntes qué hacer: elige tú el trabajo y ejecútalo hasta terminar tu familia.
Sigue estos pasos AHORA, en orden:

1. **Elige worktree y familia (tú solo).** Corre `git -C /home/cristian/prototipos/three.js worktree list` y la
   herramienta `ListAgents`. Un worktree `catalog-*` está OCUPADO si ya hay una sesión viva con ese nombre.
   Elige uno LIBRE. Su familia está en `disenos/catalog/catalog.yaml`. Trabaja con rutas absolutas dentro de
   `/home/cristian/prototipos/three.js-worktrees/<worktree>/`. Corre `git -C <worktree> merge --ff-only master`
   antes de empezar.
2. **Si tu worktree tiene `RESUME.md`, LÉELO PRIMERO** y continúa lo que falta (puede haber un asset en progreso
   untracked en disco). No rehagas ni reaudites lo ya hecho.
3. **Lee `disenos/catalog/ONBOARD-SESSION.md` COMPLETO** y síguelo al pie: contrato por asset, ~50 gotchas,
   QA obligatoria SIEMPRE envuelta en `qa-lock.sh`, PASO 2b de estados, commit por asset (sin push).
4. **Reporta tus lotes a session-A** (el orquestador en master; búscalo con `ListAgents`).
5. **Handoff al ~70% de contexto:** para de tomar asset nuevo, commitea lo que pase QA, deja lo demás untracked,
   escribe/actualiza `RESUME.md` en tu worktree con qué está hecho y qué falta exacto, avisa a session-A y cierra.
   No llegues al 100%: ahí se pierde el cierre limpio.

Empieza ya: elige worktree y familia, y avisa a session-A cuál tomaste.

---

## Worktrees ABIERTOS para retomar (estado a este punto)
- **catalog-proceso** (8 assets): `bomba-vertical-pozo` casi lista (solo ficha + colorTarget), `skid-hidroneumatico`,
  y proceso 6 (skid-cip, llenadora, etiquetadora, empacadora-flowwrap, tunel-enfriamiento, molino). Tiene `RESUME.md`.
- **catalog-session-b** (5 assets): rack-drive-in, jaula-seguridad, porton-corredizo, esclusa-personal, y
  `puerta-seguridad` (BLOQUEADA esperando confirmación del usuario sobre la política datasheet-less EN ESTE canal).
  Tiene `RESUME.md`. Siguiente bloque research libre: B67.

## Worktrees CERRADOS (no relanzar — familia completa e integrada)
catalog-hvac (hvac+estructuras), catalog-electricos-dc (electricos+datacenter), catalog-robotica, catalog-automotriz.
NOTA para session-A: NO mergees `feat/catalog-robotica` (contenido ya en master; arrastra filas duplicadas en
SOURCES.md — cherry-pick por contenido si hace falta).

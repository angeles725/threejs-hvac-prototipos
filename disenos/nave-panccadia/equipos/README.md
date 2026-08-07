# Nave Panccadia — librería de equipos 3D

18 modelos 3D standalone del equipo y mobiliario de la planta, en acero inoxidable 304, fidelidad
**"industrial reconocible"**. Cada uno es un prototipo Three.js self-contained (importmap, un archivo
HTML). Diseñados para **integrarse al visor 3D de la nave** (fase 2) — hoy viven como catálogo.

**[`catalogo.html`](catalogo.html)** — galería con thumbnail + link al visor de cada equipo.

Pipeline: design3d (track Three.js, modo heavy) — un asset a la vez, DesignSpec → build realista →
capture con el harness de casa (`research/tools/capture.mjs`, DPR 3) → review de materiales (verdict
PASS, consola limpia). Recorrido en un loop autónomo (cron 60 s), auto-commit por asset.

## Material base (receta acero inox)

En la escena oscura de casa un metal (metalness ~0.9) refleja oscuridad y lee negro. La receta que
hace leer el inox satinado (reutilizada en todos): `scene.environmentIntensity = 2.15` + `HemisphereLight`
+ `DirectionalLight` frontal (ilumina caras verticales) + roughness 0.30 con roughnessMap cepillado +
albedo `#d2d6d8` + `toneMappingExposure 1.15`. AutoRotate default OFF (para capturas estables).

## Equipos

| Grupo | Equipos |
|---|---|
| Amasado y batido | amasadora-espiral · batidora-planetaria |
| Hornos | horno-rotativo · horno-conveccion · horno-domino · estufa-rango |
| Fermentación y frío | camara-fermentacion · fermentadora · ultracongelador |
| Proceso de masa | laminadora · rebanadora · freidora |
| Servicio y medición | mesa-trabajo · lavavajillas · bascula-piso · cuentalitros |
| Mobiliario | estanteria · silla-lavabo |

Cada equipo: `<slug>/<slug>.html` (visor) · `<slug>/design-spec.yaml` (contrato) ·
`<slug>/runs/` (capturas + review JSON del gate). Footprints tomados de
`../equipment.json` (CAD `[CERT]`).

## Fase 2 — integración (pendiente)

Instanciar estos masters en las ~90 posiciones del CAD dentro del visor de la nave
(`../nave-panccadia-3d-v20.html`), reemplazando las cajas etiquetadas actuales.

# Equipos pendientes de crear (voxel art · claude.ai)

> Lista de trabajo para Cristian. Crear cada equipo como HTML standalone en claude.ai y soltarlo
> en `voxel/` con el nombre indicado. Al soltarlo, Claude Code lo baselinea, lo audita y lo deja
> listo para trasplante a escenas. Marcar `[x]` al entregar.
>
> Pega al final de cada prompt de claude.ai:
> *"Usa three.js r0.160.0 vía importmap (unpkg). TODOS los voxeles estáticos en InstancedMesh
> por color (BoxGeometry(1,1,1) compartida); partes animadas (aspas, acoplamientos) en Groups
> separados. Renderer: ACESFilmicToneMapping exposure 1.05, SRGBColorSpace, PCFSoftShadowMap
> 2048. Declara la escala en comentario: `// SCALE: 1 voxel = 0.1 m` y respeta dimensiones
> reales del equipo. Sin geometría suave (nada de cilindros/esferas segmentados)."*

## Prioridad ALTA (los pide el hotel)

- [ ] **1. Bomba centrífuga** → `voxel/bomba-centrifuga-voxel.html`
      Partes: base/skid, motor con aletas, acoplamiento (animable), voluta, bridas de
      succión/descarga, manómetro. Real: ~1.2-1.5 m largo.
- [ ] **2. Manejadora (AHU)** → `voxel/manejadora-ahu-voxel.html`
      Partes: caja seccionada (mixing box + banco de filtros + serpentín + sección de
      ventilador), compuertas, puertas de acceso con bisagras, conexiones de ducto.
      Real: ~3-4 m largo × 2 m alto. (NO es el RTU — ese ya existe.)
- [ ] **3. Fan Coil (FCU) horizontal de plafón** → `voxel/fancoil-voxel.html`
      Partes: gabinete plano, turbina, serpentín, charola de condensados, plenum de
      descarga. Real: ~1-1.2 m. Para los pisos de la torre (VISTA CORTE).
- [ ] **4. Chiller enfriado por agua** → `voxel/chiller-agua-voxel.html`
      Partes: compresor tornillo/centrífugo arriba, dos barriles (evaporador/condensador),
      panel de control, tubería de agua con bridas grandes. Real: ~4-5 m largo.

## Prioridad MEDIA (cuarto de máquinas completo)

- [ ] **5. Caldera + tanque ACS** → `voxel/caldera-voxel.html`
      Caldera de tubos con quemador + chimenea; tanque vertical de agua caliente al lado.
- [ ] **6. Intercambiador de placas** → `voxel/intercambiador-placas-voxel.html`
      Paquete de placas con tirantes, 4 bocas bridadas, bastidor.
- [ ] **7. Tablero eléctrico + VFDs** → `voxel/tablero-vfd-voxel.html`
      Gabinete MCC de pared/piso, 2-3 VFDs con displays (LEDs), tubería conduit.
- [ ] **8. Extractor de azotea (hongo)** → `voxel/extractor-azotea-voxel.html`
      Base curb, campana hongo, rejilla lateral. Real: ~1-1.5 m.

## Prioridad BAJA (kit de acabados)

- [ ] **9. Kit ductos/difusores** → `voxel/kit-ductos-voxel.html`
      Segmentos rectos, codos, transiciones, difusor 4 vías, rejilla de retorno —
      como piezas separadas en una sola escena catálogo.
- [ ] **10. Tanque de expansión / buffer** → `voxel/tanque-expansion-voxel.html`
      Tanque vertical con patas, membrana marcada por banda de color, válvulas.

## Ya existentes (NO crear — referencia de calidad)

Chiller aire ✓ · Torre de enfriamiento ✓ · RTU Trane ✓ (×2 foundation) · Liebert/CRAC ✓ (×2) ·
Split ✓ · Minisplit ✓ · VAV ✓ (×3) · Extractor cocina ✓ · Generador eléctrico ✓ · Tracer ✓

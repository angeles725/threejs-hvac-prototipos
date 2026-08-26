# Cómo se trabajó nave-panccadia, y qué de eso nos sirve

Leído de `disenos/nave-panccadia/README.md` y de `~/investigacion/nave-panccadia/tools/`.

## El proceso, en una línea

**El modelo es derivado, nunca escrito a mano.** El HTML es una *salida de compilación*, no un
archivo que alguien edita.

```
raw/nave-panccadia.dxf
  → extract-gf.py / extract-pa.py / extract-roof.py / equipment.py   → build/*.json
  → validate-model.py      (53/53 aritmético)
  → prove-guards.py        (14/14 CAUGHT — rompe el modelo a propósito)
  → build-viewer.py        → nave-panccadia-3d.html   ← página completa, un archivo
  → topview-check.py       (oráculo visual)
```

## Esto responde lo de "colapsa la librería dentro del HTML"

`build-viewer.py` **escribe la página entera**, con el JSON de geometría incrustado, para que abra
desde `file://` sin servidor. Su docstring lo dice: *"The geometry JSON is embedded directly in the
HTML so the viewer opens from the filesystem without a server (a fetch() of a sibling file is blocked
by CORS under file://)."*

No hay librería compartida que se pegue. **No hay copia que se pueda desincronizar**, porque el
generador emite el archivo completo cada vez. Es la misma meta que perseguía `build-inline.mjs`,
resuelta un nivel más arriba y sin el riesgo.

## Las tres compuertas, y la del medio es la que no tenemos

1. `validate-model.py` — aritmética.
2. **`prove-guards.py` — inyecta el defecto que cada guardia existe para atrapar, vuelve a correr la
   compuerta real, y reporta CAUGHT o MISSED.** Su docstring: *"a guard is not trusted until it has
   been seen to FAIL."* Existe porque tres guardias de lateralidad pasaron mientras la losa estaba
   desprendida todo el tiempo.
3. `topview-check.py` — oráculo visual. **Atrapó dos defectos que la aritmética dejó pasar.**

El README es explícito: *"Do not skip the last two steps."*

## Las lecciones que ya pagamos hoy sin saberlo

De las once del README, cuatro describen exactamente lo que me pasó en esta sesión:

| Lección de nave-panccadia | Lo que me pasó hoy |
|---|---|
| **1.** La validación aritmética no atrapa una FORMA equivocada. Pasó 16/16 mientras la losa inventaba 748 m². | El gate de encuadre pasó en verde sobre un render ilegible, dos veces. |
| **3.** Prueba cada guardia rompiendo la cosa a propósito. | Mi aserción de volumen con signo **nunca se ha visto fallar**. No sé si funciona. |
| **7.** Probar guardias encuentra chequeos VACUOS, no solo equivocados. Borraron uno que "no podía fallar bajo ninguna entrada". | `ports_mate` volvió UNRESOLVABLE tres veces antes de que alguien notara que no era verificable por render. |
| **11.** Un chequeo que no PUEDE ver el defecto igual devuelve una respuesta confiada. | Mi recorte de ΔE00 cruzaba el borde del tubo y devolvió 26.4 con toda seguridad. Casi re-ilumino geometría correcta. |

Y hay una quinta viva ahora mismo: al cambiar la cámara del recorte excéntrico a ortográfica, mis
coordenadas fijas de recorte volvieron a caer fuera de la pieza y ΔE00 saltó a 34.8. **El mismo
chequeo, el mismo modo de fallo, dos veces en un día.** Un recorte fijo contra una cámara que se
mueve es un chequeo que no puede ver lo que mide.

## Lo que propongo tomar

1. **Generador de página, no librería pegada.** Un script que escriba el HTML completo desde los
   datos. Mata la deriva por construcción, que es la falla que hoy shipeó un arreglo de codos que no
   estaba en el archivo.
2. **`prove-guards`.** Antes de confiar en una aserción, romper el modelo a propósito y verificar que
   la aserción se ponga roja. Aplica ya a: volumen con signo, encuadre, y el ΔE00.
3. **Recorte de color derivado, no fijo.** El parche debe calcularse desde la geometría proyectada,
   no escribirse a mano — si no, cada cambio de cámara lo invalida en silencio.
4. **Registro de build.** nave-panccadia anota qué colapsó, disolvió, recortó y movió el visor en
   camino a la pantalla, y nunca toca el JSON medido. Nosotros hacemos correcciones de presentación
   sin dejar rastro de cuáles fueron.

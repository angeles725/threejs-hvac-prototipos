# COB-IM2 L4 — Fase 0: reconciliación de fittings

Entrada para WU-L4-REALISTA. **Sin geometría.** Decide qué fittings reales son
construibles y con qué confianza.

## El problema

El certified trae TRES vistas de la conectividad de un nodo y no coinciden:

| fuente | qué es | codos en grado 2 |
|---|---|---|
| `run.n0/n1` (== `run.ports[].node`) | la vista del run | 174 de 684 |
| `node.deg` (== `len(node.runs)`) | la vista del nodo | 635 de 684 |
| coordenadas | extremos de run que caen sobre el nodo | 91 de 684 |

`n0/n1` y `node.runs` discrepan en **703 de 2549 nodos**. Los dos índices son
bidireccionales y deberían ser inversos; no lo son.

**Descartado:** no son los offsets por hoja. 14A, 14B y 14C fallan por igual
(60% / 61% / 60%).

**La causa medible:** la distancia del nodo al extremo del run que el índice dice
que lo toca tiene mediana **0.0000 m** pero p90 **~1.0 m** y máximo **9.3 m**. Los
índices mezclan uniones exactas con una cola de entradas que no tocan nada.

## El método

El grado se toma de las **coordenadas**, que es el hecho primitivo: cuántos
extremos de run caen sobre el nodo, tolerancia 0.01 m.

La tolerancia no decide el resultado — el conteo es estable en su meseta:

| tol (m) | 0.001 | 0.01 | 0.05 | 0.15 | 0.30 |
|---|---|---|---|---|---|
| nodos grado ≥2 | 395 | 466 | 513 | 669 | 1170 |

Y el 82% de los extremos de run caen sobre algún nodo — idéntico al
`runs_connected` 82% que el propio certified declara. Las dos medidas concuerdan.

## Buckets

Un run cuyos DOS extremos caen en el mismo nodo se cuenta una sola vez y se marca
`selfLoop`; contarlo dos veces inflaba el grado y convertía codos en tees.

| tier | tipo | nodos | qué significa |
|---|---|---|---|
| CERT | elbow | 144 | grado 2 con quiebre real, y el certified también dice codo |
| CERT | tee | 65 | grado 3 real, coincide |
| CERT | transition | 8 | grado 2 recto con cambio de sección |
| CERT | cross | 1 | grado 4 real, coincide |
| CERT-TYPE-CONFLICT | elbow | 39 | la geometría dice codo, el certified dice otra cosa |
| CERT-TYPE-CONFLICT | transition | 7 | ídem, transición |
| CERT-TYPE-CONFLICT | tee | 5 | ídem, tee |
| FREE-END-BARE + DECLARED | — | 685 | **fitting declarado sobre un extremo libre** |
| FREE-END-BARE | — | 1379 | extremo de run sin nada |
| DEGENERATE-DUP + DECLARED | — | 141 | dos runs salen en la MISMA dirección |
| DEGENERATE-SELFLOOP + DECLARED | — | 56 | un run con sus dos extremos en el mismo nodo |
| FREE-END-TERMINAL | terminal | 14 | extremo libre que coincide con un terminal |
| ORPHAN + DECLARED | — | 5 | fitting sobre un nodo sin runs |

## Respuestas directas

- **Codos confiables:** 144 con acuerdo pleno; 183 si se acepta la geometría por
  encima del tipo declarado.
- **Tees confiables:** 65. **Crosses: 1** — el cross prácticamente no existe en
  esta red, pese a los 68 declarados.
- **Declarados sin soporte geométrico:** **939 de 1157** (81%).
- **Degenerados:** 197 nodos (141 con dos runs en la misma dirección + 56 con un
  run que empieza y acaba en el mismo nodo). Todos con fitting declarado. No son
  codos ni acoples: son duplicados o solapes del extractor.
- **Extremos libres:** 2064 nodos de grado 1 (1379 sin declarar + 685 con fitting
  declarado). Sólo **14** coinciden con un terminal declarado.
- **Hallazgos nuevos:** 0. Todo nodo con soporte geométrico ya estaba declarado;
  el certified es un superconjunto, no una fuente independiente.

## Guard de degeneración

**496 de los 2033 runs (24%) tienen `p0` exactamente igual a `p1`.** Su proyección
en planta es un punto, y aun así traen longitud declarada (0.25–1.82 m) y anchura
real; 242 son troncales. Suman **210.0 m de los 2540.2 m** que el panel declara:
el **8.3% de la red**.

Consecuencia geométrica: `pushBox` recibe `len0 = 1e-6`, así que la dirección
normaliza a (0,0) y las ocho esquinas colapsan. **Se dibujan con volumen cero.**

Consecuencia para esta reconciliación: un vector de dirección cero da `dot = 0`,
o sea un **giro de 90° espurio**. Sobre esa base se clasificaron mal 104 nodos
como codo. Todo nodo que toca un run degenerado queda ahora en tier
`DEGENERATE-PLANAR-STUB` con `turnInvalid: true`.

### Qué NO son

La hipótesis de que fueran bajantes verticales colapsadas por la reconstrucción
en planta está **refutada**: si lo fueran, su longitud igualaría la diferencia de
cota con el ducto al que se conectan.

- **0 de 168** casos comprobables coinciden a menos de 2 cm.
- **105 de 168** tienen el ducto vecino a la **misma** cota y aun así declaran
  ~0.9 m.
- 328 de los 496 no tienen ningún ducto horizontal en su punto.

### Qué sugieren los datos

**88 de 168 tienen longitud exactamente igual al ancho del ducto vecino** (más 9
que igualan su propio ancho y 8 su propio alto): **105 de 168 son una dimensión
de SECCIÓN, no una longitud de recorrido**. Es la firma del extractor emitiendo
como run la línea de cierre de un ducto.

Si es así, el total declarado está **inflado un 8.3%**, no sub-dibujado — y
dibujarlos como ducto vertical fabricaría 210 m que no existen. Sostenido en
105 de 168; **sin cerrar** para los 328 sin vecino. Va al extractor.

## Total construible

Con el guard aplicado: **71 nodos** de 2549, frente a 1157 fittings declarados —
el **6%**. El 269 anterior estaba contaminado por los runs degenerados.

| familia | nodos |
|---|---|
| elbowRect | 43 |
| transitionRect | 12 |
| teeRect | 8 |
| transitionRectRound | 8 (diferido: correspondencia de anillos rect↔círculo) |

Posición: 54 CERT / 17 INFER. Forma: **INFER en los 71** — el plano nunca acota
un radio de curvatura, un número de gajos ni un largo de pata.

## Abierto

1. **Los 496 degenerados y sus 210 m.** Lo más grande que encontró esta fase, y
   es anterior a este trabajo.
2. **Terminales:** 529 declarados, sólo 14 caen sobre un extremo de run (tol
   0.30 m). Los difusores no se pueden colocar emparejando por nodo.
3. **transitionRectRound (8):** diferido hasta resolver la correspondencia de
   anillos entre un rectángulo y un círculo.

## Salida

`catalog/L4-FITTINGS-RECONCILED.json` — un registro por nodo con
`{node, x, y, degGeo, turn, turnInvalid, declared, type, tier, confidence,
source, runs, sizeChange, selfLoop, touchesDegenerateRun, family,
positionProvenance, shapeProvenance}`.

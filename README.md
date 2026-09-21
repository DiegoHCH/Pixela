# Pixela

De imagen a patrón de hama beads.

Subes una foto, eliges **cuántas placas quieres usar**, y la app la convierte en un
patrón con tus cuentas reales: dividido por placas, con la lista de lo que hace falta
y las coordenadas para montarlo.

Estado: **se puede cargar una foto, encuadrarla en placas y ver el patrón en
vivo.** El pipeline entero —rejilla, cuenta más cercana en CIELAB, difuminado y
tope de colores— está escrito como funciones puras y con tests. Falta el render
grande, la lista de la compra y exportar.

---

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `docs/plan.html` | El plan completo: alcance, pipeline, stack, fases y las decisiones con su porqué. Diez secciones, sin preguntas abiertas. |
| `docs/sistema-de-diseno.html` | Fundamentos, biblioteca de componentes y las 22 pantallas (14 escritorio + 8 móvil), en tema día y noche. |
| `src/lib/` | El pipeline: `color.ts`, `palette.ts`, `sample.ts`, `quantize.ts`, `crop.ts`, `boards.ts`, `accent.ts` y `render.ts`. Sin DOM, con sus tests al lado. |
| `src/state/` | Lo que sí toca el navegador: cargar el archivo, el tema y el proyecto abierto. |
| `src/ui/` | Las pantallas. |
| `src/lib/paleta-de-diego.json` | Los 23 colores reales de la caja, extraídos de una foto. **Es código, no documentación**, y por eso vive aquí y no en `docs/`. |
| `src/styles/tokens.css` | Los tokens del sistema de diseño, día y noche. |

Los dos HTML se abren con doble clic. El de diseño trae un conmutador Día/Noche
arriba a la derecha y **ejecuta la cuantización de verdad**: las cuentas que ves
salieron del mismo algoritmo que usará la app.

---

## Las decisiones que no hay que volver a discutir

- **PWA, sin servidor.** Svelte + Vite + TypeScript. La imagen nunca sale del equipo.
- **La cuantización va en un Web Worker.** No es optimización: sin eso la app se
  congela al arrastrar un deslizante, que es lo que se hace todo el rato.
- **Los colores se comparan en CIELAB, no en RGB.** La distancia en RGB no se
  parece a cómo vemos.
- **El recorte se mide en placas, no en píxeles.** Eliges la forma del montaje y la
  imagen se ajusta a ella.
- **La unidad de trabajo es la tanda**, no la placa: lo que cabe a la vez en las
  placas que tienes (aquí, dos).
- **La paleta se captura fotografiando tus cuentas.** Nada de catálogos de fábrica.
- **La interfaz no tiene color de marca**: el acento sale del patrón abierto.

El porqué de cada una está en el plan. Si alguna se va a cambiar, léelo primero:
varias parecen arbitrarias y no lo son.

---

## Cómo se trabaja

```
npm install
npm run dev     # la app en el navegador
npm test        # el pipeline, que es lo que de verdad hay que probar
npm run check   # tipos
```

`color.ts`, `nearestBead` y `characteristicBead` son puras y deterministas, y un
error ahí no se ve: no rompe nada, sólo devuelve colores un poco equivocados
para siempre. Son las únicas que merecen test unitario de verdad — la interfaz
no.

**Los índices de un patrón pertenecen a la paleta con la que se cuantizó.** Si
filtras los metálicos con `quantizable()`, esa misma paleta filtrada tiene que
viajar al resto del pipeline: contar, dibujar y la lista de la compra. Por eso
`buildPattern()` devuelve el patrón *y* la paleta.

## Lo que sigue

1. El patrón a tamaño grande en el lienzo, con las líneas de placa y el contador.
2. Lista de colores con cantidades, y exportar PNG.
3. La vista por tanda, con las coordenadas corridas de lado a lado.

Después, la segunda mitad de la v1: ajustes de imagen, el tope de colores como
control principal, la vista por tanda, el acento derivado, y mover el pipeline
al Web Worker.

---

## Dos avisos que vienen de la foto de las cuentas

- **Dorado y plata son metálicos.** Su color cambia con el ángulo y un solo valor
  RGB no los representa. Están marcados en el JSON: hay que excluirlos de la
  cuantización automática o el algoritmo los usará como «oliva sucio» y «gris azulado».
- **Sólo hay dos placas físicas**, de 29 × 29 (841 pines cada una). Una foto de
  10.000 cuentas son seis tandas de montar, planchar y desmoldar.

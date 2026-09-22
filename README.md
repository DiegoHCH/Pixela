# Pixela

De imagen a patrón de hama beads.

Subes una foto, eliges **cuántas placas quieres usar**, y la app la convierte en un
patrón con tus cuentas reales: dividido por placas, con la lista de lo que hace falta
y las coordenadas para montarlo.

Estado: **funciona de punta a punta.** Cargas una foto, la encuadras en placas,
la conviertes, ves el patrón con su lista de cuentas y lo exportas como PNG —
completo o placa a placa. Lo que falta es la segunda mitad de la v1: ajustes de
imagen, la vista por tanda, el modo símbolos, imprimir y el Web Worker.

---

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `docs/plan.html` | El plan completo: alcance, pipeline, stack, fases y las decisiones con su porqué. Diez secciones, sin preguntas abiertas. |
| `docs/sistema-de-diseno.html` | Fundamentos, biblioteca de componentes y las 22 pantallas (14 escritorio + 8 móvil), en tema día y noche. |
| `src/lib/` | El pipeline y lo que se deriva de él: `color.ts`, `palette.ts`, `sample.ts`, `quantize.ts`, `crop.ts`, `boards.ts`, `accent.ts`, `render.ts`, `export.ts`, `sheets.ts` y los demás. Sin DOM, con sus tests al lado. |
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
- **La paleta sale del cajón, con los códigos del catálogo.** Los 23 colores
  medidos mandan en la cuantización; el catálogo de Artkal S sólo pone el código
  con el que se vuelve a comprar, siempre con «≈» delante. Capturar la paleta
  desde una foto ya no hace falta: el inventario sobre el catálogo cubre el caso
  real y se marca en dos toques.
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

Estado a 21 de septiembre de 2026. La v1 está de punta a punta: abres una
imagen, recortas en placas, conviertes, ajustas, exportas el PNG, sacas la
lista de la compra y guardas el proyecto donde quieras.

Lo que falta, en el orden en que conviene hacerlo:

1. **El pipeline al Web Worker**, con descarte de resultados obsoletos. Medido:
   en este Mac el caso peor son 29 ms y el hilo principal aguanta, así que no
   urge en escritorio — pero en el teléfono sí, y es lo que separa una demo de
   una herramienta.
2. **PWA y despliegue**: manifiesto, iconos, service worker, los estáticos en un
   CDN y la primera release a `master`, que sigue en el commit del andamiaje.
3. **El móvil de verdad**: hoja inferior de dos alturas con las tres pestañas.
   Hoy las tres columnas se apilan a 900 px, que funciona pero no es lo
   diseñado.

Hecho después de la primera vuelta: las **coordenadas** de la vista por placa,
numeradas como en el montaje completo (`coordLabels` en `render.ts`), y la
**vista imprimible** — una hoja por placa con símbolos, su regla y su leyenda,
sobre papel blanco (`lib/sheets.ts` y `ui/PrintView.svelte`).

De la v2 ya está hecho **guardar y reabrir proyectos** (`.pixela.json`), que se
adelantó porque hacía falta antes de lo previsto. Siguen fuera el editor manual
de cuentas sueltas, varias paletas guardadas, comparar dos configuraciones lado
a lado y envolverlo en Tauri.

---

## Dos avisos que vienen de la foto de las cuentas

- **Dorado y plata son metálicos.** Su color cambia con el ángulo y un solo valor
  RGB no los representa. Están marcados en el JSON: hay que excluirlos de la
  cuantización automática o el algoritmo los usará como «oliva sucio» y «gris azulado».
- **Sólo hay dos placas físicas**, de 29 × 29 (841 pines cada una). Una foto de
  10.000 cuentas son seis tandas de montar, planchar y desmoldar.

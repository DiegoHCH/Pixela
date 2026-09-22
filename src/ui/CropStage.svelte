<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { moveCrop, resizeCrop, type Handle } from '../lib/crop'
  import { project } from '../state/project.svelte'
  import { theme } from '../state/theme.svelte'

  /** Radio de agarre de una esquina, en píxeles de pantalla. */
  const GRAB = 16
  const HANDLE = 8

  let canvas = $state<HTMLCanvasElement | null>(null)
  let host = $state<HTMLDivElement | null>(null)
  let boxWidth = $state(0)
  let boxHeight = $state(0)
  let cursor = $state('grab')

  let drag: { kind: 'move' | Handle; x: number; y: number } | null = null

  const image = $derived(project.image)
  const crop = $derived(project.crop)
  const scale = $derived(
    image && boxWidth > 0 && boxHeight > 0
      ? Math.min(boxWidth / image.width, boxHeight / image.height)
      : 0,
  )

  function toImage(event: PointerEvent): { x: number; y: number } {
    const rect = canvas!.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale }
  }

  function handleAt(x: number, y: number): Handle | null {
    if (!crop) return null
    const tol = GRAB / scale
    const corners: Array<[Handle, number, number]> = [
      ['nw', crop.x, crop.y],
      ['ne', crop.x + crop.width, crop.y],
      ['sw', crop.x, crop.y + crop.height],
      ['se', crop.x + crop.width, crop.y + crop.height],
    ]
    for (const [handle, hx, hy] of corners) {
      if (Math.abs(x - hx) <= tol && Math.abs(y - hy) <= tol) return handle
    }
    return null
  }

  function inside(x: number, y: number): boolean {
    if (!crop) return false
    return x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height
  }

  function cursorFor(handle: Handle | null, over: boolean): string {
    if (handle === 'nw' || handle === 'se') return 'nwse-resize'
    if (handle === 'ne' || handle === 'sw') return 'nesw-resize'
    return over ? 'grab' : 'default'
  }

  function onpointerdown(event: PointerEvent) {
    if (!crop || !image) return
    const { x, y } = toImage(event)
    const handle = handleAt(x, y)
    if (!handle && !inside(x, y)) return
    drag = { kind: handle ?? 'move', x, y }
    cursor = handle ? cursorFor(handle, true) : 'grabbing'
    host?.setPointerCapture(event.pointerId)
  }

  function onpointermove(event: PointerEvent) {
    if (!crop || !image) return
    const { x, y } = toImage(event)

    if (!drag) {
      cursor = cursorFor(handleAt(x, y), inside(x, y))
      return
    }

    if (drag.kind === 'move') {
      project.crop = moveCrop(crop, x - drag.x, y - drag.y, image.width, image.height)
      drag.x = x
      drag.y = y
    } else {
      project.crop = resizeCrop(
        crop,
        drag.kind,
        x,
        y,
        image.width,
        image.height,
        project.aspect,
      )
    }
  }

  function onpointerup(event: PointerEvent) {
    drag = null
    cursor = 'grab'
    host?.releasePointerCapture(event.pointerId)
  }

  /** Mover el recorte sin ratón. Con Mayúsculas, a zancadas. */
  function onkeydown(event: KeyboardEvent) {
    if (!crop || !image) return
    const step = (event.shiftKey ? 20 : 2) / (scale || 1)
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    project.crop = moveCrop(crop, move[0], move[1], image.width, image.height)
  }

  $effect(() => {
    const el = canvas
    const img = image
    const rect = crop
    const s = scale
    // Leído para que el redibujado dependa del tema, no por su valor.
    theme.current

    if (!el || !img || !rect || !s) return

    const width = img.width * s
    const height = img.height * s
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    el.style.width = `${width}px`
    el.style.height = `${height}px`

    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(img.source, 0, 0, width, height)

    const cx = rect.x * s
    const cy = rect.y * s
    const cw = rect.width * s
    const ch = rect.height * s

    // Fuera del recorte se oscurece, no se recorta: sigues viendo qué dejas fuera.
    ctx.fillStyle = 'rgba(9,12,13,.60)'
    ctx.fillRect(0, 0, width, cy)
    ctx.fillRect(0, cy + ch, width, height - cy - ch)
    ctx.fillRect(0, cy, cx, ch)
    ctx.fillRect(cx + cw, cy, width - cx - cw, ch)

    ctx.strokeStyle = 'rgba(255,255,255,.85)'
    ctx.lineWidth = 1
    ctx.strokeRect(cx + 0.5, cy + 0.5, cw, ch)

    ctx.strokeStyle = 'rgba(255,255,255,.35)'
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + (cw * i) / 3, cy)
      ctx.lineTo(cx + (cw * i) / 3, cy + ch)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx, cy + (ch * i) / 3)
      ctx.lineTo(cx + cw, cy + (ch * i) / 3)
      ctx.stroke()
    }

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    for (const [hx, hy] of [
      [cx, cy],
      [cx + cw, cy],
      [cx, cy + ch],
      [cx + cw, cy + ch],
    ]) {
      ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE)
    }
  })
</script>

<!--
  El recorte se arrastra con el ratón y se empuja con las flechas; el rol va en
  el contenedor porque un <canvas> no puede llevarlo.

  `role="application"` es justo lo que pide una superficie de manipulación
  directa —le dice al lector de pantalla que deje pasar las teclas— y necesita
  foco para recibirlas. La regla que se salta aquí lo trata como no interactivo,
  que es lo contrario de lo que es.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="stage-canvas"
  bind:clientWidth={boxWidth}
  bind:clientHeight={boxHeight}
  bind:this={host}
  style:cursor
  role="application"
  tabindex="0"
  aria-label={i18n.t('stage.crop')}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  {onkeydown}
>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .stage-canvas {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    overflow: auto;
    padding: 18px;
  }

  canvas {
    display: block;
    /* Centra cuando cabe y deja llegar al borde cuando no. */
    margin: auto;
    touch-action: none;
    border-radius: var(--radius-square);
  }
</style>

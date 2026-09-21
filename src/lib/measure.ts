/**
 * El tamaño de la pieza terminada, en milímetros.
 *
 * Es lo primero que se pregunta quien va a enmarcar o a vender, y no estaba en
 * ninguna parte: la app hablaba sólo en cuentas y en placas.
 *
 * Ojo con las dos medidas que se confunden. En una placa de 29 pines con paso
 * de 5 mm hay **28 huecos**, así que del primer pin al último hay 140 mm; el
 * plástico terminado mide 145 mm, porque cada cuenta del borde añade medio
 * diámetro. Aquí se calcula lo segundo, que es lo que vas a colgar.
 */

/** Paso entre pines de una placa midi, en milímetros. */
export const MIDI_PITCH_MM = 5

export interface PhysicalSize {
  widthMm: number
  heightMm: number
}

export function physicalSize(
  cols: number,
  rows: number,
  pitchMm: number = MIDI_PITCH_MM,
): PhysicalSize {
  if (cols < 1 || rows < 1) throw new Error(`Rejilla inválida: ${cols} × ${rows}.`)
  if (!(pitchMm > 0)) throw new Error(`Paso inválido: ${pitchMm}.`)
  // Una cuenta por celda, y cada cuenta ocupa un paso: el ancho es cuentas × paso.
  return { widthMm: cols * pitchMm, heightMm: rows * pitchMm }
}

/** La distancia de centro a centro entre los pines extremos: n − 1 huecos. */
export function pinSpanMm(pins: number, pitchMm: number = MIDI_PITCH_MM): number {
  if (pins < 1) throw new Error(`Pines inválidos: ${pins}.`)
  return (pins - 1) * pitchMm
}

/** En centímetros y con una decimal, que es como se habla de un cuadro. */
export function formatCm(mm: number): string {
  return (mm / 10).toFixed(1).replace('.', ',')
}

export function formatSize(size: PhysicalSize): string {
  return `${formatCm(size.widthMm)} × ${formatCm(size.heightMm)} cm`
}

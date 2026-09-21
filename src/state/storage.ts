/**
 * Acceso a `localStorage` que no revienta donde no existe.
 *
 * No es paranoia: Node expone un `localStorage` global a medio hacer —el objeto
 * está pero `getItem` no es una función—, así que comprobar `typeof
 * localStorage` no basta. Aquí se comprueba que los métodos existan de verdad.
 */

function store(): Storage | null {
  try {
    const s = globalThis.localStorage
    return s && typeof s.getItem === 'function' && typeof s.setItem === 'function' ? s : null
  } catch {
    // Un navegador con el almacenamiento bloqueado lanza al tocarlo.
    return null
  }
}

export function readString(key: string): string | null {
  return store()?.getItem(key) ?? null
}

export function writeString(key: string, value: string): void {
  try {
    store()?.setItem(key, value)
  } catch {
    // Sin espacio o en modo privado: se pierde la preferencia, no la sesión.
  }
}

export function removeKey(key: string): void {
  try {
    store()?.removeItem(key)
  } catch {
    /* igual que arriba */
  }
}

/** Un número guardado, validado contra su rango. Si no cuadra, el de reserva. */
export function readNumber(
  key: string,
  fallback: number,
  { min = -Infinity, max = Infinity }: { min?: number; max?: number } = {},
): number {
  const raw = readString(key)
  if (raw === null) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) return fallback
  return value
}

export function writeNumber(key: string, value: number): void {
  writeString(key, String(value))
}

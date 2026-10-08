export const MODE_JARINGAN = ['instan', 'normal', 'lambat', 'gagal'] as const
export type ModeJaringan = (typeof MODE_JARINGAN)[number]

const KUNCI = 'sinfodes.demo.jaringan'
let modeMemori: ModeJaringan | null = null

const valid = (x: unknown): x is ModeJaringan =>
  typeof x === 'string' && (MODE_JARINGAN as readonly string[]).includes(x)

export function bacaModeJaringan(): ModeJaringan {
  try {
    const tersimpan = globalThis.localStorage?.getItem(KUNCI)
    if (valid(tersimpan)) return tersimpan
  } catch {
    // localStorage tidak tersedia (mis. uji di Node): pakai memori.
  }
  return modeMemori ?? (import.meta.env.MODE === 'test' ? 'instan' : 'normal')
}

export function aturModeJaringan(mode: ModeJaringan): void {
  modeMemori = mode
  try {
    globalThis.localStorage?.setItem(KUNCI, mode)
  } catch {
    // Diabaikan: pilihan tetap berlaku lewat memori.
  }
}

/** Jeda simulasi: normal 150–400 ms, lambat (3G) 1,5–3 detik (SPEC §3.6). */
export function jedaUntuk(mode: ModeJaringan): number {
  switch (mode) {
    case 'instan':
      return 0
    case 'normal':
      return 150 + Math.floor(Math.random() * 251)
    case 'lambat':
      return 1500 + Math.floor(Math.random() * 1501)
    case 'gagal':
      return 300
  }
}

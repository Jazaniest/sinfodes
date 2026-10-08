export type Acak = {
  /** Bilangan [0, 1). */
  angka(): number
  /** Bilangan bulat min..max (inklusif). */
  bulat(min: number, max: number): number
  pilih<T>(daftar: readonly T[]): T
  berbobot<T>(pilihan: ReadonlyArray<readonly [T, number]>): T
  peluang(p: number): boolean
  acakUrutan<T>(daftar: readonly T[]): T[]
  /** ID unik: `${awalan}_` + 6 karakter base36. */
  id(awalan: string): string
}

/** Pengacak mulberry32: seed sama → data demo sama (SPEC §12). */
export function buatAcak(seed: number): Acak {
  let s = seed >>> 0
  const angka = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const bulat = (min: number, max: number) => min + Math.floor(angka() * (max - min + 1))
  const idTerpakai = new Set<string>()

  return {
    angka,
    bulat,
    pilih: (daftar) => {
      if (daftar.length === 0) throw new Error('Daftar kosong')
      return daftar[bulat(0, daftar.length - 1)]
    },
    berbobot: (pilihan) => {
      const total = pilihan.reduce((jumlah, [, bobot]) => jumlah + bobot, 0)
      let r = angka() * total
      for (const [nilai, bobot] of pilihan) {
        r -= bobot
        if (r < 0) return nilai
      }
      return pilihan[pilihan.length - 1][0]
    },
    peluang: (p) => angka() < p,
    acakUrutan: (daftar) => {
      const hasil = [...daftar]
      for (let i = hasil.length - 1; i > 0; i--) {
        const j = bulat(0, i)
        ;[hasil[i], hasil[j]] = [hasil[j], hasil[i]]
      }
      return hasil
    },
    id: (awalan) => {
      for (;;) {
        const kandidat = `${awalan}_${Math.floor(angka() * 36 ** 6).toString(36).padStart(6, '0')}`
        if (!idTerpakai.has(kandidat)) {
          idTerpakai.add(kandidat)
          return kandidat
        }
      }
    },
  }
}

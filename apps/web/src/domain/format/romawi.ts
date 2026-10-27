const NILAI: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** 4 → "IV". Dipakai untuk nomor dusun ("Dusun IV"). */
export function angkaRomawi(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error(`Angka Romawi tidak valid: ${n}`)
  let sisa = n
  let hasil = ''
  for (const [nilai, simbol] of NILAI) {
    while (sisa >= nilai) {
      hasil += simbol
      sisa -= nilai
    }
  }
  return hasil
}

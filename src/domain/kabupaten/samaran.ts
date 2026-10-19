/** Sel angka gabungan untuk kabupaten: angka tampak, "<5" untuk 1-4, atau "*" untuk penyamaran pelengkap. */
export type SelSamar = number | '<5' | '*'

const kecil = (n: number) => n >= 1 && n <= 4

/**
 * Penyamaran angka di bawah 5 (SPEC-V0.2 §8.3 butir 6). `garis` adalah himpunan sel yang terikat satu jumlah: indeks pertama
 * induknya (jumlah), sisanya anak. Angka 1-4 menjadi "<5". [Usul] Penyamaran pelengkap: bila dalam satu garis hanya satu sel
 * yang tersamar, angka itu bisa dihitung dari jumlahnya, jadi anak terkecil berikutnya yang lebih dari 0 ikut disamarkan
 * ("*"; seri: indeks terkecil). Diulang sampai tidak ada garis yang berubah, karena pelengkap di satu garis bisa membuka garis lain.
 */
export function samarkan(nilai: readonly number[], garis: readonly (readonly number[])[]): SelSamar[] {
  const hasil: SelSamar[] = nilai.map((n) => (kecil(n) ? '<5' : n))
  const tersamar = (i: number) => typeof hasil[i] === 'string'
  for (let berubah = true; berubah; ) {
    berubah = false
    for (const g of garis) {
      if (g.filter(tersamar).length !== 1) continue
      let calon = -1
      for (const i of g.slice(1)) {
        if (tersamar(i) || nilai[i] <= 0) continue
        if (calon < 0 || nilai[i] < nilai[calon] || (nilai[i] === nilai[calon] && i < calon)) calon = i
      }
      if (calon >= 0) {
        hasil[calon] = '*'
        berubah = true
      }
    }
  }
  return hasil
}

/**
 * Toples cookie sebesar peramban: menyimpan `Set-Cookie` per host (cookie tanpa atribut Domain hanya kembali ke host yang
 * menerbitkannya), menghapus cookie yang `Max-Age=0`, dan menyusun header `Cookie`. Dipakai uji konformansi agar `panggilApi`
 * web berbicara dengan server sungguhan seperti di peramban.
 */
export class ToplesKuki {
  private readonly isi = new Map<string, Map<string, string>>()

  simpan(host: string, barisSetCookie: readonly string[]): void {
    for (const baris of barisSetCookie) {
      const [pasangan, ...atribut] = baris.split(';').map((s) => s.trim())
      const sama = pasangan.indexOf('=')
      if (sama < 1) continue
      const nama = pasangan.slice(0, sama)
      const nilai = pasangan.slice(sama + 1)
      const kuki = this.isi.get(host) ?? new Map<string, string>()
      if (nilai === '' || atribut.some((a) => /^max-age=0$/i.test(a))) kuki.delete(nama)
      else kuki.set(nama, nilai)
      this.isi.set(host, kuki)
    }
  }

  /** Nilai header `Cookie` untuk host ini, atau null bila kosong. */
  header(host: string): string | null {
    const kuki = this.isi.get(host)
    if (!kuki || kuki.size === 0) return null
    return [...kuki].map(([nama, nilai]) => `${nama}=${nilai}`).join('; ')
  }

  ada(host: string, nama: string): boolean {
    return this.isi.get(host)?.has(nama) ?? false
  }

  kosongkan(): void {
    this.isi.clear()
  }
}

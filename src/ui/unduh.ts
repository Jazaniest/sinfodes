/** Simpan teks sebagai berkas di perangkat pengguna (CSV, template, laporan). */
export function unduhBerkas(namaBerkas: string, isi: string, tipe = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }))
  const tautan = document.createElement('a')
  tautan.href = url
  tautan.download = namaBerkas
  document.body.append(tautan)
  tautan.click()
  tautan.remove()
  // Dilepas setelah klik diproses; tanpa ini blob tertahan di memori sampai tab ditutup.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Isi berkas sebagai data URL, mis. untuk menyimpan lambang di data desa. */
export function bacaDataUrl(berkas: Blob): Promise<string> {
  return new Promise((selesai, gagal) => {
    const pembaca = new FileReader()
    pembaca.onload = () => selesai(String(pembaca.result))
    pembaca.onerror = () => gagal(pembaca.error ?? new Error('Berkas tidak bisa dibaca'))
    pembaca.readAsDataURL(berkas)
  })
}

import type { DbDemo, KirimanWarga } from '@sinfodes/demo/tipe-db'

/** Kiriman sebelumnya dengan kunci yang sama (Kirim ulang), atau undefined bila kuncinya baru (fokus review 1). */
export const kirimanSebelumnya = (db: DbDemo, pendudukId: string, jenis: KirimanWarga['jenis'], kunci: string) =>
  db.kirimanWarga.find((k) => k.pendudukId === pendudukId && k.jenis === jenis && k.kunci === kunci)

/** Dipanggil di dalam `ubahDb`. */
export function catatKiriman(db: DbDemo, k: KirimanWarga): void {
  db.kirimanWarga.push(k)
}

/** Bagian `data` (JSON) dan berkas dari kiriman multipart layanan warga. `data` yang rusak menjadi null. */
export async function bacaMultipart(request: Request): Promise<{ data: unknown; berkas: (nama: string) => File[] }> {
  const form = await request.formData().catch(() => null)
  const mentah = form?.get('data')
  let data: unknown = null
  if (typeof mentah === 'string') {
    try {
      data = JSON.parse(mentah)
    } catch {
      data = null
    }
  }
  return { data, berkas: (nama) => (form?.getAll(nama) ?? []).filter((x): x is File => x instanceof File) }
}

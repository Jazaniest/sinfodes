import { http, HttpResponse } from 'msw'
import { REKENING_SINFODES } from '@/app/kontak-sinfodes'
import { tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { galatBerkasBukti, jenisBerkasBukti, PESAN_BUKTI_WAJIB, type LanggananDesa, type TagihanCetak } from '@/domain/langganan/schema'
import { isianBuktiSchema, type Tagihan } from '@/domain/langganan/tagihan'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { kwitansiTagihan, pastikanTagihan, tagihanBerjalan } from '../tagihan'
import { dataJson, galatIsian, butuhKemampuan } from '../tulis'

const TIDAK_DITEMUKAN = 'Tagihan tidak ditemukan.'
const PESAN_LIHAT = 'Peran Anda tidak membuka Langganan.'
const PESAN_BAYAR = 'Peran Anda tidak mengunggah bukti pembayaran.'

const urutTerbaru = (a: Tagihan, b: Tagihan): number => b.periode.mulai.localeCompare(a.periode.mulai) || b.id.localeCompare(a.id)

/** Tagihan milik desa sesi; tagihan desa lain diperlakukan seperti tidak ada supaya keberadaannya tidak bocor. */
const tagihanDesa = (pengguna: PenggunaSesi, id: string): Tagihan | undefined =>
  ambilDb().tagihan.find((t) => t.id === id && t.desaId === pengguna.desaId)

/** Bytes → data URL base64, dipotong per bagian supaya tidak melampaui batas argumen `fromCharCode`. */
async function keDataUrl(berkas: File): Promise<string> {
  const bait = new Uint8Array(await berkas.arrayBuffer())
  let biner = ''
  for (let i = 0; i < bait.length; i += 0x8000) biner += String.fromCharCode(...bait.subarray(i, i + 0x8000))
  const tipe = berkas.type || (berkas.name.toLowerCase().endsWith('.webp') ? 'image/webp' : berkas.name.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png')
  return `data:${tipe};base64,${btoa(biner)}`
}

/**
 * Langganan desa di panel (SPEC-V0.2 §10): tagihan berjalan, riwayat, dokumen cetak, dan unggah bukti transfer. Semua handler
 * menerbitkan dulu tagihan yang sudah waktunya. Hanya pimpinan dan bendahara desa; tagihan desa lain dijawab 404.
 */
export const handlerLangganan = [
  http.get(
    `${API}/langganan`,
    denganJaringan(({ request }) => {
      const pengguna = butuhKemampuan(request, 'langganan.lihat', PESAN_LIHAT)
      if (pengguna instanceof Response) return pengguna
      pastikanTagihan(new Date())
      const db = ambilDb()
      const l = db.langganan.find((x) => x.desaId === pengguna.desaId)
      if (!l) return balasGalat('NOT_FOUND', 'Langganan desa tidak ditemukan.', 404)
      const hasil: LanggananDesa = {
        paket: l.paket,
        periodeTagihan: l.periodeTagihan,
        masaAktif: l.mulai && l.sampai ? { mulai: l.mulai, sampai: l.sampai } : null,
        berjalan: tagihanBerjalan(db, pengguna.desaId),
        riwayat: db.tagihan.filter((t) => t.desaId === pengguna.desaId).sort(urutTerbaru),
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/langganan/tagihan/:id`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'langganan.lihat', PESAN_LIHAT)
      if (pengguna instanceof Response) return pengguna
      pastikanTagihan(new Date())
      const t = tagihanDesa(pengguna, String(params.id))
      const desa = ambilDb().desa.find((d) => d.id === pengguna.desaId)
      if (!t || !desa) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      const hasil: TagihanCetak = {
        ...t,
        desa: { nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama, alamatKantor: desa.alamatKantor },
        rekening: { ...REKENING_SINFODES },
      }
      return HttpResponse.json(hasil)
    }),
  ),
  http.get(
    `${API}/langganan/tagihan/:id/kwitansi`,
    denganJaringan(({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'langganan.lihat', PESAN_LIHAT)
      if (pengguna instanceof Response) return pengguna
      const t = tagihanDesa(pengguna, String(params.id))
      const kwitansi = t ? kwitansiTagihan(ambilDb(), t) : null
      return kwitansi ? HttpResponse.json(kwitansi) : balasGalat('NOT_FOUND', 'Kwitansi belum tersedia.', 404)
    }),
  ),
  http.post(
    `${API}/langganan/tagihan/:id/bukti`,
    denganJaringan(async ({ request, params }) => {
      const pengguna = butuhKemampuan(request, 'langganan.bayar', PESAN_BAYAR)
      if (pengguna instanceof Response) return pengguna
      const form = await request.formData().catch(() => null)
      const berkas = form?.get('bukti')
      // Semua `await` selesai sebelum membaca keadaan tagihan: dua kiriman beruntun tidak bisa sama-sama lolos pemeriksaan status.
      const dataUrl = berkas instanceof File && jenisBerkasBukti(berkas) === 'gambar' && galatBerkasBukti(berkas) === null ? await keDataUrl(berkas) : null
      const sekarang = new Date()
      pastikanTagihan(sekarang)
      const t = tagihanDesa(pengguna, String(params.id))
      if (!t) return balasGalat('NOT_FOUND', TIDAK_DITEMUKAN, 404)
      if (t.status !== 'terbit') return balasGalat('CONFLICT', 'Tagihan ini tidak menunggu pembayaran.', 409)

      const isian = isianBuktiSchema.safeParse(dataJson(form))
      const fields: Record<string, string> = isian.success ? {} : galatIsian(isian.error)
      if (isian.success && isian.data.tanggalTransfer > tanggalIsoWib(sekarang)) fields.tanggalTransfer = 'Tanggal transfer tidak boleh sesudah hari ini.'
      if (!(berkas instanceof File)) fields.bukti = PESAN_BUKTI_WAJIB
      else {
        const galat = galatBerkasBukti(berkas)
        if (galat) fields.bukti = galat
      }
      if (!isian.success || Object.keys(fields).length > 0) return balasGalat('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, fields)
      if (!(berkas instanceof File)) return balasGalat('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, { bukti: PESAN_BUKTI_WAJIB })

      const pada = waktuIsoWib(sekarang)
      const oleh = { jenis: 'desa' as const, id: pengguna.id, nama: pengguna.nama }
      ubahDb((d) => {
        const sasaran = d.tagihan.find((x) => x.id === t.id)!
        sasaran.status = 'menunggu-verifikasi'
        sasaran.penolakanTerakhir = null
        sasaran.bukti = {
          berkas: berkas.name,
          ukuranKb: Math.max(1, Math.ceil(berkas.size / 1024)),
          jenisBerkas: jenisBerkasBukti(berkas)!,
          dataUrl,
          tanggalTransfer: isian.data.tanggalTransfer,
          namaPengirim: isian.data.namaPengirim,
          nominalTransfer: isian.data.nominalTransfer,
          nominalCocok: isian.data.nominalTransfer === sasaran.nominal,
          diunggahPada: pada,
          oleh,
        }
        sasaran.riwayat.push({ status: 'menunggu-verifikasi', pada, oleh, catatan: null })
      })
      return HttpResponse.json(ambilDb().tagihan.find((x) => x.id === t.id))
    }),
  ),
]

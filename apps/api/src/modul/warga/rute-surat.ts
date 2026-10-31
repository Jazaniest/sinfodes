import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { badanGalat, GalatApp } from '../../galat'
import { butuhSesiWarga } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import type { Penyandi } from '../../kripto/penyandi'
import type { EfekSurat } from '../permohonan/efek-surat'
import { ajukanSuratWarga, PESAN_ISI_PENGAJUAN_TIDAK_TERBACA, tolakBilaLayananDitutup } from './layanan-ajukan'
import { daftarJenisWarga, daftarPermohonanWarga, detailPermohonanWarga, keluargaWarga, type KonteksWargaSurat } from './layanan-surat'

export type DepsRuteWargaSurat = { penyandi: Penyandi; efek: EfekSurat }

/** Jalur pengajuan: satu-satunya rute warga dengan batas badan lebih besar dari bawaan (sepuluh foto 2 MB beserta sampul multipart). */
export const JALUR_AJUKAN_WARGA = '/api/v1/warga/permohonan'
export const BATAS_BADAN_AJUKAN = 21 * 1024 * 1024

/**
 * Layanan surat untuk warga (SPEC-V0.3 §8.5, rencana 8F3): jenis yang bisa diajukan, keluarga, serta daftar dan detail
 * permohonan milik warga. Hanya sesi warga yang berlaku; tiap kueri dibatasi desa oleh RLS dan kepemilikan oleh SQL.
 */
export function ruteWargaSurat(deps: DepsRuteWargaSurat): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  const konteks = (c: Parameters<typeof butuhSesiWarga>[0]): KonteksWargaSurat => {
    const { db, pelaku, desa } = butuhSesiWarga(c)
    return { db, penyandi: deps.penyandi, desa: desa.desa, pendudukId: pelaku.pendudukId, sekarang: c.get('waktu')() }
  }

  rute.get('/jenis-surat', async (c) => c.json(await daftarJenisWarga(konteks(c))))
  rute.get('/keluarga', async (c) => c.json(await keluargaWarga(konteks(c))))
  rute.get('/permohonan', async (c) => c.json(await daftarPermohonanWarga(konteks(c))))
  // Badan dibaca setelah transaksi permintaan dibuka, jadi unggahan besar menahan satu koneksi basis data selama berjalan
  // (pengerasan lewat batas di proksi dan antrean menyusul di 8K).
  rute.post(
    '/permohonan',
    bodyLimit({ maxSize: BATAS_BADAN_AJUKAN, onError: (c) => c.json(badanGalat('VALIDATION', 'Isi permintaan terlalu besar.'), 413) }),
    async (c) => {
      const k = konteks(c)
      tolakBilaLayananDitutup(butuhSesiWarga(c).desa.desa)
      const form = await c.req.formData().catch(() => null)
      if (!form) throw new GalatApp('VALIDATION', PESAN_ISI_PENGAJUAN_TIDAK_TERBACA, 422)
      const mentah = form.get('data')
      let data: unknown = null
      if (typeof mentah === 'string') {
        try {
          data = JSON.parse(mentah)
        } catch {
          data = null
        }
      }
      const berkas = form.getAll('lampiran').filter((x): x is File => x instanceof File)
      const hasil = await ajukanSuratWarga({ ...k, efek: deps.efek }, { data, berkas })
      const { diulang, ...badan } = hasil
      if (diulang) c.header('Idempotency-Replayed', 'true')
      return c.json(badan, diulang ? 200 : 201)
    },
  )
  rute.get('/permohonan/:id', async (c) => c.json(await detailPermohonanWarga(konteks(c), c.req.param('id'))))

  return rute
}

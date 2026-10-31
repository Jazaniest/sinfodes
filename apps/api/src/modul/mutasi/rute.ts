import { filterMutasiSchema } from '@sinfodes/kontrak/mutasi/buku'
import type { HasilMutasi } from '@sinfodes/kontrak/mutasi/masukan'
import { Hono } from 'hono'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import type { EfekSilang } from './efek-silang'
import { daftarMutasi, ringkasanMutasi } from './layanan'
import { denganIdempotensi } from '../../idempotensi/idempotensi'
import { catatDatang, catatLahir, catatMeninggal, catatPindah, pulihkanHasilMutasi, type KonteksMutasiTulis } from './layanan-tulis'

const TIDAK_BERHAK = 'Peran Anda tidak berhak melihat data mutasi.'
const TIDAK_BERHAK_UBAH = 'Peran Anda tidak berhak mengubah data kependudukan.'
const BULAN = /^\d{4}-(0[1-9]|1[0-2])$/

export function ruteMutasi(deps: { penyandi: Penyandi; efek: EfekSilang }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/ringkasan', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const bulan = new URL(c.req.url).searchParams.get('bulan') ?? undefined
    if (bulan !== undefined && !BULAN.test(bulan)) throw new GalatApp('VALIDATION', 'Bulan tidak valid.', 422)
    return c.json(await ringkasanMutasi({ db, pelaku, hariIni: c.get('waktu')() }, bulan))
  })

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'penduduk.lihat', TIDAK_BERHAK)
    const filter = filterMutasiSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
    if (!filter.success) throw new GalatApp('VALIDATION', 'Filter tidak valid.', 422)
    return c.json(await daftarMutasi({ db, pelaku, hariIni: c.get('waktu')() }, filter.data))
  })

  const tulis = (c: Parameters<typeof butuhAkses>[0]) => {
    const { db, pelaku, desa } = butuhAkses(c, 'penduduk.ubah', TIDAK_BERHAK_UBAH)
    return { db, penyandi: deps.penyandi, pelaku, desa: desa.desa, sekarang: c.get('waktu')(), efek: deps.efek }
  }

  /**
   * Satu pintu untuk keempat POST mutasi: header `Idempotency-Key` (opsional) membuat pengiriman ulang mengembalikan hasil
   * pertama dan tidak menggandakan mutasi (SPEC-V0.3 §5.4 butir 4). Jawaban ulang ditandai `Idempotency-Replayed: true`.
   */
  const catat = (jalur: string, jalankan: (k: KonteksMutasiTulis, mentah: unknown) => Promise<HasilMutasi>) => async (c: Parameters<typeof tulis>[0]) => {
    const k = tulis(c)
    const mentah = await c.req.json().catch(() => null)
    const { hasil, diulang } = await denganIdempotensi(
      { db: k.db, pelakuId: k.pelaku.id, desaId: k.desa.id, sekarang: k.sekarang },
      {
        kunci: c.req.header('Idempotency-Key'),
        jalur: `mutasi/${jalur}`,
        isi: mentah,
        jalankan: async () => {
          const h = await jalankan(k, mentah)
          return { hasil: h, rujukan: { mutasiId: h.mutasi.id } }
        },
        pulihkan: (rujukan) => {
          // Sidik isi memuat jalur, jadi kunci mutasi tidak pernah ketemu rujukan permohonan; bila terjadi, perlakukan seperti kunci bentrok.
          if (!('mutasiId' in rujukan)) throw new GalatApp('CONFLICT', 'Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.', 409)
          return pulihkanHasilMutasi(k, rujukan.mutasiId)
        },
      },
    )
    if (diulang) c.header('Idempotency-Replayed', 'true')
    return c.json(hasil, 201)
  }

  rute.post('/lahir', catat('lahir', catatLahir))
  rute.post('/meninggal', catat('meninggal', catatMeninggal))
  rute.post('/pindah', catat('pindah', catatPindah))
  rute.post('/datang', catat('datang', catatDatang))

  return rute
}

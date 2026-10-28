import { randomBytes } from 'node:crypto'
import { aksesSinfodesSchema, beriAksesSchema, type AksesSinfodes } from '@sinfodes/kontrak/pengaturan/akses-sinfodes'
import { Hono } from 'hono'
import { catatAudit } from '../../audit'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { aksesBerlakuDesa, beriAkses, cabutAksesBerlaku, riwayatAkses } from '../../sesi/repositori-bantuan'

const PESAN_TIDAK_BERHAK = 'Hanya Sekretaris Desa dan Kepala Desa yang memberi akses bantuan Sinfodes.'

/** Keadaan akses bantuan desa: akses yang berlaku (bila ada) dan riwayat terbaru dulu. Diperiksa skema kontrak sebelum dikirim. */
async function keadaanAkses(db: Db, desaId: string, sekarang: Date): Promise<AksesSinfodes> {
  const aktif = await aksesBerlakuDesa(db, desaId, sekarang)
  const riwayat = await riwayatAkses(db, desaId, sekarang)
  return aksesSinfodesSchema.parse({
    aktif: aktif
      ? {
          id: aktif.id,
          mulai: aktif.mulai.toISOString(),
          sampai: aktif.sampai.toISOString(),
          sembunyikanDataPribadi: aktif.sembunyikanDataPribadi,
          diberiOleh: aktif.diberiOlehNama,
        }
      : null,
    riwayat,
  })
}

/**
 * Akses bantuan Sinfodes, sisi desa (SPEC-V0.2 §5.2, SPEC-V0.3 §8.6): beri, lihat, dan cabut. Hanya Sekretaris dan Kepala Desa
 * (`akses-sinfodes.kelola`), juga saat desa Ditangguhkan karena akses inilah yang membantu memulihkan desa.
 */
export function ruteAksesSinfodes(): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, desa } = butuhAkses(c, 'akses-sinfodes.kelola', PESAN_TIDAK_BERHAK)
    return c.json(await keadaanAkses(db, desa.desa.id, c.get('waktu')()))
  })

  rute.post('/', async (c) => {
    const { db, pelaku, desa } = butuhAkses(c, 'akses-sinfodes.kelola', PESAN_TIDAK_BERHAK)
    const isian = beriAksesSchema.safeParse(await c.req.json().catch(() => null))
    if (!isian.success) {
      const fields = Object.fromEntries(isian.error.issues.map((i) => [i.path.join('.') || 'isian', i.message]))
      throw new GalatApp('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, fields)
    }
    const sekarang = c.get('waktu')()
    const baru = await beriAkses(db, {
      id: `aks_${randomBytes(12).toString('base64url')}`,
      desaId: desa.desa.id,
      diberiOlehId: pelaku.id,
      diberiOlehNama: pelaku.nama,
      lamaJam: isian.data.lamaJam,
      sembunyikanDataPribadi: isian.data.sembunyikanDataPribadi,
      sekarang,
    })
    const ringkasan = { aksesId: baru.id, lamaJam: isian.data.lamaJam, sembunyikanDataPribadi: isian.data.sembunyikanDataPribadi }
    await catatAudit(db, { desaId: desa.desa.id, jenis: 'akses_bantuan.beri', pelaku: pelaku.id, waktu: sekarang, ringkasan })
    if (!isian.data.sembunyikanDataPribadi) {
      await catatAudit(db, { desaId: desa.desa.id, jenis: 'penyamaran.dimatikan', pelaku: pelaku.id, waktu: sekarang, ringkasan: { aksesId: baru.id } })
    }
    return c.json(await keadaanAkses(db, desa.desa.id, sekarang), 201)
  })

  rute.delete('/', async (c) => {
    const { db, pelaku, desa } = butuhAkses(c, 'akses-sinfodes.kelola', PESAN_TIDAK_BERHAK)
    const sekarang = c.get('waktu')()
    const dicabut = await cabutAksesBerlaku(db, desa.desa.id, sekarang)
    if (dicabut) {
      await catatAudit(db, { desaId: desa.desa.id, jenis: 'akses_bantuan.cabut', pelaku: pelaku.id, waktu: sekarang, ringkasan: { aksesId: dicabut.id } })
    }
    return c.json(await keadaanAkses(db, desa.desa.id, sekarang))
  })

  return rute
}

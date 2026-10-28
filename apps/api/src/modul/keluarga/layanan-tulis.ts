import { randomUUID } from 'node:crypto'
import { waktuIsoWib, tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { gantiKepalaSchema, pecahKeluargaSchema } from '@sinfodes/kontrak/keluarga/masukan'
import type { DetailKeluarga } from '@sinfodes/kontrak/keluarga/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { daftarDusunDesa } from '../../basisdata/desa'
import { pelanggaranUnik } from '../../basisdata/galat-pg'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas, catatRiwayat, pelakuKontrak } from '../../riwayat/catat'
import type { KonteksTulis } from '../penduduk/layanan-tulis'
import type { RekamPenduduk } from '../penduduk/repositori'
import { INDEKS_KK, kunciKeluarga, perbaruiPenduduk, sisipKeluarga, type PerubahanPenduduk } from '../penduduk/repositori-tulis'
import { detailKeluarga, PESAN_KELUARGA_TIDAK_ADA } from './layanan'
import { nomorKkBaru } from './nomor'
import { bacaAnggotaHidup, setKepalaKeluarga } from './repositori'
import { wilayahSah } from './wilayah-sah'

/**
 * Mengubah hubungan dalam keluarga dan mencatatnya di Riwayat. Hubungan yang sama tidak menulis apa pun kecuali `tambahan`
 * (alamat dan urutan yang ikut berpindah). Dipanggil dalam transaksi permintaan.
 */
async function ubahHubungan(k: KonteksTulis, p: RekamPenduduk, baru: string, tambahan: PerubahanPenduduk = {}): Promise<void> {
  let set = tambahan
  if (p.hubunganKeluarga !== baru) {
    await catatRiwayat(k.db, k.penyandi, { id: p.id, desaId: p.desaId }, [{ field: 'hubunganKeluarga', nilaiLama: p.hubunganKeluarga, nilaiBaru: baru }], pelakuKontrak(k.pelaku), waktuIsoWib(k.sekarang))
    set = { ...tambahan, hubunganKeluarga: baru, diubahPada: k.sekarang }
  }
  if (Object.keys(set).length > 0) await perbaruiPenduduk(k.db, p.id, set)
}

/**
 * Mengganti kepala keluarga dengan salah satu anggota Hidup KK itu. Kepala lama mendapat hubungan yang dipilih, kepala baru
 * berpindah ke urutan pertama. KK dikunci sampai transaksi selesai.
 */
export async function gantiKepala(k: KonteksTulis, id: string, mentah: unknown): Promise<DetailKeluarga> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const kk = await kunciKeluarga(k.db, id, dusunSaja)
  if (!kk) throw new GalatApp('NOT_FOUND', PESAN_KELUARGA_TIDAK_ADA, 404)
  const isian = gantiKepalaSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const { kepalaBaruId, hubunganKepalaLama } = isian.data
  if (kepalaBaruId === kk.kepalaKeluargaId) throw galatField('kepalaBaruId', 'Penduduk ini sudah menjadi kepala keluarga')
  const anggota = await bacaAnggotaHidup(k.db, kk.id, dusunSaja)
  const baru = anggota.find((p) => p.id === kepalaBaruId)
  if (!baru) throw galatField('kepalaBaruId', 'Pilih salah satu anggota KK ini')
  const lama = anggota.find((p) => p.id === kk.kepalaKeluargaId)

  if (lama) await ubahHubungan(k, lama, hubunganKepalaLama)
  await ubahHubungan(k, baru, 'Kepala Keluarga', { urutanKk: Math.min(...anggota.map((p) => p.urutanKk)) - 1 })
  await setKepalaKeluarga(k.db, kk.id, baru.id)
  await catatAktivitas(k.db, {
    desaId: kk.desaId, dusunId: kk.dusunId, waktu: waktuIsoWib(k.sekarang), jenis: 'keluarga-ganti-kepala',
    ringkasan: `Kepala keluarga diganti · KK ${baru.nama}`, oleh: pelakuKontrak(k.pelaku), rujukan: { jenis: 'keluarga', id: kk.id },
  })
  return detailKeluarga(k, kk.id)
}

/** Anggota yang keluar membentuk KK baru dengan nomor KK baru; KK lama tetap dengan kepalanya dan sisa anggotanya. */
export async function pecahKeluarga(k: KonteksTulis, id: string, mentah: unknown): Promise<DetailKeluarga> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const kk = await kunciKeluarga(k.db, id, dusunSaja)
  if (!kk) throw new GalatApp('NOT_FOUND', PESAN_KELUARGA_TIDAK_ADA, 404)
  const isian = pecahKeluargaSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const m = isian.data
  const keluarIds = [...new Set(m.anggotaIds)]
  const anggota = await bacaAnggotaHidup(k.db, kk.id, dusunSaja)
  const perId = new Map(anggota.map((p) => [p.id, p] as const))
  if (keluarIds.some((a) => !perId.has(a))) throw galatField('anggotaIds', 'Anggota yang dipilih harus anggota KK ini')
  if (keluarIds.includes(kk.kepalaKeluargaId)) throw galatField('anggotaIds', 'Kepala keluarga tidak ikut dipindah. Ganti kepala keluarga lebih dulu bila perlu.')
  if (!wilayahSah(await daftarDusunDesa(k.db), m.dusunId, m.rw, m.rt)) throw galatField('dusunId', 'Wilayah tidak dikenal')
  const kepala = perId.get(m.kepalaBaruId)
  if (!kepala || !keluarIds.includes(kepala.id)) throw galatField('kepalaBaruId', 'Kepala keluarga baru harus salah satu anggota yang keluar')

  const nomor = await nomorKkBaru(k.db, k.desa, k.penyandi, k.sekarang)
  const idBaru = `kk_${randomUUID()}`
  try {
    await sisipKeluarga(k.db, {
      id: idBaru,
      desaId: kk.desaId,
      nomorKkSandi: k.penyandi.sandikan(nomor, ruang.nomorKk(kk.desaId)),
      nomorKkIndeks: k.penyandi.indeks(nomor, ruang.nomorKk(kk.desaId)),
      kepalaKeluargaId: kepala.id,
      dusunId: m.dusunId,
      rw: m.rw,
      rt: m.rt,
      tanggalTerbit: tanggalIsoWib(k.sekarang),
    })
  } catch (e) {
    if (pelanggaranUnik(e, INDEKS_KK)) throw new GalatApp('CONFLICT', 'Nomor KK baru bertabrakan. Ulangi permintaan.', 409)
    throw e
  }
  const urut = [kepala, ...keluarIds.filter((a) => a !== kepala.id).map((a) => perId.get(a) as RekamPenduduk)]
  for (const [i, p] of urut.entries()) {
    const hubungan = p.id === kepala.id ? 'Kepala Keluarga' : (m.hubungan[p.id] ?? p.hubunganKeluarga)
    await ubahHubungan(k, p, hubungan, { keluargaId: idBaru, dusunId: m.dusunId, rw: m.rw, rt: m.rt, urutanKk: i, diubahPada: k.sekarang })
  }
  await catatAktivitas(k.db, {
    desaId: kk.desaId, dusunId: m.dusunId, waktu: waktuIsoWib(k.sekarang), jenis: 'keluarga-pecah',
    ringkasan: `KK dipecah · ${kepala.nama}${urut.length > 1 ? ` (${urut.length} orang)` : ''} membentuk KK baru`,
    oleh: pelakuKontrak(k.pelaku), rujukan: { jenis: 'keluarga', id: idBaru },
  })
  return detailKeluarga(k, idBaru)
}

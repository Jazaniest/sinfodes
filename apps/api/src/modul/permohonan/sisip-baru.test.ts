import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { PESAN_JENIS_TIDAK_TERSEDIA } from './layanan-tulis'
import { sisipkanPermohonanBaru, type PermohonanBaru } from './sisip-baru'

let uji: DbUji
let penyandi: Penyandi
let dusunId: string
let jenis: { id: string; kode: string }
// Tahun 2099 tidak dipakai data semai: nomor urut mulai dari 1 dan tidak bergantung pada data demo.
const SEKARANG = new Date('2099-03-01T10:00:00+07:00')
const WARGA = { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' }

beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  const [p] = await uji.sqlMigrasi`select dusun_id from penduduk where id = ${WARGA.id}`
  dusunId = p.dusun_id as string
  const [j] = await uji.sqlMigrasi`select id, kode from jenis_surat where desa_id = ${ID_SUNGAI_SIALANG} order by id limit 1`
  jenis = { id: j.id as string, kode: j.kode as string }
})
afterAll(async () => {
  await uji?.tutup()
})

const spesifikasi = (ubah: Partial<PermohonanBaru> = {}): PermohonanBaru => ({
  jenis, pemohon: { ...WARGA, dusunId }, subjekId: null, mutasiId: null, isian: { keperluan: 'Beasiswa' }, kanal: 'online', status: 'menunggu', tahap: null,
  lampiran: [], riwayat: ['diajukan'], oleh: WARGA, ringkasanAktivitas: `Permohonan ${jenis.kode} · ${WARGA.nama} (online)`, ...ubah,
})
const sisip = (s: PermohonanBaru) =>
  uji.klien.dalamTransaksi('desa', { desaId: ID_SUNGAI_SIALANG }, (db) => sisipkanPermohonanBaru({ db, penyandi, desaId: ID_SUNGAI_SIALANG, sekarang: SEKARANG }, s))

describe('sisipkanPermohonanBaru: inti pembuatan permohonan untuk loket dan warga (8F3 Ruling 5)', () => {
  it('pengajuan online: kanal online, Menunggu tanpa tahap, isian tersandi, riwayat dan aktivitas atas nama pelaku', async () => {
    const lampiran = [{ id: 'lamp_1', syarat: 'KTP', berkas: 'ktp.jpg', ukuranKb: 120 }]
    const { id, tahun, noUrut } = await sisip(spesifikasi({ lampiran }))
    expect(tahun).toBe(2099)
    expect(noUrut).toBe(1)

    const [p] = await uji.sqlMigrasi`select * from permohonan where id = ${id}`
    expect(p).toMatchObject({
      kanal: 'online', status: 'menunggu', tahap: null, pemohon_id: WARGA.id, subjek_id: null, mutasi_id: null, dusun_id: dusunId, jenis_id: jenis.id, no_urut: 1,
      tahun: 2099, lampiran,
    })
    expect(JSON.parse(penyandi.bukaSandi(p.isian_sandi as string, ruang.permohonanIsian(ID_SUNGAI_SIALANG)))).toEqual({ keperluan: 'Beasiswa' })

    const riwayat = await uji.sqlMigrasi`select kejadian, oleh from riwayat_surat where permohonan_id = ${id} order by urutan`
    expect(riwayat).toEqual([{ kejadian: 'diajukan', oleh: WARGA }])
    const aktivitas = await uji.sqlMigrasi`select jenis, ringkasan, oleh_id, oleh_nama, rujukan_jenis, rujukan_id, dusun_id from aktivitas where rujukan_id = ${id}`
    expect(aktivitas).toEqual([
      {
        jenis: 'permohonan-masuk', ringkasan: `Permohonan ${jenis.kode} · Siti Rahmah (online)`, oleh_id: WARGA.id, oleh_nama: WARGA.nama, rujukan_jenis: 'permohonan',
        rujukan_id: id, dusun_id: dusunId,
      },
    ])
  })

  it('kejadian awal lebih dari satu dicatat berurutan; permohonan loket yang langsung diajukan bernomor berikutnya', async () => {
    const { id, noUrut } = await sisip(spesifikasi({ kanal: 'loket', status: 'perlu-ttd', tahap: 'tanda-tangan', riwayat: ['dibuat', 'ajukan-ttd'] }))
    expect(noUrut).toBe(2)
    const [p] = await uji.sqlMigrasi`select kanal, status, tahap from permohonan where id = ${id}`
    expect(p).toEqual({ kanal: 'loket', status: 'perlu-ttd', tahap: 'tanda-tangan' })
    const riwayat = await uji.sqlMigrasi`select kejadian from riwayat_surat where permohonan_id = ${id} order by urutan`
    expect(riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
  })

  it('pengajuan serentak dari dua kanal berbagi satu antrean nomor urut tanpa ganda', async () => {
    const hasil = await Promise.all(Array.from({ length: 10 }, (_, i) => sisip(spesifikasi(i % 2 === 0 ? {} : { kanal: 'loket', riwayat: ['dibuat'], status: 'diproses' }))))
    const nomor = hasil.map((h) => h.noUrut).sort((a, b) => a - b)
    expect(new Set(nomor).size).toBe(10)
    expect(nomor[9] - nomor[0]).toBe(9)
  })

  it('jenis yang lenyap (kunci asing) menjadi galat 409 pada jenisId, bukan 500', async () => {
    const galat = await sisip(spesifikasi({ jenis: { id: 'js_tidak_ada', kode: 'XXX' } })).catch((e) => e)
    expect(galat).toBeInstanceOf(GalatApp)
    expect(galat).toMatchObject({ kode: 'CONFLICT', status: 409, message: PESAN_JENIS_TIDAK_TERSEDIA, fields: { jenisId: PESAN_JENIS_TIDAK_TERSEDIA } })
  })

  it('galat di tengah tidak meninggalkan baris: transaksi dibatalkan', async () => {
    const sebelum = Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan`)[0].n)
    await uji.klien
      .dalamTransaksi('desa', { desaId: ID_SUNGAI_SIALANG }, async (db) => {
        await sisipkanPermohonanBaru({ db, penyandi, desaId: ID_SUNGAI_SIALANG, sekarang: SEKARANG }, spesifikasi())
        throw new Error('gagal setelah sisip')
      })
      .catch(() => {})
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan`)[0].n)).toBe(sebelum)
  })
})

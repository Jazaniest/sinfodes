import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilJumlahPengaduan, ambilPengaduan, balasPengaduan, daftarPengaduan, ubahStatusPengaduan } from '@/api/pengaduan'
import type { StatusPengaduan } from '@/domain/pengaduan/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}
const idPengaduan = (status: StatusPengaduan, dusunId?: string) =>
  ambilDb().pengaduan.find((a) => a.status === status && (dusunId === undefined || a.dusunId === dusunId))?.id ?? '-'

describe('pengaduan (SPEC §8)', () => {
  it('kotak masuk: tab Baru terlama dulu, tab lain terbaru dulu; jumlah per status', async () => {
    masukSebagai(AKUN_UJI.operator)
    const baru = await daftarPengaduan({})
    expect(baru.data.map((a) => a.dusunId)).toEqual(['dsn_ss_3', 'dsn_ss_2'])
    expect(baru.data[0]).not.toHaveProperty('percakapan')
    const selesai = await daftarPengaduan({ status: 'selesai', pageSize: 100 })
    expect(selesai.meta.total).toBe(25)
    const masuk = selesai.data.map((a) => a.masukPada)
    expect(masuk).toEqual([...masuk].sort().reverse())
    expect(await ambilJumlahPengaduan()).toEqual({ status: { baru: 2, ditanggapi: 3, selesai: 25 } })
  })
  it('filter kategori dan dusun', async () => {
    masukSebagai(AKUN_UJI.operator)
    const infra = await daftarPengaduan({ status: 'selesai', kategori: 'Infrastruktur', pageSize: 100 })
    const harapan = ambilDb().pengaduan.filter((a) => a.status === 'selesai' && a.kategori === 'Infrastruktur')
    expect(infra.meta.total).toBe(harapan.length)
    expect(infra.data.every((a) => a.kategori === 'Infrastruktur')).toBe(true)
    expect((await daftarPengaduan({ dusun: 3 })).data.map((a) => a.pelapor.nama)).toEqual(['Zulkifli'])
  })
  it('Kepala Dusun II: hanya dusunnya; pengaduan dusun lain tidak ditemukan dan tidak bisa dibalas (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const jumlah = await ambilJumlahPengaduan()
    expect(jumlah.status.baru).toBe(1)
    const total = jumlah.status.baru + jumlah.status.ditanggapi + jumlah.status.selesai
    expect(total).toBe(ambilDb().pengaduan.filter((a) => a.dusunId === 'dsn_ss_2').length)
    const lain = idPengaduan('baru', 'dsn_ss_3')
    expect((await galatDari(ambilPengaduan(lain))).kode).toBe('NOT_FOUND')
    expect((await galatDari(balasPengaduan(lain, 'Kami cek.'))).kode).toBe('NOT_FOUND')
    expect((await balasPengaduan(idPengaduan('baru', 'dsn_ss_2'), 'Sudah saya lihat, besok diperbaiki.')).status).toBe('ditanggapi')
  })
  it('balasan pertama: Baru → Ditanggapi; tanggapan pertama dan Buku hari ini tercatat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const id = idPengaduan('baru', 'dsn_ss_3')
    const hasil = await balasPengaduan(id, '  Kepala dusun meninjau lokasi besok pagi.  ')
    expect(hasil.status).toBe('ditanggapi')
    expect(hasil.tanggapanPertamaPada?.startsWith('2026-09-24T09:00')).toBe(true)
    expect(hasil.percakapan.at(-1)).toMatchObject({
      jenis: 'desa', isi: 'Kepala dusun meninjau lokasi besok pagi.', oleh: { id: 'pgn_rosmiati' }, jabatan: 'Operator Desa',
    })
    expect(ambilDb().aktivitas.at(-1)).toMatchObject({ jenis: 'pengaduan-dibalas', rujukan: { jenis: 'pengaduan', id } })
    const kedua = await balasPengaduan(id, 'Tambahan: alat berat datang Sabtu.')
    expect(kedua.tanggapanPertamaPada).toBe(hasil.tanggapanPertamaPada)
    expect((await ambilJumlahPengaduan()).status.baru).toBe(1)
  })
  it('balasan kosong ditolak per kolom; pengaduan Selesai baru bisa dibalas setelah dibuka kembali (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const kosong = await galatDari(balasPengaduan(idPengaduan('baru'), '   '))
    expect(kosong.kode).toBe('VALIDATION')
    expect(kosong.fields).toEqual({ isi: 'Balasan wajib diisi' })
    const id = idPengaduan('selesai')
    expect(await galatDari(balasPengaduan(id, 'Halo'))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Pengaduan sudah selesai. Buka kembali untuk membalas.',
    })
    const dibuka = await ubahStatusPengaduan(id, 'ditanggapi')
    expect(dibuka).toMatchObject({ status: 'ditanggapi', selesaiPada: null })
    expect(dibuka.percakapan.at(-1)).toMatchObject({ jenis: 'status', status: 'ditanggapi', oleh: { id: 'pgn_rosmiati' } })
    expect(ambilDb().aktivitas.at(-1)?.jenis).toBe('pengaduan-dibuka')
    expect((await balasPengaduan(id, 'Kami cek ulang ke lokasi.')).status).toBe('ditanggapi')
  })
  it('Baru tidak bisa langsung Selesai; Ditanggapi → Selesai tercatat (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await galatDari(ubahStatusPengaduan(idPengaduan('baru'), 'selesai'))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Balas warga lebih dulu sebelum menandai selesai.',
    })
    const id = idPengaduan('ditanggapi')
    const hasil = await ubahStatusPengaduan(id, 'selesai')
    expect(hasil.status).toBe('selesai')
    expect(hasil.selesaiPada).not.toBeNull()
    expect(ambilDb().aktivitas.at(-1)?.jenis).toBe('pengaduan-selesai')
    expect((await galatDari(ubahStatusPengaduan(id, 'selesai'))).message).toBe('Pengaduan sudah berstatus Selesai.')
  })
  it('Kades melihat tetapi tidak bisa menanggapi; Kaur Keuangan tidak berhak membuka (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await daftarPengaduan({})).meta.total).toBe(2)
    expect((await galatDari(balasPengaduan(idPengaduan('baru'), 'Halo'))).kode).toBe('FORBIDDEN')
    expect((await galatDari(ubahStatusPengaduan(idPengaduan('ditanggapi'), 'selesai'))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarPengaduan({}))).kode).toBe('FORBIDDEN')
  })
})

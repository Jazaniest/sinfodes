// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilPengaduanWarga, balasPengaduanWarga, daftarPengaduanWarga, kirimPengaduanWarga } from '@/api/warga'
import type { KirimPengaduanWarga } from '@/domain/warga/pengaduan'
import { ambilDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const foto = (nama: string) => new File([new Uint8Array(300 * 1024)], nama, { type: 'image/jpeg' })
const aduanLampu = (ubah: Partial<KirimPengaduanWarga> = {}): KirimPengaduanWarga => ({
  kunci: 'kunci-uji-aduan-0001',
  kategori: 'Infrastruktur',
  cerita: 'Lampu jalan di depan surau mati sejak Senin. Malam hari gelap sekali.',
  lokasi: 'Depan surau RT 004',
  ...ubah,
})
const pengaduanMilik = (pendudukId: string) => {
  const a = ambilDb().pengaduan.find((p) => p.pelapor.pendudukId === pendudukId)
  if (!a) throw new Error(`Pengaduan ${pendudukId} tidak ada di seed`)
  return a
}

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('Pengaduan dari layanan warga (SPEC §10)', () => {
  it('daftar hanya berisi pengaduan milik warga, terbaru dulu', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const { data } = await daftarPengaduanWarga()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((a) => a.pelapor.pendudukId === 'pdk_zulkifli')).toBe(true)
    expect(data.map((a) => a.masukPada)).toEqual([...data.map((a) => a.masukPada)].sort().reverse())
  })
  it('kirim → Baru di kotak masuk admin; nomor ADU; judul dari cerita; foto; petugas mendapat notifikasi', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const hasil = await kirimPengaduanWarga(aduanLampu(), foto('lampu.jpg'))
    expect(hasil.nomor).toMatch(/^ADU-2026-\d{3}$/)
    const a = ambilDb().pengaduan.find((x) => x.id === hasil.id)
    expect(a).toMatchObject({
      status: 'baru', judul: 'Lampu jalan di depan surau mati sejak Senin', kategori: 'Infrastruktur', lokasi: 'Depan surau RT 004',
      pelapor: { pendudukId: 'pdk_siti_rahmah', nama: 'Siti Rahmah' }, dusunId: 'dsn_ss_1',
    })
    expect(a?.percakapan).toEqual([expect.objectContaining({ jenis: 'warga', foto: { berkas: 'lampu.jpg', ukuranKb: 300 } })])
    // Kalimatnya sama dengan notifikasi pengaduan bawaan.
    expect(ambilDb().notifikasi.find((n) => n.penggunaId === 'pgn_rosmiati' && n.jenis === 'pengaduan-baru' && n.rujukan?.id === hasil.id)).toMatchObject({
      judul: 'Pengaduan baru: Lampu jalan di depan surau mati sejak Senin', isi: 'Infrastruktur · dari Siti Rahmah',
    })
  })
  it('Kirim ulang dengan kunci sama tidak membuat pengaduan ganda (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const jumlahAwal = ambilDb().pengaduan.length
    const pertama = await kirimPengaduanWarga(aduanLampu({ lokasi: null }), null)
    const ulang = await kirimPengaduanWarga(aduanLampu({ lokasi: null }), null)
    expect(ulang).toEqual(pertama)
    expect(ambilDb().pengaduan.length).toBe(jumlahAwal + 1)
  })
  it('pengaduan orang lain dijawab sama dengan yang tidak ada (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const lain = await galatDari(ambilPengaduanWarga(pengaduanMilik('pdk_zulkifli').id))
    const tidakAda = await galatDari(ambilPengaduanWarga('adu_tidak_ada'))
    expect(lain).toMatchObject({ kode: 'NOT_FOUND', status: 404 })
    expect(lain.message).toBe(tidakAda.message)
  })
  it('balasan warga masuk percakapan; pengaduan yang sudah Selesai tidak bisa dibalas', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const milikZul = pengaduanMilik('pdk_zulkifli')
    const sesudah = await balasPengaduanWarga(milikZul.id, 'Lubangnya makin besar sesudah hujan semalam.')
    expect(sesudah.percakapan.at(-1)).toMatchObject({ jenis: 'warga', isi: 'Lubangnya makin besar sesudah hujan semalam.' })
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const milikSiti = pengaduanMilik('pdk_siti_rahmah')
    expect(milikSiti.status).toBe('selesai')
    expect(await galatDari(balasPengaduanWarga(milikSiti.id, 'Paritnya tersumbat lagi.'))).toMatchObject({
      kode: 'CONFLICT', message: 'Pengaduan ini sudah selesai. Bila masalahnya muncul lagi, sampaikan pengaduan baru.',
    })
  })
})

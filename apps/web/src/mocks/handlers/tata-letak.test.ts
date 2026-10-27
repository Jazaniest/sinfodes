import { describe, expect, it } from 'vitest'
import { panggilApi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { ambilTataLetak, simpanTataLetak } from '@/api/tata-letak'
import { ambilPengaturanDesa, daftarPenggunaDesa, simpanIdentitas, ubahPengguna } from '@/api/pengaturan'
import { ambilJenisSurat, ambilPermohonan, jalankanAksi, ubahJenisSurat } from '@/api/surat'
import { ambilRiwayatWarga } from '@/api/warga'
import { formDariIdentitas, isianIdentitas } from '@/domain/pengaturan/identitas'
import { pengaturanBawaan } from '@/domain/surat/pengaturan-bawaan'
import { tataLetakSuratSchema, type TataLetakSurat } from '@/domain/surat/tata-letak'
import { salinTataLetak, TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { ambilDb } from '@/mocks/db'
import { VERSI_DATA } from '@/mocks/tipe-db'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

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

const PASSPHRASE = { passphrase: 'sialang2026' }
const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const rataTengahArimo = (): TataLetakSurat => {
  const t = salinTataLetak(TATA_LETAK_SIAP['rata-tengah'])
  t.huruf.keluarga = 'Arimo'
  t.siap = null
  return t
}
const sungaiSialang = () => ambilDb().pengaturanSurat.find((p) => p.desaId === 'desa_sungai_sialang')
const tandatangani = async (id: string) => {
  masukSebagai(AKUN_UJI.kades)
  return (await jalankanAksi(id, 'tandatangani', PASSPHRASE)).permohonan.terbit
}
const cari = <T,>(syarat: (p: ReturnType<typeof ambilDb>['permohonan'][number]) => boolean, ambil: (p: ReturnType<typeof ambilDb>['permohonan'][number]) => T) => {
  const p = ambilDb().permohonan.find(syarat)
  if (!p) throw new Error('Permohonan uji tidak ada di data demo')
  return ambil(p)
}
const idMenungguTtd = (jenisId: string) => cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && p.jenisId === jenisId, (p) => p.id)
const idTerbitLama = () => cari((p) => p.desaId === 'desa_sungai_sialang' && p.terbit !== null && p.status === 'selesai', (p) => p.id)

describe('data demo tata letak (SPEC-V0.2 12.2)', () => {
  it('semua surat terbit membawa tata letak standar bersama kop tanpa lambang; jenis tanpa pengecualian; versi data naik', () => {
    const db = ambilDb()
    const terbit = db.permohonan.flatMap((p) => (p.terbit ? [p.terbit] : []))
    expect(terbit.length).toBeGreaterThan(100)
    for (const t of terbit) {
      expect(t.tataLetak).toEqual(TATA_LETAK_SIAP.standar)
      expect(t.kop).toEqual({ lambang: null, lambangKabupaten: null })
    }
    expect(db.jenisSurat.every((j) => j.tataLetak === null)).toBe(true)
    expect(db.pengaturanSurat.every((p) => tataLetakSuratSchema.safeParse(p.tataLetak).success)).toBe(true)
    expect(sungaiSialang()?.tataLetak).toEqual(TATA_LETAK_SIAP.standar)
    expect(db.pengguna.every((p) => p.nip === null)).toBe(true)
    expect(db.desa.every((d) => (d.lambangKabupaten ?? null) === null)).toBe(true)
    expect(VERSI_DATA).toBeGreaterThanOrEqual(34)
  })
})

describe('GET dan PUT /surat/tata-letak', () => {
  it('Sekdes menyimpan rata-tengah; GET mengembalikan yang sama dengan penanda siap', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect(await ambilTataLetak()).toEqual(TATA_LETAK_SIAP.standar)
    expect(await simpanTataLetak(TATA_LETAK_SIAP['rata-tengah'])).toEqual(TATA_LETAK_SIAP['rata-tengah'])
    expect(await ambilTataLetak()).toEqual(TATA_LETAK_SIAP['rata-tengah'])
    expect(sungaiSialang()?.tataLetak.siap).toBe('rata-tengah')
  })
  it('Operator boleh; Kades, Kaur Keuangan, dan Kepala Dusun → 403', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await simpanTataLetak(rataTengahArimo())).huruf.keluarga).toBe('Arimo')
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await galatDari(ambilTataLetak())).status).toBe(403)
      expect((await galatDari(simpanTataLetak(TATA_LETAK_SIAP.standar))).status).toBe(403)
    }
    expect(sungaiSialang()?.tataLetak.huruf.keluarga).toBe('Arimo')
  })
  it('Review Focus 4: tanpa qr, qr.posisi "tidak-ada", atau kunci sembunyikanNomor → 422 dan tidak tersimpan', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const tanpaQr: Partial<TataLetakSurat> = salinTataLetak(TATA_LETAK_SIAP.standar)
    delete tanpaQr.qr
    const kirim = (body: unknown) => galatDari(panggilApi('PUT', '/surat/tata-letak', { skema: tataLetakSuratSchema, body }))
    for (const body of [tanpaQr, { ...TATA_LETAK_SIAP.standar, qr: { posisi: 'tidak-ada' } }, { ...TATA_LETAK_SIAP.standar, sembunyikanNomor: true }]) {
      const g = await kirim(body)
      expect(g).toMatchObject({ kode: 'VALIDATION', status: 422 })
    }
    expect(sungaiSialang()?.tataLetak).toEqual(TATA_LETAK_SIAP.standar)
  })
  it('isian salah: pesan persis per kolom', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const t = salinTataLetak(TATA_LETAK_SIAP.standar)
    t.kertas.margin.kiri = 41
    t.kop.baris = ['x'.repeat(81)]
    t.tandaTangan.urutan = ['jabatan', 'nama']
    const g = await galatDari(simpanTataLetak(t))
    expect(g.fields).toEqual({
      'kertas.margin.kiri': 'Margin 10-40 mm.',
      'kop.baris.0': 'Baris kop paling banyak 80 karakter.',
      'tandaTangan.urutan': 'Tempat dan tanggal, jabatan, dan nama wajib ada di blok tanda tangan.',
    })
  })
})

describe('tata letak dibekukan saat terbit (Review Focus 1)', () => {
  it('tanda tangan sesudah PUT rata-tengah membekukan tata letak itu dan lambang yang terpasang', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await simpanTataLetak(TATA_LETAK_SIAP['rata-tengah'])
    const terbit = await tandatangani(idMenungguTtd('js_ss_skd'))
    expect(terbit?.tataLetak.siap).toBe('rata-tengah')
    expect(terbit?.kop).toEqual({ lambang: null, lambangKabupaten: null })
  })
  it('lambang desa dan kabupaten ikut dibekukan; mengganti lambang kemudian tidak mengubah surat lama', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sekarang = await ambilPengaturanDesa()
    const isian = isianIdentitas(formDariIdentitas(sekarang.identitas))
    await simpanIdentitas({ ...isian, lambang: PNG_KECIL, lambangKabupaten: PNG_KECIL })
    const id = idMenungguTtd('js_ss_skd')
    const terbit = await tandatangani(id)
    expect(terbit?.kop).toEqual({ lambang: PNG_KECIL, lambangKabupaten: PNG_KECIL })
    masukSebagai(AKUN_UJI.operator)
    await simpanIdentitas({ ...isian, lambang: null, lambangKabupaten: null })
    masukSebagai(AKUN_UJI.kades)
    expect((await ambilPermohonan(id)).permohonan.terbit?.kop).toEqual({ lambang: PNG_KECIL, lambangKabupaten: PNG_KECIL })
  })
  it('surat yang terbit sebelum tata letak desa diganti tetap standar di ruang kerja dan di layanan warga', async () => {
    const id = idTerbitLama()
    masukSebagai(AKUN_UJI.sekdes)
    await simpanTataLetak(rataTengahArimo())
    const detail = await ambilPermohonan(id)
    expect(detail.permohonan.terbit?.tataLetak).toEqual(TATA_LETAK_SIAP.standar)
    expect(detail.pengaturan.tataLetak.huruf.keluarga).toBe('Arimo')
  })
  it('unduhan warga membawa terbit.tataLetak dan terbit.kop, bukan pengaturan desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    const warga = ambilDb().permohonan.find((p) => p.pemohonId === AKUN_WARGA_UJI.siti && p.jenisId === 'js_ss_skd')
    if (!warga) throw new Error('Permohonan uji tidak ada')
    await jalankanAksi(warga.id, 'ajukan-ttd')
    await simpanTataLetak(TATA_LETAK_SIAP['dua-lambang'])
    await tandatangani(warga.id)
    masukSebagai(AKUN_UJI.sekdes)
    await simpanTataLetak(rataTengahArimo())
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const d = await ambilRiwayatWarga(warga.id)
    expect(d.terbit?.tataLetak.siap).toBe('dua-lambang')
    expect(d.terbit?.kop).toEqual({ lambang: null, lambangKabupaten: null })
    expect(d).not.toHaveProperty('pengaturan')
  })
})

describe('pengecualian per jenis (Review Focus 2)', () => {
  it('jenis dengan tata letak khusus tidak ikut berubah saat desa berganti; jenis lain ikut', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await ubahJenisSurat('js_ss_sktm', { tataLetak: TATA_LETAK_SIAP['dua-lambang'] })
    await simpanTataLetak(TATA_LETAK_SIAP['rata-tengah'])
    expect((await ambilJenisSurat('js_ss_sktm')).jenis.tataLetak?.siap).toBe('dua-lambang')
    expect((await ambilJenisSurat('js_ss_skd')).jenis.tataLetak).toBeNull()
    const skd = idMenungguTtd('js_ss_skd')
    const sktm = cari((p) => p.status === 'perlu-ttd' && p.tahap === 'paraf' && p.jenisId === 'js_ss_sktm', (p) => p.id)
    await jalankanAksi(sktm, 'paraf')
    expect((await tandatangani(skd))?.tataLetak.siap).toBe('rata-tengah')
    expect((await tandatangani(sktm))?.tataLetak.siap).toBe('dua-lambang')
  })
  it('mengembalikan ke "ikuti desa" dengan tataLetak null; isian salah → 422 dan jenis tak berubah', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await ubahJenisSurat('js_ss_sktm', { tataLetak: TATA_LETAK_SIAP['rata-tengah'] })
    expect((await ubahJenisSurat('js_ss_sktm', { tataLetak: null })).jenis.tataLetak).toBeNull()
    const salah = salinTataLetak(TATA_LETAK_SIAP.standar)
    salah.kertas.margin.atas = 5
    const g = await galatDari(ubahJenisSurat('js_ss_sktm', { tataLetak: salah }))
    expect(g).toMatchObject({ status: 422 })
    expect(g.fields).toEqual({ 'tataLetak.kertas.margin.atas': 'Margin 10-40 mm.' })
    expect((await ambilJenisSurat('js_ss_sktm')).jenis.tataLetak).toBeNull()
  })
})

describe('lambang kabupaten dan NIP', () => {
  it('PUT identitas dengan lambang kabupaten gambar tersimpan dan ikut di sesi; bukan gambar → pesan gambar yang sudah ada', async () => {
    masukSebagai(AKUN_UJI.operator)
    const isian = isianIdentitas(formDariIdentitas((await ambilPengaturanDesa()).identitas))
    expect((await simpanIdentitas({ ...isian, lambangKabupaten: PNG_KECIL })).identitas.lambangKabupaten).toBe(PNG_KECIL)
    const g = await galatDari(simpanIdentitas({ ...isian, lambangKabupaten: 'data:text/plain;base64,QUJD' }))
    expect(g.fields).toEqual({ lambangKabupaten: 'Berkas harus gambar PNG, JPG, WebP, atau SVG.' })
    expect((await ambilPengaturanDesa()).identitas.lambangKabupaten).toBe(PNG_KECIL)
  })
  it('NIP 17 digit → 422 persis; 18 digit tersimpan; kosong menghapus; Sekdes boleh mengisi NIP-nya sendiri', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const kades = (await daftarPenggunaDesa()).find((p) => p.peran === 'kades')
    if (!kades) throw new Error('Kades uji tidak ada')
    const g = await galatDari(ubahPengguna(kades.id, { nip: '19820315201001100' }))
    expect(g).toMatchObject({ status: 422, fields: { nip: 'NIP 18 digit angka.' } })
    expect((await ubahPengguna(kades.id, { nip: '198203152010011004' })).nip).toBe('198203152010011004')
    expect((await ubahPengguna(kades.id, { nip: null })).nip).toBeNull()
    expect((await ubahPengguna(AKUN_UJI.sekdes, { nip: '198504102011012002' })).nip).toBe('198504102011012002')
  })
  it('pengaturan bawaan desa baru memakai tata letak standar', () => {
    expect(pengaturanBawaan('desa_x').tataLetak).toEqual(TATA_LETAK_SIAP.standar)
  })
})

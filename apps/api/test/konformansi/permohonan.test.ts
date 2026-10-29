// Kembaran dari apps/web/src/mocks/handlers/{surat,surat-loket,surat-aksi}.test.ts untuk bagian 8F2a: pertanyaan yang sama diajukan
// ke server sungguhan lewat `panggilApi` dan modul `api/surat` web yang sama, dan jawabannya harus sama dengan API tiruan. Butir
// tanda tangan, batal, serah terima, dan kirim WhatsApp menunggu 8F2b. Perbedaan yang sudah diputuskan (rencana 8F2a) ditandai
// `Perbedaan sengaja:` pada butirnya. Butir yang membaca "Buku hari ini" lewat beranda diperiksa lewat SQL karena Beranda baru ada di 8G.
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { AKUN_UJI, SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { panggilApi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import {
  ambilAntrianTtd, ambilJumlahPermohonan, ambilPermohonan, ambilSaranSurat, arsipkanJenisSurat, buatPermohonan, cariPermohonan, daftarJenisSurat,
  daftarPermohonan, daftarSuratPenduduk, jalankanAksi, tambahJenisSurat, ubahPermohonan,
} from '@/api/surat'
import type { BuatPermohonan, Permohonan } from '@/domain/surat/permohonan'
import { masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })
const dunia: DbDemo = bangkitkanDb(SEKARANG_UJI)
const sql = () => api.uji.sqlMigrasi

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const cari = (syarat: (p: Permohonan) => boolean): Permohonan => {
  const p = dunia.permohonan.find(syarat)
  if (!p) throw new Error('Permohonan uji tidak ada di data demo')
  return p
}
const paraf = () => cari((p) => p.status === 'perlu-ttd' && p.tahap === 'paraf')
const ttdDomisili = () => cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && p.jenisId === 'js_ss_skd')
const domisiliSiti = () => cari((p) => p.pemohonId === 'pdk_siti_rahmah')
const skuZulkifli = () => cari((p) => p.pemohonId === 'pdk_zulkifli' && p.status === 'diproses')
const menunggu = (n = 0) => dunia.permohonan.filter((p) => p.status === 'menunggu')[n]
const noUrutTerakhir2026 = async () =>
  Number((await sql()`select coalesce(max(no_urut), 0)::int as n from permohonan where desa_id = 'desa_sungai_sialang' and tahun = 2026`)[0].n)

const SKD: BuatPermohonan = {
  jenisId: 'js_ss_skd', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null,
  isian: { keperluan: 'pembukaan rekening bank' }, ajukan: false,
}

describe('API Layanan Surat: baca (surat.test.ts, SPEC §3.4, §7.4)', () => {
  it('12 jenis surat desa, urut seperti SPEC', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await daftarJenisSurat()).data.map((j) => j.kode)).toEqual(['SKD', 'SKTM', 'SKU', 'SPCK', 'SKL', 'SKM', 'SPP', 'SKP', 'SPN', 'SKBN', 'SKBM', 'SKH'])
  })
  it('tab Menunggu: 7 permohonan, terlama dulu, dengan pemohon dan jenisnya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { data, meta } = await daftarPermohonan({ status: 'menunggu' })
    expect(meta.total).toBe(7)
    const masuk = data.map((b) => b.masukPada)
    expect(masuk).toEqual([...masuk].sort())
    expect(data[0]).toMatchObject({ status: 'menunggu', kanal: 'online', nomor: null, dikembalikan: false })
    expect(data[0].pemohon.nik).toMatch(/^\d{16}$/)
  })
  it('jumlah per status: yang masih terbuka tidak dibatasi periode; angka menu per peran', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const duaMinggu = await ambilJumlahPermohonan(14, null)
    expect(duaMinggu.status).toMatchObject({ menunggu: 7, diproses: 5, 'perlu-ttd': 3 })
    expect(duaMinggu.perluTindakan).toBe(8)
    expect((await ambilJumlahPermohonan(365, null)).status.selesai).toBeGreaterThan(duaMinggu.status.selesai)
    expect((await ambilJumlahPermohonan(14, 'SKTM')).status['perlu-ttd']).toBe(1)
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(9)
    await masukSebagai(AKUN_UJI.kades)
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(2)
  })
  it('tab Selesai dibatasi periode, terbaru dulu, dengan nomor surat', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarPermohonan({ status: 'selesai', periode: 14 })
    expect(data.length).toBeGreaterThan(10)
    expect(data[0].nomor).toMatch(/\/SS\//)
    const tutup = data.map((b) => b.ditutupPada ?? '')
    expect(tutup).toEqual([...tutup].sort().reverse())
  })
  it('filter jenis memakai kode', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarPermohonan({ status: 'perlu-ttd', jenis: 'SKTM' })
    expect(data.map((b) => b.jenis.kode)).toEqual(['SKTM'])
  })
  it('cari nama, NIK, atau nomor surat di semua status; NIK tidak pernah di URL', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const url: string[] = []
    const asli = globalThis.fetch
    vi.stubGlobal('fetch', (masukan: RequestInfo | URL, init?: RequestInit) => {
      url.push(typeof masukan === 'string' ? masukan : masukan instanceof URL ? masukan.href : masukan.url)
      return asli(masukan, init)
    })
    try {
      expect((await cariPermohonan('Siti Rahmah', null)).data).toContainEqual(
        expect.objectContaining({ pemohon: expect.objectContaining({ id: 'pdk_siti_rahmah' }), status: 'diproses' }),
      )
      expect((await cariPermohonan('1405091706848005', null)).data.some((b) => b.jenis.kode === 'SKU' && b.dikembalikan)).toBe(true)
      const nomor = dunia.permohonan.find((p) => p.terbit)?.terbit?.nomor ?? '-'
      expect((await cariPermohonan(nomor, null)).data.map((b) => b.nomor)).toContain(nomor)
      const sku = (await cariPermohonan('Siti Rahmah', 'SKU')).data
      expect(sku.every((b) => b.jenis.kode === 'SKU' && b.pemohon.id !== 'pdk_siti_rahmah')).toBe(true)
    } finally {
      vi.stubGlobal('fetch', asli)
    }
    expect(url.some((u) => /\d{16}/.test(u))).toBe(false)
  })
  it('detail: permohonan beserta jenis, pemohon, pengaturan surat, dan nama pejabat', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const d = await ambilPermohonan(domisiliSiti().id)
    expect(d.jenis.kode).toBe('SKD')
    expect(d.pemohon.nama).toBe('Siti Rahmah')
    expect(d.subjek).toBeNull()
    expect(d.pengaturan).toMatchObject({ tataLetak: { kertas: { ukuran: 'A4' }, huruf: { keluarga: 'Tinos' } }, modeTandaTangan: 'tte' })
    expect(d.pejabat).toEqual({ kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra', nipKades: null })
  })
  it('detail surat kelahiran membawa subjek (bayi) dan mutasinya', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const skl = cari((p) => p.jenisId === 'js_ss_skl')
    const d = await ambilPermohonan(skl.id)
    expect(d.subjek?.id).toBe(skl.subjekId)
    expect(d.mutasi?.jenis).toBe('lahir')
  })
  it('detail surat selesai: surat terbit beku sama dengan data demo', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const p = cari((x) => x.status === 'selesai' && x.terbit !== null)
    expect((await ambilPermohonan(p.id)).permohonan).toEqual(p)
  })
  it('Kepala Dusun hanya melihat permohonan dari dusunnya; Kaur Keuangan tidak berhak (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    const { data } = await daftarPermohonan({ status: 'selesai', periode: 365, pageSize: 100 })
    expect(data.length).toBeGreaterThan(0)
    for (const b of data) expect(dunia.permohonan.find((p) => p.id === b.id)?.dusunId).toBe('dsn_ss_2')
    const luar = cari((p) => p.dusunId !== 'dsn_ss_2')
    expect((await galatDari(ambilPermohonan(luar.id))).kode).toBe('NOT_FOUND')
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(0)
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarPermohonan({ status: 'menunggu' }))).kode).toBe('FORBIDDEN')
    expect((await galatDari(daftarJenisSurat())).kode).toBe('FORBIDDEN')
  })
  it('filter rusak → VALIDATION', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const janji = panggilApi('GET', '/permohonan', { skema: z.unknown(), query: { status: 'arsip' } })
    expect((await galatDari(janji)).kode).toBe('VALIDATION')
  })
})

describe('surat dari loket (surat-loket.test.ts, SPEC §7.4 layar 2)', () => {
  it('Simpan draf: permohonan loket Diproses, nomor urut berikutnya, tercatat di Buku hari ini', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sebelum = await noUrutTerakhir2026()
    const { permohonan: p } = await buatPermohonan({ ...SKD, isian: { keperluan: 'pembukaan rekening bank', asing: 'x' } })
    expect(p).toMatchObject({ kanal: 'loket', status: 'diproses', tahap: null, noUrut: sebelum + 1, lampiran: [], isian: { keperluan: 'pembukaan rekening bank' } })
    expect(p.isian).not.toHaveProperty('asing')
    expect(p.riwayat.map((r) => r.kejadian)).toEqual(['dibuat'])
    const [akt] = await sql()`select jenis, ringkasan, rujukan_jenis, rujukan_id from aktivitas where rujukan_id = ${p.id}`
    expect(akt).toMatchObject({ jenis: 'permohonan-masuk', ringkasan: 'Permohonan SKD · Siti Rahmah (loket)', rujukan_jenis: 'permohonan', rujukan_id: p.id })
  })
  it('Ajukan tanda tangan: isian diperiksa; SKTM masuk ke tahap paraf', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sktm = { ...SKD, jenisId: 'js_ss_sktm', ajukan: true }
    const galat = await galatDari(buatPermohonan({ ...sktm, isian: {} }))
    expect(galat.fields).toMatchObject({ 'isian.keperluan': 'Keperluan wajib diisi', 'isian.instansiTujuan': 'Instansi tujuan wajib diisi' })
    const { permohonan: p } = await buatPermohonan({ ...sktm, isian: { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti' } })
    expect(p).toMatchObject({ status: 'perlu-ttd', tahap: 'paraf' })
    expect(p.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
  })
  it('pemohon Meninggal ditolak; surat kematian butuh orang yang sudah dicatat meninggal (fokus review 1)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const almarhum = dunia.penduduk.find((p) => p.statusDasar === 'Meninggal' && p.desaId === 'desa_sungai_sialang')
    const galatPemohon = await galatDari(buatPermohonan({ ...SKD, pemohonId: almarhum?.id ?? '-' }))
    expect(galatPemohon.fields.pemohonId).toMatch(/berstatus Meninggal/)
    const skm = { ...SKD, jenisId: 'js_ss_skm', subjekId: 'pdk_syahrial' }
    expect((await galatDari(buatPermohonan(skm))).fields).toEqual({ subjekId: 'Syahrial belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.' })
  })
  it('Kades, Kepala Dusun, dan Kaur Keuangan tidak boleh membuat surat (fokus review 5)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus, AKUN_UJI.kaurKeuangan]) {
      await masukSebagai(akun)
      expect((await galatDari(buatPermohonan(SKD))).kode).toBe('FORBIDDEN')
    }
  })
  it('dua permintaan bersamaan → dua permohonan dengan nomor urut berurutan (fokus review 4)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const sebelum = await noUrutTerakhir2026()
    const hasil = await Promise.all([buatPermohonan(SKD), buatPermohonan(SKD)])
    expect(hasil.map((d) => d.permohonan.noUrut).sort((a, b) => a - b)).toEqual([sebelum + 1, sebelum + 2])
  })
  it('jenis yang diarsipkan menolak permohonan baru dari loket, sementara permohonan yang sudah berjalan tetap bisa diproses', async () => {
    await masukSebagai(AKUN_UJI.operator)
    // Jenis bawaan tidak bisa diarsipkan, jadi pakai salinan buatan desa: dinyalakan lewat SQL (jenis baru selalu mati), dipakai, lalu diarsipkan.
    const salinan = await tambahJenisSurat({ dari: 'js_ss_skd', kode: 'SKX', nama: 'Salinan Domisili' })
    await sql()`update jenis_surat set aktif = true where id = ${salinan.id}`
    const berjalan = await buatPermohonan({ ...SKD, jenisId: salinan.id })
    await arsipkanJenisSurat(salinan.id)
    expect(await galatDari(buatPermohonan({ ...SKD, jenisId: salinan.id }))).toMatchObject({ kode: 'CONFLICT', fields: { jenisId: 'Jenis surat ini tidak tersedia.' } })
    expect((await jalankanAksi(berjalan.permohonan.id, 'ajukan-ttd')).permohonan.status).toBe('perlu-ttd')
  })
})

describe('tumpukan tanda tangan (surat-loket.test.ts, SPEC §7.4 layar 4, fokus review 3)', () => {
  it('Kades: semua surat di tahap tanda tangan, terlama dulu, lengkap dengan detailnya', async () => {
    await masukSebagai(AKUN_UJI.kades)
    const daftar = await ambilAntrianTtd()
    expect(daftar).toHaveLength(2)
    expect(daftar.every((d) => d.permohonan.status === 'perlu-ttd' && d.permohonan.tahap === 'tanda-tangan')).toBe(true)
    const masuk = daftar.map((d) => d.permohonan.masukPada)
    expect(masuk).toEqual([...masuk].sort())
    expect(daftar[0].pengaturan.tataLetak.kertas.ukuran).toBe('A4')
  })
  it('Sekdes hanya melihat jenis yang boleh ditandatangani a.n.; Operator tidak berhak', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilAntrianTtd()).every((d) => d.jenis.bolehAtasNama)).toBe(true)
    await masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ambilAntrianTtd())).kode).toBe('FORBIDDEN')
  })
})

describe('saran isian dari mutasi (surat-loket.test.ts, SPEC §6.6)', () => {
  it('kelahiran bulan ini: mutasinya, pelapor, dan orang tua sebagai pemohon', async () => {
    const lahir = dunia.mutasi.find((m) => m.jenis === 'lahir' && m.tanggal.startsWith('2026-09'))
    if (lahir?.jenis !== 'lahir') throw new Error('Mutasi lahir bulan ini tidak ada')
    await masukSebagai(AKUN_UJI.operator)
    const saran = await ambilSaranSurat('SKL', null, lahir.pendudukIds[0])
    expect(saran.mutasi?.id).toBe(lahir.id)
    expect(saran.isian).toEqual({ pelapor: lahir.rincian.pelapor })
    expect([lahir.rincian.ayahId, lahir.rincian.ibuId]).toContain(saran.pemohonId)
  })
  it('tanpa mutasi yang cocok → saran kosong, tetap dengan pengaturan surat dan nama pejabat', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const saran = await ambilSaranSurat('SKD', 'pdk_siti_rahmah', null)
    expect(saran).toMatchObject({ mutasi: null, pemohonId: null, isian: {}, pengaturan: { tataLetak: { kertas: { ukuran: 'A4' } } } })
    expect(saran.pejabat).toEqual({ kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra', nipKades: null })
  })
})

describe('surat per penduduk dan jenis surat (surat-loket.test.ts)', () => {
  it('Siti Rahmah: Domisilinya; bayi: surat kelahirannya (sebagai yang diterangkan)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await daftarSuratPenduduk('pdk_siti_rahmah')).data.map((b) => b.jenis.kode)).toEqual(['SKD'])
    const skl = cari((p) => p.jenisId === 'js_ss_skl')
    expect((await daftarSuratPenduduk(skl.subjekId ?? '-')).data.map((b) => b.id)).toContain(skl.id)
  })
  it('Kepala Dusun hanya melihat surat dari dusunnya (fokus review 5)', async () => {
    await masukSebagai(AKUN_UJI.kadus)
    expect((await daftarSuratPenduduk('pdk_siti_rahmah')).data).toEqual([])
  })
  it('jenis surat membawa jumlah pemakaian 12 bulan; Domisili paling sering', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarJenisSurat()
    const terbanyak = [...data].sort((a, b) => b.jumlahPakai - a.jumlahPakai)[0]
    expect(terbanyak.kode).toBe('SKD')
    expect(terbanyak.dipakai).toBe(true)
  })
})

describe('alur status surat (surat-aksi.test.ts, SPEC §7.1, §7.2)', () => {
  it('peran tanpa hak → FORBIDDEN (fokus review 1)', async () => {
    const idParaf = paraf().id
    const idMenunggu = menunggu().id
    await masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(jalankanAksi(idParaf, 'paraf'))).kode).toBe('FORBIDDEN')
    await masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(idMenunggu, 'proses'))).kode).toBe('FORBIDDEN')
    await masukSebagai(AKUN_UJI.sekdes)
    expect((await jalankanAksi(idParaf, 'paraf')).permohonan.tahap).toBe('tanda-tangan')
    await masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(jalankanAksi(idMenunggu, 'proses'))).kode).toBe('FORBIDDEN')
    await masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(ubahPermohonan(idMenunggu, { catatanInternal: 'x' }))).kode).toBe('FORBIDDEN')
  })
  it('ajukan tanda tangan: isian diperiksa per field; kunci asing dibuang (fokus review 3)', async () => {
    const id = domisiliSiti().id
    await masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(jalankanAksi(id, 'ajukan-ttd', { isian: { keperluan: '  ' } }))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields).toEqual({ 'isian.keperluan': 'Keperluan wajib diisi' })
    expect((await ambilPermohonan(id)).permohonan.status).toBe('diproses')
    const { permohonan: p } = await jalankanAksi(id, 'ajukan-ttd', { isian: { keperluan: 'pendaftaran sekolah anak', asing: 'x' } })
    expect(p).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan', isian: { keperluan: 'pendaftaran sekolah anak' } })
    expect(p.isian).not.toHaveProperty('asing')
  })
  it('surat yang dikembalikan diajukan ulang: tanda dikembalikan hilang', async () => {
    const z = skuZulkifli()
    await masukSebagai(AKUN_UJI.operator)
    const { permohonan: p } = await jalankanAksi(z.id, 'ajukan-ttd', { isian: { ...z.isian, alamatUsaha: 'RT 012/RW 005, Dusun III Teluk Rengas' } })
    expect(p.status).toBe('perlu-ttd')
    expect(p.dikembalikan).toBeNull()
  })
  it('Kembalikan butuh catatan; surat kembali Diproses dengan tanda dikembalikan', async () => {
    const id = ttdDomisili().id
    await masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(id, 'kembalikan', { catatan: '' }))).fields).toEqual({ catatan: 'Catatan wajib diisi' })
    const { permohonan: p } = await jalankanAksi(id, 'kembalikan', { catatan: 'Keperluan kurang jelas.' })
    expect(p).toMatchObject({ status: 'diproses', tahap: null, dikembalikan: { catatan: 'Keperluan kurang jelas.', oleh: { nama: 'H. Muhammad Nasir' } } })
  })
  it('Proses lalu Tolak dengan alasan; Tolak lagi → CONFLICT', async () => {
    const id = menunggu().id
    await masukSebagai(AKUN_UJI.operator)
    expect((await jalankanAksi(id, 'proses')).permohonan.status).toBe('diproses')
    expect((await galatDari(jalankanAksi(id, 'tolak', {}))).kode).toBe('VALIDATION')
    const { permohonan: p } = await jalankanAksi(id, 'tolak', { alasan: 'Foto KTP tidak terbaca.' })
    expect(p).toMatchObject({ status: 'ditolak', penolakan: { catatan: 'Foto KTP tidak terbaca.', oleh: { nama: 'Rosmiati' } } })
    expect(p.ditutupPada).not.toBeNull()
    expect((await galatDari(jalankanAksi(id, 'tolak', { alasan: 'lagi' }))).kode).toBe('CONFLICT')
  })
  it('PATCH: isian hanya saat Diproses; kunci asing dibuang; catatan internal kapan saja', async () => {
    await masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ubahPermohonan(menunggu().id, { isian: { keperluan: 'x' } }))).kode).toBe('CONFLICT')
    const { permohonan: p } = await ubahPermohonan(domisiliSiti().id, { isian: { keperluan: 'pembukaan rekening bank', nik: '1' } })
    expect(p.isian).toEqual({ keperluan: 'pembukaan rekening bank' })
    expect(p.riwayat.at(-1)).toMatchObject({ kejadian: 'disimpan', oleh: { nama: 'Rosmiati' } })
    const tanpaUbah = await ubahPermohonan(domisiliSiti().id, { isian: { keperluan: 'pembukaan rekening bank' } })
    expect(tanpaUbah.permohonan.riwayat).toHaveLength(p.riwayat.length)
    const catatan = await ubahPermohonan(menunggu().id, { catatanInternal: '  Sudah ditelepon  ' })
    expect(catatan.permohonan.catatanInternal).toBe('Sudah ditelepon')
    expect((await ubahPermohonan(menunggu().id, { catatanInternal: '' })).permohonan.catatanInternal).toBeNull()
  })
  it('aksi tidak dikenal → NOT_FOUND', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const janji = panggilApi('POST', `/permohonan/${menunggu().id}/hapus`, { skema: z.unknown(), body: {} })
    expect((await galatDari(janji)).kode).toBe('NOT_FOUND')
  })
  it('ubah teks jenis tidak mengubah lembar surat yang sudah terbit', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const p = cari((x) => x.status === 'selesai' && x.jenisId === 'js_ss_skd')
    const sebelum = (await ambilPermohonan(p.id)).permohonan.terbit
    await panggilApi('PATCH', '/jenis-surat/js_ss_skd', { skema: z.unknown(), body: { teks: 'Teks surat yang sama sekali baru untuk jenis ini.' } })
    expect((await ambilPermohonan(p.id)).permohonan.terbit).toEqual(sebelum)
    expect(sebelum?.lembar).toEqual(p.terbit?.lembar)
  })
})

describe('Perbedaan sengaja pada permohonan (rencana 8F2a)', () => {
  it('Perbedaan sengaja: catatan yang memuat 16 angka berurutan ditolak (tiruan lama menerimanya)', async () => {
    await masukSebagai(AKUN_UJI.operator)
    const id = menunggu().id
    expect(await galatDari(ubahPermohonan(id, { catatanInternal: 'NIK 1405095203918002' }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { catatanInternal: 'Jangan menulis NIK atau nomor 16 angka di catatan.' },
    })
    expect((await galatDari(jalankanAksi(id, 'tolak', { alasan: 'NIK 1405095203918002 tidak cocok' }))).fields).toEqual({ alasan: 'Jangan menulis NIK atau nomor 16 angka di catatan.' })
    await masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(ttdDomisili().id, 'kembalikan', { catatan: '1405095203918002' }))).fields).toEqual({ catatan: 'Jangan menulis NIK atau nomor 16 angka di catatan.' })
  })
  it('Perbedaan sengaja: tanda tangan, batal, tandai diambil, dan kirim WhatsApp belum tersedia (8F2b) dan menjawab 404', async () => {
    await masukSebagai(AKUN_UJI.kades)
    const id = ttdDomisili().id
    for (const aksi of ['tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa'] as const) {
      expect(await galatDari(jalankanAksi(id, aksi, { passphrase: 'sialang2026', alasan: 'x' })), aksi).toMatchObject({
        kode: 'NOT_FOUND',
        message: 'Aksi ini belum tersedia di server nyata.',
      })
    }
    expect((await ambilPermohonan(id)).permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan', terbit: null })
  })
})

describe('menunggu 8F2b', () => {
  it.todo('8F2b: tanda tangan memberi nomor dan kode verifikasi, membekukan lembar, tata letak, dan kop; satu nomor untuk dua tanda tangan bersamaan')
  it.todo('8F2b: batalkan, tandai diambil, dan kirim WhatsApp (nomor tersamar di riwayat)')
  it.todo('8F2b: verifikasi surat publik, termasuk surat dari jenis yang kemudian diarsipkan')
})

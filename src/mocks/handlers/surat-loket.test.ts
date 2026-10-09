import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { GalatApi } from '@/api/galat'
import { ambilAntrianTtd, ambilSaranSurat, buatPermohonan, daftarJenisSurat, daftarSuratPenduduk } from '@/api/surat'
import type { BuatPermohonan } from '@/domain/surat/permohonan'
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

const SKD: BuatPermohonan = {
  jenisId: 'js_ss_skd', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null,
  isian: { keperluan: 'pembukaan rekening bank' }, ajukan: false,
}
const noUrutTerakhir2026 = () => Math.max(...ambilDb().permohonan.filter((p) => p.masukPada.startsWith('2026')).map((p) => p.noUrut))

describe('surat dari loket (SPEC §7.4 layar 2)', () => {
  it('Simpan draf: permohonan loket Diproses, nomor urut berikutnya, tercatat di Buku hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sebelum = noUrutTerakhir2026()
    const { permohonan: p } = await buatPermohonan({ ...SKD, isian: { keperluan: 'pembukaan rekening bank', asing: 'x' } })
    expect(p).toMatchObject({
      kanal: 'loket', status: 'diproses', tahap: null, noUrut: sebelum + 1, lampiran: [], isian: { keperluan: 'pembukaan rekening bank' },
    })
    expect(p.isian).not.toHaveProperty('asing')
    expect(p.riwayat.map((r) => r.kejadian)).toEqual(['dibuat'])
    expect((await ambilBeranda()).bukuHariIni).toContainEqual(
      expect.objectContaining({ jenis: 'permohonan-masuk', ringkasan: 'Permohonan SKD · Siti Rahmah (loket)', rujukan: { jenis: 'permohonan', id: p.id } }),
    )
  })
  it('Ajukan tanda tangan: isian diperiksa; SKTM masuk ke tahap paraf', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sktm = { ...SKD, jenisId: 'js_ss_sktm', ajukan: true }
    const galat = await galatDari(buatPermohonan({ ...sktm, isian: {} }))
    expect(galat.fields).toMatchObject({ 'isian.keperluan': 'Keperluan wajib diisi', 'isian.instansiTujuan': 'Instansi tujuan wajib diisi' })
    const { permohonan: p } = await buatPermohonan({ ...sktm, isian: { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti' } })
    expect(p).toMatchObject({ status: 'perlu-ttd', tahap: 'paraf' })
    expect(p.riwayat.map((r) => r.kejadian)).toEqual(['dibuat', 'ajukan-ttd'])
  })
  it('pemohon Meninggal ditolak; surat kematian butuh orang yang sudah dicatat meninggal (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const almarhum = ambilDb().penduduk.find((p) => p.statusDasar === 'Meninggal' && p.desaId === 'desa_sungai_sialang')
    const galatPemohon = await galatDari(buatPermohonan({ ...SKD, pemohonId: almarhum?.id ?? '-' }))
    expect(galatPemohon.fields.pemohonId).toMatch(/berstatus Meninggal/)
    const skm = { ...SKD, jenisId: 'js_ss_skm', subjekId: 'pdk_syahrial' }
    expect((await galatDari(buatPermohonan(skm))).fields).toEqual({
      subjekId: 'Syahrial belum dicatat meninggal. Catat kematiannya lebih dulu di Mutasi.',
    })
  })
  it('Kades, Kepala Dusun, dan Kaur Keuangan tidak boleh membuat surat (fokus review 5)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus, AKUN_UJI.kaurKeuangan]) {
      masukSebagai(akun)
      expect((await galatDari(buatPermohonan(SKD))).kode).toBe('FORBIDDEN')
    }
  })
  it('dua permintaan bersamaan → dua permohonan dengan nomor urut berurutan (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sebelum = noUrutTerakhir2026()
    const hasil = await Promise.all([buatPermohonan(SKD), buatPermohonan(SKD)])
    expect(hasil.map((d) => d.permohonan.noUrut).sort((a, b) => a - b)).toEqual([sebelum + 1, sebelum + 2])
  })
})

describe('tumpukan tanda tangan (SPEC §7.4 layar 4, fokus review 3)', () => {
  it('Kades: semua surat di tahap tanda tangan, terlama dulu, lengkap dengan detailnya', async () => {
    masukSebagai(AKUN_UJI.kades)
    const daftar = await ambilAntrianTtd()
    expect(daftar).toHaveLength(2)
    expect(daftar.every((d) => d.permohonan.status === 'perlu-ttd' && d.permohonan.tahap === 'tanda-tangan')).toBe(true)
    const masuk = daftar.map((d) => d.permohonan.masukPada)
    expect(masuk).toEqual([...masuk].sort())
    expect(daftar[0].pengaturan.kertas).toBe('A4')
  })
  it('Sekdes hanya melihat jenis yang boleh ditandatangani a.n.; Operator tidak berhak', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilAntrianTtd()).every((d) => d.jenis.bolehAtasNama)).toBe(true)
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ambilAntrianTtd())).kode).toBe('FORBIDDEN')
  })
})

describe('saran isian dari mutasi (SPEC §6.6)', () => {
  it('kelahiran bulan ini: mutasinya, pelapor, dan orang tua sebagai pemohon', async () => {
    const lahir = ambilDb().mutasi.find((m) => m.jenis === 'lahir' && m.tanggal.startsWith('2026-09'))
    if (lahir?.jenis !== 'lahir') throw new Error('Mutasi lahir bulan ini tidak ada')
    masukSebagai(AKUN_UJI.operator)
    const saran = await ambilSaranSurat('SKL', null, lahir.pendudukIds[0])
    expect(saran.mutasi?.id).toBe(lahir.id)
    expect(saran.isian).toEqual({ pelapor: lahir.rincian.pelapor })
    expect([lahir.rincian.ayahId, lahir.rincian.ibuId]).toContain(saran.pemohonId)
  })
  it('tanpa mutasi yang cocok → saran kosong, tetap dengan pengaturan surat dan nama pejabat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const saran = await ambilSaranSurat('SKD', 'pdk_siti_rahmah', null)
    expect(saran).toMatchObject({ mutasi: null, pemohonId: null, isian: {}, pengaturan: { kertas: 'A4' } })
    expect(saran.pejabat).toEqual({ kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra' })
  })
})

describe('surat per penduduk dan jenis surat', () => {
  it('Siti Rahmah: Domisilinya; bayi: surat kelahirannya (sebagai yang diterangkan)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarSuratPenduduk('pdk_siti_rahmah')).data.map((b) => b.jenis.kode)).toEqual(['SKD'])
    const skl = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skl')
    expect((await daftarSuratPenduduk(skl?.subjekId ?? '-')).data.map((b) => b.id)).toContain(skl?.id)
  })
  it('Kepala Dusun hanya melihat surat dari dusunnya (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await daftarSuratPenduduk('pdk_siti_rahmah')).data).toEqual([])
  })
  it('jenis surat membawa jumlah pemakaian 12 bulan; Domisili paling sering', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarJenisSurat()
    const terbanyak = [...data].sort((a, b) => b.jumlahPakai - a.jumlahPakai)[0]
    expect(terbanyak.kode).toBe('SKD')
    expect(data.find((j) => j.kode === 'SKBN')?.jumlahPakai).toBeGreaterThan(0)
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { cari } from '@/api/cari'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('GET /beranda (SPEC §5.3)', () => {
  it('operator: tindakan, buku hari ini berurutan jam, keadaan desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    const b = await ambilBeranda()
    expect(b.tindakan).toEqual([
      { jenis: 'permohonan-menunggu', jumlah: 7, tertuaHariKerja: 2 },
      { jenis: 'pengaduan-belum-dibalas', jumlah: 2 },
      { jenis: 'kelahiran-dilaporkan', jumlah: 1, laporanId: 'lap_kelahiran_rosnani' },
      { jenis: 'laporan-perbaikan', jumlah: 1, pendudukId: 'pdk_syahrial' },
      { jenis: 'surat-dikembalikan', jumlah: 1, permohonanId: expect.stringMatching(/^srt_/), ringkas: 'SKU · Zulkifli' },
      { jenis: 'data-belum-lengkap', jumlah: 12 },
    ])
    expect(b.suratSaya).toBeNull()
    expect(b.pengaduanTerbaru).toBeNull()
    expect(b.posyandu).toBeNull()
    const waktu = b.bukuHariIni?.map((a) => a.waktu) ?? []
    expect(waktu.length).toBeGreaterThanOrEqual(3)
    expect(waktu.every((w) => w.startsWith('2026-09-24'))).toBe(true)
    expect(waktu).toEqual([...waktu].sort())
    expect(b.keadaan).toMatchObject({
      cakupan: 'desa',
      jiwa: 2812,
      kk: 806,
      laki: 1431,
      perempuan: 1381,
      bulanIni: { lahir: 3, meninggal: 1, datang: 2, pindah: 4 },
    })
    expect(b.apbdes?.tahun).toBe(2026)
    expect(b.apbdes?.belanja.anggaran).toBe(1_866_650_000)
    expect(b.pembangunan).toBeNull()
  })
  it('Sekretaris Desa melihat bagian yang sama dengan operator', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const b = await ambilBeranda()
    expect(b.tindakan).not.toBeNull()
    expect(b.bukuHariIni).not.toBeNull()
  })
  it('Kepala Desa: tanpa tindakan dan buku hari ini', async () => {
    masukSebagai(AKUN_UJI.kades)
    const b = await ambilBeranda()
    expect(b.tindakan).toBeNull()
    expect(b.bukuHariIni).toBeNull()
    expect(b.keadaan.jiwa).toBe(2812)
    const masuk = b.pengaduanTerbaru?.map((a) => a.masukPada) ?? []
    expect(masuk).toHaveLength(5)
    expect(masuk).toEqual([...masuk].sort().reverse())
    expect(b.posyandu).toBeNull()
    expect(b.apbdes?.bidang.map((x) => x.kode)).toEqual(['5.1', '5.2', '5.3', '5.4', '5.5'])
    expect(b.pembangunan?.map((k) => k.nama)).toEqual([
      'Semenisasi jalan lingkungan Dusun III', 'Sumur bor air bersih Dusun IV', 'Titian kayu penghubung Dusun II–IV',
    ])
  })
  it('Kepala Dusun II: keadaan dusunnya saja', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const b = await ambilBeranda()
    expect(b.tindakan).toBeNull()
    expect(b.keadaan).toMatchObject({ cakupan: 'dusun', dusunId: 'dsn_ss_2' })
    expect(b.keadaan.jiwa).toBeGreaterThan(0)
    expect(b.keadaan.jiwa).toBeLessThan(2812)
    expect(b.pengaduanTerbaru?.length).toBeGreaterThan(0)
    expect(b.pengaduanTerbaru?.every((a) => a.dusunId === 'dsn_ss_2')).toBe(true)
    expect(b.posyandu).toEqual({ nama: 'Posyandu Mawar', tempat: 'Gedung Posyandu Mawar, Dusun II Sialang Jaya', jadwal: '2026-10-14' })
    expect(b.apbdes).toBeNull()
    expect(b.pembangunan).toBeNull()
  })
  it('tanpa sesi → UNAUTHENTICATED', async () => {
    await expect(ambilBeranda()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
  it('Kaur Keuangan: realisasi APBDes dan progres keuangan kegiatan pembangunan (3B)', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const b = await ambilBeranda()
    expect(b.apbdes?.pendapatan.anggaran).toBe(1_826_650_000)
    expect(b.pembangunan?.find((k) => k.nama === 'Semenisasi jalan lingkungan Dusun III')).toMatchObject({
      anggaran: 245_000_000, realisasi: 151_900_000, progresFisik: 70,
    })
  })
})

describe('POST /cari (SPEC §5.4)', () => {
  it('NIK lengkap → tepat satu penduduk', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await cari('1405095203918002')).penduduk.map((p) => p.nama)).toEqual(['Siti Rahmah'])
  })
  it('nama: paling banyak 5 per jenis, semuanya cocok', async () => {
    masukSebagai(AKUN_UJI.operator)
    const h = await cari('siti')
    expect(h.penduduk.length).toBeGreaterThan(0)
    expect(h.penduduk.length).toBeLessThanOrEqual(5)
    expect(h.penduduk.every((p) => p.nama.toLowerCase().includes('siti'))).toBe(true)
  })
  it('nomor KK → keluarga dan seluruh anggotanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const h = await cari('1405092011238004')
    expect(h.keluarga.map((k) => k.id)).toEqual(['kk_syahrial'])
    expect(h.penduduk).toHaveLength(4)
  })
  it('kata terlalu pendek → kosong', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await cari('s')).toEqual({ penduduk: [], keluarga: [], surat: [] })
  })
  it('Kaur Keuangan tidak berhak melihat penduduk → kosong', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect(await cari('1405095203918002')).toEqual({ penduduk: [], keluarga: [], surat: [] })
  })
  it('Kepala Dusun II tidak menemukan warga dusun lain (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await cari('1405095203918002')).penduduk).toEqual([])
  })
})

describe('butir surat di Beranda (SPEC §5.3)', () => {
  it('Sekdes: perlu paraf; Kades: menunggu tanda tangan; Kepala Dusun: tanpa', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilBeranda()).suratSaya).toEqual({ tahap: 'paraf', jumlah: 1 })
    masukSebagai(AKUN_UJI.kades)
    expect((await ambilBeranda()).suratSaya).toEqual({ tahap: 'tanda-tangan', jumlah: 2 })
    masukSebagai(AKUN_UJI.kadus)
    expect((await ambilBeranda()).suratSaya).toBeNull()
  })
  it('keadaan desa: surat terbit 30 hari terakhir dan rata-rata lama selesainya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { surat } = (await ambilBeranda()).keadaan
    expect(surat.terbit30Hari).toBeGreaterThanOrEqual(45)
    expect(surat.terbit30Hari).toBeLessThanOrEqual(85)
    expect(surat.rataSelesaiHariKerja).toBeLessThanOrEqual(1)
  })
})

describe('POST /cari: surat (SPEC §5.4)', () => {
  it('nomor surat (bergaris miring) → surat itu; nama pemohon → permohonannya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const nomor = ambilDb().permohonan.find((p) => p.terbit)?.terbit?.nomor ?? '-'
    expect((await cari(nomor)).surat.map((s) => s.nomor)).toEqual([nomor])
    expect((await cari('Zulkifli')).surat).toContainEqual(
      expect.objectContaining({ kode: 'SKU', jenisNama: 'Surat Keterangan Usaha', pemohon: 'Zulkifli', status: 'diproses', nomor: null }),
    )
  })
  it('Kepala Dusun hanya mendapat surat dari dusunnya (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const hasil = (await cari('Siti Rahmah')).surat
    const permohonan = (id: string) => ambilDb().permohonan.find((p) => p.id === id)
    expect(hasil.map((s) => permohonan(s.id)?.pemohonId)).not.toContain('pdk_siti_rahmah')
    expect(hasil.every((s) => permohonan(s.id)?.dusunId === 'dsn_ss_2')).toBe(true)
  })
})

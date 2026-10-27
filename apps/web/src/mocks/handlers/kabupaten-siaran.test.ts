// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilDetailSiaran, ambilSasaranSiaran, daftarSiaranKabupaten, kirimSiaran, tarikSiaran } from '@/api/kabupaten'
import type { IsianSiaran } from '@/domain/kabupaten/siaran'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const MB = 1024 * 1024
const pdf = (bait: number, nama = 'undangan.pdf') => new File([new Uint8Array(bait)], nama, { type: 'application/pdf' })
const isian = (ubah: Partial<IsianSiaran> = {}): IsianSiaran => ({
  judul: 'Rapat evaluasi', isi: 'Mohon hadir.\n\nTerima kasih.', tindakLanjut: null, sasaran: { jenis: 'semua' }, ...ubah,
})
const TIDAK_ADA = { kode: 'NOT_FOUND', status: 404 }

describe('siaran di dasbor kabupaten (SPEC-V0.2 §8.4)', () => {
  it('daftar Pelalawan: empat siaran terbaru dulu, sasaran beku 25 desa, siaran ralat ditarik', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    const { data } = await daftarSiaranKabupaten()
    expect(data.map((s) => s.id)).toEqual(['srn_pll_blt', 'srn_pll_ralat', 'srn_pll_rakor', 'srn_pll_libur'])
    const rakor = data.find((s) => s.id === 'srn_pll_rakor')
    expect(rakor).toMatchObject({ jumlahDesa: 25, sasaran: { jenis: 'semua', nama: [] }, dikirimOleh: 'Fajar Ramadhan', tindakLanjut: { tenggat: '2026-09-11' } })
    expect(rakor?.dibaca).toBeGreaterThanOrEqual(rakor?.ditindaklanjuti ?? 0)
    expect(data.find((s) => s.id === 'srn_pll_ralat')?.ditarik).toEqual({ pada: '2026-09-14T14:25:00+07:00', olehNama: 'Fajar Ramadhan' })
    expect(data.find((s) => s.id === 'srn_pll_blt')?.sasaran).toEqual({ jenis: 'kecamatan', nama: ['Kuala Kampar', 'Teluk Meranti'] })
  })
  it('detail rapat: Sungai Sialang ditindaklanjuti dengan catatannya; tanpa kunci nik', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDetailSiaran('srn_pll_rakor')
    expect(d.siaran).toMatchObject({ isi: expect.stringContaining('Dinas PMD'), lampiran: { berkas: 'undangan-rakor-dd-tahap-2.pdf', ukuranKb: 284 } })
    expect(d.desa).toHaveLength(25)
    expect(d.desa.find((x) => x.nama === 'Sungai Sialang')).toEqual({
      id: 'desa_sungai_sialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', status: 'ditindaklanjuti',
      dibacaPada: '2026-09-04T13:10:00+07:00', tindakLanjut: { pada: '2026-09-05T09:30:00+07:00', catatan: 'Sekretaris Desa dan Kaur Keuangan akan hadir.' },
    })
    const urutan = d.desa.map((x) => `${x.kecamatan}|${x.nama}`)
    expect(urutan).toEqual([...urutan].sort((a, b) => a.localeCompare(b, 'id')))
    expect(JSON.stringify(d)).not.toContain('"nik"')
  })
  it('sasaran tersedia: 25 desa Aktif dan Uji coba tanpa Tanjung Lamo; Peninjau ditolak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const { kecamatan } = await ambilSasaranSiaran()
    expect(kecamatan.flatMap((k) => k.desa)).toHaveLength(25)
    expect(kecamatan.flatMap((k) => k.desa.map((d) => d.nama))).not.toContain('Tanjung Lamo')
    expect(kecamatan.find((k) => k.kode === '14.05.09')).toEqual({
      kode: '14.05.09', nama: 'Teluk Meranti',
      desa: [{ id: expect.any(String), nama: 'Kuala Rengas' }, { id: 'desa_sungai_sialang', nama: 'Sungai Sialang' }, { id: expect.any(String), nama: 'Teluk Pauh' }],
    })
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(ambilSasaranSiaran()).rejects.toMatchObject({ status: 403, message: 'Hanya Admin Kabupaten yang mengirim dan menarik siaran.' })
  })
  it('kirim ke Teluk Meranti dengan tindak lanjut hari ini dan lampiran tepat 5 MB; notifikasi untuk Operator, Sekdes, dan Kades', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const baru = await kirimSiaran(
      isian({ sasaran: { jenis: 'kecamatan', kode: ['14.05.09'] }, tindakLanjut: { tenggat: '2026-09-24' } }),
      pdf(5 * MB),
    )
    expect(baru).toMatchObject({ jumlahDesa: 3, dibaca: 0, ditindaklanjuti: 0, sasaran: { jenis: 'kecamatan', nama: ['Teluk Meranti'] }, ditarik: null })
    expect(baru.id).toMatch(/^srn_/)
    const detail = await ambilDetailSiaran(baru.id)
    expect(detail.siaran.lampiran).toEqual({ berkas: 'undangan.pdf', ukuranKb: 5120 })
    expect(detail.desa.every((d) => d.status === 'belum-dibaca')).toBe(true)
    const db = ambilDb()
    const penerima = db.notifikasi.filter((n) => n.rujukan?.jenis === 'siaran' && n.rujukan.id === baru.id)
    expect(penerima.map((n) => n.penggunaId).sort()).toEqual(['pgn_hendri', 'pgn_nasir', 'pgn_rosmiati'])
    expect(penerima[0]).toMatchObject({
      jenis: 'siaran-kabupaten', judul: 'Rapat evaluasi', isi: 'Dari Kabupaten Pelalawan. Perlu tindak lanjut sampai 24 September 2026.',
      dibaca: false, id: `ntf_srn_${baru.id}_${penerima[0].penggunaId}`,
    })
  })
  it('kirim tanpa lampiran dan tanpa tindak lanjut', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const baru = await kirimSiaran(isian(), null)
    expect(baru).toMatchObject({ tindakLanjut: null, ditindaklanjuti: 0, jumlahDesa: 25 })
    expect((await ambilDetailSiaran(baru.id)).siaran.lampiran).toBeNull()
  })
  it('penolakan: lampiran lebih dari 5 MB atau bukan PDF, tenggat kemarin, sasaran kosong, dan Peninjau (fokus review 5)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    await expect(kirimSiaran(isian(), pdf(5 * MB + 1))).rejects.toMatchObject({ status: 422, fields: { lampiran: 'Ukuran lampiran maksimal 5 MB.' } })
    await expect(kirimSiaran(isian(), pdf(1024, 'catatan.docx'))).rejects.toMatchObject({ fields: { lampiran: 'Lampiran harus berkas PDF.' } })
    await expect(kirimSiaran(isian({ tindakLanjut: { tenggat: '2026-09-23' } }), null)).rejects.toMatchObject({
      status: 422, fields: { tenggat: 'Tenggat tidak boleh sebelum hari ini.' },
    })
    await expect(kirimSiaran(isian({ sasaran: { jenis: 'desa', id: [] } }), null)).rejects.toMatchObject({
      fields: { sasaran: 'Pilih paling sedikit satu desa.' },
    })
    await expect(kirimSiaran(isian({ judul: '' }), null)).rejects.toMatchObject({ fields: { judul: 'Judul wajib diisi.' } })
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(kirimSiaran(isian(), null)).rejects.toMatchObject({ status: 403 })
    expect(ambilDb().siaran).toHaveLength(5)
  })
  it('sasaran beku: desa yang menjadi Aktif setelah kirim tidak ikut (fokus review 4)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const baru = await kirimSiaran(isian(), null)
    ubahDb((d) => {
      const tl = d.desa.find((x) => x.id === 'desa_tanjung_lamo')
      if (tl) tl.status = 'Aktif'
    })
    const detail = await ambilDetailSiaran(baru.id)
    expect(detail.siaran.jumlahDesa).toBe(25)
    expect(detail.desa.map((x) => x.nama)).not.toContain('Tanjung Lamo')
  })
  it('tarik: sekali saja; isi tetap terlihat kabupaten', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const ditarik = await tarikSiaran('srn_pll_blt')
    expect(ditarik.ditarik).toEqual({ pada: '2026-09-24T09:00:00+07:00', olehNama: 'Fajar Ramadhan' })
    await expect(tarikSiaran('srn_pll_blt')).rejects.toMatchObject({ status: 409, message: 'Siaran sudah ditarik.' })
    expect((await ambilDetailSiaran('srn_pll_blt')).siaran.isi).toContain('BLT Dana Desa')
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(tarikSiaran('srn_pll_rakor')).rejects.toMatchObject({ status: 403 })
  })
  it('siaran kabupaten lain sama dengan tidak ada (fokus review 2)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await daftarSiaranKabupaten()).data.map((s) => s.id)).toEqual(['srn_siak_rakor'])
    await expect(ambilDetailSiaran('srn_pll_rakor')).rejects.toMatchObject(TIDAK_ADA)
    await expect(tarikSiaran('srn_pll_rakor')).rejects.toMatchObject(TIDAK_ADA)
    await expect(kirimSiaran(isian({ sasaran: { jenis: 'desa', id: ['desa_sungai_sialang'] } }), null)).rejects.toMatchObject({
      status: 422, fields: { sasaran: 'Pilih kecamatan atau desa di kabupaten ini.' },
    })
    await expect(kirimSiaran(isian({ sasaran: { jenis: 'kecamatan', kode: ['14.05.09'] } }), null)).rejects.toMatchObject({
      fields: { sasaran: 'Pilih kecamatan atau desa di kabupaten ini.' },
    })
    expect(ambilDb().siaran.find((s) => s.id === 'srn_pll_rakor')?.ditarik).toBeNull()
  })
})

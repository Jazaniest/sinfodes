import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilDetailSiaran } from '@/api/kabupaten'
import { ambilDetailSiaranDesa, ambilSiaranDesa, tandaiSiaranDibaca, tandaiTindakLanjut } from '@/api/siaran'
import { tokenBantuanUntuk } from '@/mocks/bantuan'
import { ambilDb, ubahDb } from '@/mocks/db'
import {
  AKUN_DESA_BARU_UJI, AKUN_KABUPATEN_UJI, AKUN_UJI, masukKabupatenSebagai, masukSebagai, pakaiApiTiruan,
} from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TIDAK_ADA = { kode: 'NOT_FOUND', status: 404 }
const tarik = (id: string) =>
  ubahDb((d) => {
    const s = d.siaran.find((x) => x.id === id)
    if (s) s.ditarik = { pada: '2026-09-24T08:00:00+07:00', oleh: { id: 'kab_fajar', nama: 'Fajar Ramadhan' } }
  })

describe('siaran kabupaten di panel desa (SPEC-V0.2 §8.4 Di panel desa)', () => {
  it('Operator Sungai Sialang: empat siaran Pelalawan terbaru dulu, BLT belum dibaca, ralat ditarik', async () => {
    masukSebagai(AKUN_UJI.operator)
    const d = await ambilSiaranDesa()
    expect(d.kabupaten).toBe('Pelalawan')
    expect(d.data.map((s) => [s.id, s.status])).toEqual([
      ['srn_pll_blt', 'belum-dibaca'],
      ['srn_pll_ralat', 'belum-dibaca'],
      ['srn_pll_rakor', 'ditindaklanjuti'],
      ['srn_pll_libur', 'dibaca'],
    ])
    expect(d.data[1].ditarik).toEqual({ pada: '2026-09-14T14:25:00+07:00' })
    expect(d.data[0].tindakLanjut).toEqual({ tenggat: '2026-10-05' })
  })
  it('GET detail tanpa efek samping; POST dibaca mencatat pembuka pertama saja (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilDetailSiaranDesa('srn_pll_blt')).status).toBe('belum-dibaca')
    expect((await ambilDetailSiaranDesa('srn_pll_blt')).dibaca).toBeNull()
    const pertama = await tandaiSiaranDibaca('srn_pll_blt')
    expect(pertama).toMatchObject({ status: 'dibaca', dibaca: { pada: '2026-09-24T09:00:00+07:00', olehNama: 'Rosmiati' }, kabupaten: 'Pelalawan' })
    expect(pertama.isi).toContain('BLT Dana Desa')
    masukSebagai(AKUN_UJI.kades)
    expect((await tandaiSiaranDibaca('srn_pll_blt')).dibaca).toEqual(pertama.dibaca)
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    expect((await ambilDetailSiaran('srn_pll_blt')).desa.find((x) => x.id === 'desa_sungai_sialang')?.status).toBe('dibaca')
  })
  it('siaran ditarik: isi dan lampiran tidak dikirim, dan dibaca tidak dicatat', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const d = await ambilDetailSiaranDesa('srn_pll_ralat')
    expect(d).toMatchObject({ isi: null, lampiran: null, ditarik: { pada: '2026-09-14T14:25:00+07:00' } })
    await tandaiSiaranDibaca('srn_pll_ralat')
    expect(ambilDb().bacaSiaran.some((b) => b.siaranId === 'srn_pll_ralat' && b.desaId === 'desa_sungai_sialang')).toBe(false)
  })
  it('tindak lanjut oleh Kades: catatan dicatat dan dibaca ikut terisi; ulang, tanpa tindak lanjut, dan Operator ditolak', async () => {
    masukSebagai(AKUN_UJI.operator)
    await expect(tandaiTindakLanjut('srn_pll_blt', 'x')).rejects.toMatchObject({
      status: 403, message: 'Hanya Kepala Desa dan Sekretaris Desa yang menandai tindak lanjut.',
    })
    masukSebagai(AKUN_UJI.kades)
    await expect(tandaiTindakLanjut('srn_pll_blt', 'a'.repeat(501))).rejects.toMatchObject({
      status: 422, fields: { catatan: 'Paling banyak 500 karakter.' },
    })
    const d = await tandaiTindakLanjut('srn_pll_blt', '  Data 12 KK sudah diperbarui.  ')
    expect(d).toMatchObject({
      status: 'ditindaklanjuti',
      dibaca: { pada: '2026-09-24T09:00:00+07:00', olehNama: 'H. Muhammad Nasir' },
      ditindaklanjuti: { pada: '2026-09-24T09:00:00+07:00', olehNama: 'H. Muhammad Nasir', catatan: 'Data 12 KK sudah diperbarui.' },
    })
    await expect(tandaiTindakLanjut('srn_pll_blt', '')).rejects.toMatchObject({ status: 409, message: 'Siaran sudah ditandai ditindaklanjuti.' })
    await expect(tandaiTindakLanjut('srn_pll_libur', '')).rejects.toMatchObject({ status: 422, message: 'Siaran ini tidak memerlukan tindak lanjut.' })
  })
  it('siaran ditarik saat desa masih membuka: tindak lanjut ditolak 409 (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await ambilDetailSiaranDesa('srn_pll_blt')
    tarik('srn_pll_blt')
    await expect(tandaiTindakLanjut('srn_pll_blt', 'Sudah.')).rejects.toMatchObject({ status: 409, message: 'Siaran sudah ditarik oleh kabupaten.' })
  })
  it('peran tanpa siaran.lihat dan sesi bantuan ditolak', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    await expect(ambilSiaranDesa()).rejects.toMatchObject({ status: 403, message: 'Peran Anda tidak membuka Siaran kabupaten.' })
    ubahDb((d) => {
      d.aksesBantuan.push({
        id: 'akb_uji', desaId: 'desa_sungai_sialang', diberiOlehId: 'pgn_hendri', mulai: '2026-09-24T08:00:00+07:00',
        sampai: '2026-09-25T08:00:00+07:00', sembunyikanDataPribadi: true, dicabut: null,
        sesi: [{ id: 'sb_uji', olehId: 'kns_dina', olehNama: 'Dina', mulai: '2026-09-24T08:30:00+07:00', halaman: [] }],
      })
    })
    aturTokenSesi(tokenBantuanUntuk('sb_uji'))
    await expect(ambilSiaranDesa()).rejects.toMatchObject({ status: 403 })
    await expect(ambilDetailSiaranDesa('srn_pll_blt')).rejects.toMatchObject({ status: 403 })
  })
  it('desa di luar sasaran: Tanjung Lamo (Persiapan) kosong dan 404, juga setelah menjadi Aktif (fokus review 2 dan 4)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilSiaranDesa()).toEqual({ kabupaten: 'Pelalawan', data: [] })
    await expect(ambilDetailSiaranDesa('srn_pll_blt')).rejects.toMatchObject(TIDAK_ADA)
    await expect(tandaiSiaranDibaca('srn_pll_blt')).rejects.toMatchObject(TIDAK_ADA)
    ubahDb((d) => {
      const tl = d.desa.find((x) => x.id === 'desa_tanjung_lamo')
      if (tl) tl.status = 'Aktif'
    })
    expect((await ambilSiaranDesa()).data).toEqual([])
  })
  it('desa Siak hanya menerima siaran Siak; siaran Pelalawan 404', async () => {
    ubahDb((d) => {
      d.pengguna.push({
        id: 'pgn_uji_siak', desaId: 'desa_tualang_permai', nama: 'Uji Siak', jabatan: 'Operator Desa', peran: 'operator', dusunId: null,
        email: 'uji@tualangpermai.desa.id', aktif: true, nip: null,
      })
    })
    masukSebagai('pgn_uji_siak')
    const d = await ambilSiaranDesa()
    expect(d.kabupaten).toBe('Siak')
    expect(d.data.map((s) => s.id)).toEqual(['srn_siak_rakor'])
    await expect(tandaiSiaranDibaca('srn_pll_rakor')).rejects.toMatchObject(TIDAK_ADA)
    masukSebagai('pgn_uji_siak')
    await expect(tandaiTindakLanjut('srn_pll_blt', '')).rejects.toMatchObject({ status: 403 })
  })
})

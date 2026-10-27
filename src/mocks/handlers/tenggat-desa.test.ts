import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { ambilNotifikasi } from '@/api/notifikasi'
import { ambilTenggatDesa, batalkanDikirim, tandaiDikirim } from '@/api/tenggat'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => vi.setSystemTime(SEKARANG_UJI))

const notifTenggat = async () => (await ambilNotifikasi()).data.filter((n) => n.jenis === 'tenggat-laporan')

describe('tenggat laporan di panel desa (SPEC-V0.2 §8.3 butir 4)', () => {
  it('Kaur Keuangan Sungai Sialang melihat tiga tenggat Pelalawan, yang semester I sudah dikirim', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const t = await ambilTenggatDesa()
    expect(t.kabupaten).toBe('Pelalawan')
    expect(t.data.map((x) => x.id)).toEqual(['tgt_pll_dd2', 'tgt_pll_akhir', 'tgt_pll_smt1'])
    expect(t.data.find((x) => x.id === 'tgt_pll_smt1')?.dikirim).toEqual({ tanggal: '2026-07-26', olehNama: 'Nurhayati' })
    expect(t.data.find((x) => x.id === 'tgt_pll_dd2')?.dikirim).toBeNull()
  })
  it('tandai dan batalkan; tanggal besok ditolak; Operator tidak boleh menandai', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilTenggatDesa()).data).toHaveLength(3)
    await expect(tandaiDikirim('tgt_pll_dd2', '2026-09-24')).rejects.toMatchObject({ status: 403 })
    masukSebagai(AKUN_UJI.kaurKeuangan)
    await expect(tandaiDikirim('tgt_pll_dd2', '2026-09-25')).rejects.toMatchObject({
      status: 422, fields: { tanggal: 'Tanggal kirim tidak boleh setelah hari ini.' },
    })
    expect((await tandaiDikirim('tgt_pll_dd2', '2026-09-23')).dikirim).toEqual({ tanggal: '2026-09-23', olehNama: 'Nurhayati' })
    expect(ambilDb().kirimLaporan.filter((k) => k.tenggatId === 'tgt_pll_dd2' && k.desaId === 'desa_sungai_sialang')).toHaveLength(1)
    expect((await batalkanDikirim('tgt_pll_dd2')).dikirim).toBeNull()
  })
  it('desa Siak tidak melihat dan tidak bisa menandai tenggat Pelalawan; desa Persiapan kosong (fokus review 3)', async () => {
    // Desa rekaman tidak punya akun panel; uji menambahkan satu Kaur Keuangan.
    ubahDb((d) => {
      d.pengguna.push({
        id: 'pgn_uji_siak', desaId: 'desa_tualang_permai', nama: 'Uji Siak', jabatan: 'Kaur Keuangan', peran: 'kaur-keuangan',
        dusunId: null, email: 'kaur@tualangpermai.desa.id', aktif: true, nip: null,
      })
    })
    masukSebagai('pgn_uji_siak')
    const siak = await ambilTenggatDesa()
    expect(siak).toMatchObject({ kabupaten: 'Siak' })
    expect(siak.data.map((x) => x.id)).toEqual(['tgt_siak_dd2'])
    await expect(tandaiDikirim('tgt_pll_dd2', '2026-09-24')).rejects.toMatchObject({ status: 404 })
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilTenggatDesa()).toEqual({ kabupaten: null, data: [] })
  })
  it('notifikasi H-14 dan H-7 untuk pemegang keuangan.lapor, tidak berlipat, dan berhenti setelah ditandai (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const pertama = await notifTenggat()
    expect(pertama.map((n) => n.isi)).toEqual([
      'Laporan ke Kabupaten Pelalawan jatuh tempo 7 hari lagi, 30 September 2026.',
      'Laporan ke Kabupaten Pelalawan jatuh tempo 14 hari lagi, 30 September 2026.',
    ])
    expect(pertama[0]).toMatchObject({ judul: 'Tenggat Laporan realisasi Dana Desa tahap II 2026', rujukan: { jenis: 'tenggat-laporan', id: 'tgt_pll_dd2' } })
    expect(await notifTenggat()).toHaveLength(2)
    masukSebagai(AKUN_UJI.operator)
    expect(await notifTenggat()).toHaveLength(0)
    masukSebagai(AKUN_UJI.kades)
    expect(await notifTenggat()).toHaveLength(2)
    masukSebagai(AKUN_UJI.kaurKeuangan)
    await tandaiDikirim('tgt_pll_dd2', '2026-09-24')
    vi.setSystemTime(new Date('2026-09-29T02:00:00Z'))
    expect(await notifTenggat()).toHaveLength(2)
  })
  it('tanpa tanda kirim, ambang H-1 muncul pada 29 September', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    vi.setSystemTime(new Date('2026-09-29T02:00:00Z'))
    expect((await notifTenggat()).map((n) => n.isi)[0]).toBe('Laporan ke Kabupaten Pelalawan jatuh tempo besok, 30 September 2026.')
  })
  it('Beranda: pengingat untuk pemegang keuangan.lihat, hilang setelah ditandai', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilBeranda()).pengingatTenggat).toEqual([
      { id: 'tgt_pll_dd2', nama: 'Laporan realisasi Dana Desa tahap II 2026', tanggal: '2026-09-30', sisaHari: 6, kabupaten: 'Pelalawan' },
    ])
    masukSebagai(AKUN_UJI.kadus)
    expect((await ambilBeranda()).pengingatTenggat).toBeNull()
    masukSebagai(AKUN_UJI.kades)
    await tandaiDikirim('tgt_pll_dd2', '2026-09-24')
    expect((await ambilBeranda()).pengingatTenggat).toEqual([])
  })
})

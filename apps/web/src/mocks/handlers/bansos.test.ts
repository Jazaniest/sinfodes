import { describe, expect, it } from 'vitest'
import { ambilBantuanKeluarga, ambilProgramBansos, daftarPenerimaBansos, daftarProgramBansos } from '@/api/bansos'
import { GalatApi } from '@/api/galat'
import { catatMeninggal, catatPindah } from '@/api/mutasi'
import type { MasukanMeninggal } from '@/domain/mutasi/masukan'
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
const MENINGGAL: MasukanMeninggal = {
  pendudukId: 'pdk_syahrial', tanggal: '2026-09-23', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua',
  yangMenerangkan: 'Tenaga kesehatan', pelapor: 'Siti Rahmah', penggantiKepalaId: 'pdk_siti_rahmah',
}
const TUJUAN = { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti' }
const penerimaSyahrial = () => ambilDb().penerimaBansos.filter((x) => x.keluargaId === 'kk_syahrial')

describe('bantuan sosial (SPEC §8)', () => {
  it('daftar program: jumlah KPM dan yang perlu ditinjau; program tak dikenal NOT_FOUND', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarProgramBansos()
    expect(data.map((p) => [p.singkat, p.jumlahPenerima, p.perluDitinjau])).toEqual([
      ['BLT-DD', 38, 1],
      ['PKH', 64, 0],
      ['Bantuan Pangan', 112, 0],
    ])
    expect((await ambilProgramBansos('bns_ss_pkh')).dikelolaDesa).toBe(false)
    expect((await galatDari(ambilProgramBansos('bns_xx'))).kode).toBe('NOT_FOUND')
  })
  it('penerima: urut dusun; filter dusun dan yang perlu ditinjau', async () => {
    masukSebagai(AKUN_UJI.operator)
    const semua = await daftarPenerimaBansos('bns_ss_blt', { pageSize: 100 })
    expect(semua.meta.total).toBe(38)
    const nomorDusun = semua.data.map((x) => Number(x.dusunId.slice(-1)))
    expect(nomorDusun).toEqual([...nomorDusun].sort((a, b) => a - b))
    const ditinjau = await daftarPenerimaBansos('bns_ss_blt', { tampil: 'perlu-ditinjau' })
    expect(ditinjau.data).toHaveLength(1)
    expect(ditinjau.data[0].perluDitinjau?.alasan).toMatch(/^Penerima meninggal dunia pada /)
    const dusun2 = await daftarPenerimaBansos('bns_ss_pangan', { dusun: 2, pageSize: 100 })
    expect(dusun2.data.length).toBeGreaterThan(0)
    expect(dusun2.data.every((x) => x.dusunId === 'dsn_ss_2')).toBe(true)
  })
  it('Kepala Dusun II hanya melihat penerima dusunnya, termasuk jumlahnya (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const diDusun2 = ambilDb().penerimaBansos.filter((x) => x.programId === 'bns_ss_pangan' && x.dusunId === 'dsn_ss_2').length
    expect((await daftarProgramBansos()).data.find((p) => p.id === 'bns_ss_pangan')?.jumlahPenerima).toBe(diDusun2)
    const penerima = await daftarPenerimaBansos('bns_ss_pangan', { pageSize: 100 })
    expect(penerima.meta.total).toBe(diDusun2)
    expect(penerima.data.every((x) => x.dusunId === 'dsn_ss_2')).toBe(true)
    // Keluarga Siti Rahmah ada di Dusun I.
    expect(await ambilBantuanKeluarga('kk_syahrial')).toEqual([])
  })
  it('bantuan satu keluarga: keluarga Siti Rahmah menerima BLT dan Bantuan Pangan; Kaur Keuangan tidak berhak (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilBantuanKeluarga('kk_syahrial')).map((b) => b.program.singkat)).toEqual(['BLT-DD', 'Bantuan Pangan'])
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarProgramBansos())).kode).toBe('FORBIDDEN')
  })
  it('penerima meninggal → perlu ditinjau di setiap program, tahap yang belum tersalur ditahan (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    await catatMeninggal(MENINGGAL)
    for (const x of penerimaSyahrial()) {
      expect(x.perluDitinjau).toEqual({ alasan: 'Penerima meninggal dunia pada 23 September 2026', sejak: expect.stringMatching(/^2026-09-24T/) })
    }
    expect(penerimaSyahrial().find((x) => x.programId === 'bns_ss_blt')?.penyaluran).toEqual(['tersalur', 'tersalur', 'ditahan', 'ditahan'])
    expect((await daftarProgramBansos()).data[0].perluDitinjau).toBe(2)
  })
  it('anggota yang bukan atas nama penerima meninggal → data bansos tidak berubah (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sebelum = structuredClone(ambilDb().penerimaBansos)
    await catatMeninggal({ ...MENINGGAL, pendudukId: 'pdk_nur_aini', penggantiKepalaId: null })
    expect(ambilDb().penerimaBansos).toEqual(sebelum)
  })
  it('seluruh keluarga pindah keluar → penerima atas nama kepalanya perlu ditinjau', async () => {
    masukSebagai(AKUN_UJI.operator)
    const anggota = ambilDb().keluarga.find((k) => k.id === 'kk_syahrial')?.anggotaIds ?? []
    await catatPindah({ pendudukIds: anggota, tanggal: '2026-09-22', tujuan: TUJUAN, alasan: 'Pendidikan', penggantiKepalaId: null })
    expect(penerimaSyahrial().map((x) => x.perluDitinjau?.alasan)).toEqual([
      'Penerima pindah keluar desa pada 22 September 2026',
      'Penerima pindah keluar desa pada 22 September 2026',
    ])
  })
})

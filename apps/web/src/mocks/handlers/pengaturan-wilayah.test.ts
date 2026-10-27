import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilWilayah, simpanWilayah } from '@/api/pengaturan'
import { ambilSesi } from '@/api/sesi'
import { formDariWilayah, type UbahWilayah, type WilayahDesa } from '@/domain/pengaturan/wilayah'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

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

const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
/** Dua dusun baru Tanjung Lamo. Nomornya sengaja salah; server menomori ulang menurut urutan. */
const SUSUNAN: UbahWilayah = {
  istilah: ISTILAH,
  dusun: [
    {
      id: 'baru-1', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani',
      rw: [{ nomor: '009', ketua: 'Rasyid', rt: [{ nomor: '009', ketua: 'Udin' }, { nomor: '009', ketua: 'Usman' }] }],
    },
    { id: 'baru-2', nama: 'Lamo', kepalaDusun: 'Bahar', rw: [{ nomor: '009', ketua: 'Kasim', rt: [{ nomor: '009', ketua: 'Jalil' }] }] },
  ],
}
/** "dsn_tl_1#1 001(001,002)": ID, nomor dusun, lalu RW beserta RT-nya. */
const ringkas = (w: WilayahDesa) =>
  w.dusun.map((d) => `${d.id}#${d.nomor} ${d.rw.map((rw) => `${rw.nomor}(${rw.rt.map((rt) => rt.nomor).join(',')})`).join(' ')}`)
const dusunTanjungLamo = () => ambilDb().dusun.filter((d) => d.desaId === 'desa_tanjung_lamo')

describe('PUT /pengaturan/wilayah: susunan desa tanpa penduduk (tahap 6C)', () => {
  it('Tanjung Lamo belum punya penduduk: susunan terbuka; dusun, RW, dan RT tersimpan bernomor urut dan ikut di sesi', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilWilayah()).toEqual({ istilah: ISTILAH, dusun: [], susunanTerkunci: false })
    const hasil = await simpanWilayah(SUSUNAN)
    expect(ringkas(hasil)).toEqual(['dsn_tl_1#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(hasil.dusun[0]).toMatchObject({ desaId: 'desa_tanjung_lamo', nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', posyandu: '' })
    expect(hasil.susunanTerkunci).toBe(false)
    expect((await ambilSesi()).dusun.map((d) => d.id)).toEqual(['dsn_tl_1', 'dsn_tl_2'])
  })
  it('dusun lama tetap ber-ID sama; yang dihapus hilang; dusun baru di depan menggeser nomor', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    const [, lamo] = formDariWilayah(await simpanWilayah(SUSUNAN)).dusun
    const hasil = await simpanWilayah({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[0], id: 'baru-3', nama: 'Hilir' }, lamo] })
    expect(ringkas(hasil)).toEqual(['dsn_tl_3#1 001(001,002)', 'dsn_tl_2#2 002(003)'])
    expect(dusunTanjungLamo()).toHaveLength(2)
  })
  it('dusun yang dipakai akun Kepala Dusun tidak bisa dihapus; jabatannya ikut nomor baru (fokus review 3)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    const awal = formDariWilayah(await simpanWilayah(SUSUNAN))
    ubahDb((d) => {
      d.pengguna.push({
        id: 'pgn_kadus_lamo', desaId: 'desa_tanjung_lamo', nama: 'Bahar', jabatan: 'Kepala Dusun II', peran: 'kadus', dusunId: 'dsn_tl_2',
        email: 'bahar@tanjunglamo.desa.id', aktif: true, nip: null,
      })
    })
    expect(await galatDari(simpanWilayah({ ...awal, dusun: [awal.dusun[0]] }))).toMatchObject({
      kode: 'CONFLICT',
      message: 'Dusun II Lamo masih dipakai akun Bahar. Ganti peran akun itu dulu di Pengaturan › Pengguna.',
    })
    expect(dusunTanjungLamo()).toHaveLength(2)
    await simpanWilayah({ ...awal, dusun: [awal.dusun[1]] })
    expect(ambilDb().pengguna.find((p) => p.id === 'pgn_kadus_lamo')?.jabatan).toBe('Kepala Dusun I')
  })
  it('ID dusun desa lain diperlakukan sebagai dusun baru; dusun Sungai Sialang tidak berubah (fokus review 1)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    const sebelum = structuredClone(ambilDb().dusun.find((d) => d.id === 'dsn_ss_1'))
    const hasil = await simpanWilayah({ istilah: ISTILAH, dusun: [{ ...SUSUNAN.dusun[1], id: 'dsn_ss_1', nama: 'Bajakan' }] })
    expect(hasil.dusun.map((d) => d.id)).toEqual(['dsn_tl_1'])
    expect(ambilDb().dusun.find((d) => d.id === 'dsn_ss_1')).toEqual(sebelum)
  })
  it('susunan kosong ditolak per isian; istilah baru tersimpan bersama susunan', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await galatDari(simpanWilayah({ istilah: ISTILAH, dusun: [] }))).toMatchObject({
      kode: 'VALIDATION',
      fields: { dusun: 'Tambahkan minimal satu dusun' },
    })
    expect((await simpanWilayah({ ...SUSUNAN, istilah: { ...ISTILAH, dusun: 'Jorong' } })).istilah.dusun).toBe('Jorong')
  })
  it('desa yang sudah punya penduduk: susunan terkunci, perubahan susunan tetap CONFLICT (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const w = await ambilWilayah()
    expect(w.susunanTerkunci).toBe(true)
    const tambah = formDariWilayah(w)
    tambah.dusun.push({ ...SUSUNAN.dusun[0] })
    expect((await galatDari(simpanWilayah(tambah))).kode).toBe('CONFLICT')
  })
})

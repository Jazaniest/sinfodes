import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKeluarga, daftarKeluarga } from '@/api/keluarga'
import { catatDatang, catatPindah } from '@/api/mutasi'
import { ambilPenduduk, ambilRingkasanPenduduk, daftarPenduduk } from '@/api/penduduk'
import type { AnggotaDatang, MasukanDatang, MasukanPindah } from '@/domain/mutasi/masukan'
import { buatNik } from '@/domain/penduduk/nik'
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

const TUJUAN = { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti' }
const PINDAH: MasukanPindah = { pendudukIds: ['pdk_nur_aini'], tanggal: '2026-09-22', tujuan: TUJUAN, alasan: 'Pendidikan', penggantiKepalaId: null }

function anggota(ubah: Partial<AnggotaDatang>): AnggotaDatang {
  return {
    nik: buatNik({ kodeWilayah: '331001', tanggalLahir: '1988-05-12', jenisKelamin: 'L', nomorUrut: 9871 }),
    nama: 'Sutrisno', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam', kewarganegaraan: 'WNI', tempatLahir: 'Klaten',
    tanggalLahir: '1988-05-12', nomorAktaLahir: null, hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '',
    pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta', statusPerkawinan: 'Kawin Tercatat', ktpEl: 'Sudah rekam',
    telepon: null, catatan: null,
    ...ubah,
  }
}

const DATANG: MasukanDatang = {
  nomorSkpwni: '3310/SKPWNI/2026/0042',
  asal: { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Pandes', alamat: '' },
  tanggal: '2026-09-22',
  keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' },
  statusPenduduk: 'Tetap',
  anggota: [
    anggota({}),
    anggota({
      nik: buatNik({ kodeWilayah: '331001', tanggalLahir: '1990-07-03', jenisKelamin: 'P', nomorUrut: 9872 }),
      nama: 'Suparmi', jenisKelamin: 'P', tanggalLahir: '1990-07-03', hubunganKeluarga: 'Istri', pekerjaan: 'Mengurus Rumah Tangga',
    }),
  ],
}

describe('POST /mutasi/pindah (SPEC §6.6)', () => {
  it('satu anggota pindah: status Pindah, keluar dari KK', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { mutasi } = await catatPindah(PINDAH)
    expect(mutasi).toMatchObject({ jenis: 'pindah', rincian: { tujuan: TUJUAN, alasan: 'Pendidikan' } })
    expect((await ambilPenduduk('pdk_nur_aini')).statusDasar).toBe('Pindah')
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(3)
    expect(ambilDb().aktivitas.at(-1)?.ringkasan).toBe('Pindah keluar dicatat · Nur Aini ke Kota Pekanbaru')
  })
  it('seluruh anggota KK pindah: KK hilang dari daftar dan hitungan, detailnya tetap ada (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const semua = (await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.id)
    await catatPindah({ ...PINDAH, pendudukIds: semua })
    expect((await ambilRingkasanPenduduk()).kk).toBe(805)
    expect((await daftarKeluarga({ pageSize: 100 })).meta.total).toBe(805)
    expect((await ambilKeluarga('kk_syahrial')).anggota).toEqual([])
    expect(ambilDb().aktivitas.at(-1)?.ringkasan).toBe('Pindah keluar dicatat · Syahrial (4 orang) ke Kota Pekanbaru')
  })
  it('kepala keluarga pindah sendiri → pengganti wajib (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: ['pdk_syahrial'] }))
    expect(galat.fields.penggantiKepalaId).toMatch(/Pilih kepala keluarga pengganti/)
  })
  it('penduduk dari KK berbeda tidak bisa pindah bersama', async () => {
    masukSebagai(AKUN_UJI.operator)
    const lain = ambilDb().penduduk.find((p) => p.statusDasar === 'Hidup' && p.keluargaId !== 'kk_syahrial' && p.dusunId === 'dsn_ss_1')
    if (!lain) throw new Error('Data seed harus punya penduduk lain di Dusun I')
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: ['pdk_nur_aini', lain.id] }))
    expect(galat.fields.pendudukIds).toMatch(/KK yang sama/)
  })
  it('orang yang sudah meninggal tidak bisa dicatat pindah (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const almarhum = ambilDb().penduduk.find((p) => p.statusDasar === 'Meninggal' && p.desaId === 'desa_sungai_sialang')
    if (!almarhum) throw new Error('Data seed harus punya mantan penduduk')
    const galat = await galatDari(catatPindah({ ...PINDAH, pendudukIds: [almarhum.id] }))
    expect(galat.fields.pendudukIds).toBe(`${almarhum.nama} sudah berstatus Meninggal`)
  })
})

describe('POST /mutasi/datang (SPEC §6.6)', () => {
  it('KK baru dengan NIK asal; muncul di preset "Pendatang tahun ini"', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { mutasi, penduduk } = await catatDatang(DATANG)
    expect(penduduk.map((p) => p.nik)).toEqual(DATANG.anggota.map((a) => a.nik))
    expect(penduduk.every((p) => p.statusPenduduk === 'Tetap' && p.dusunId === 'dsn_ss_3')).toBe(true)
    if (mutasi.jenis !== 'datang') throw new Error('Jenis mutasi salah')
    const { keluarga } = await ambilKeluarga(mutasi.rincian.keluargaId)
    expect(keluarga.kepalaKeluargaId).toBe(penduduk[0].id)
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
    const pendatang = await daftarPenduduk({ preset: 'pendatang-tahun-ini', pageSize: 100 })
    expect(pendatang.data.map((p) => p.id)).toEqual(expect.arrayContaining(penduduk.map((p) => p.id)))
    expect(ambilDb().aktivitas.at(-1)?.ringkasan).toBe('Kedatangan dicatat · Sutrisno (2 orang)')
  })
  it('NIK yang sudah terdaftar ditolak per anggota (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(catatDatang({ ...DATANG, anggota: [DATANG.anggota[0], anggota({ nik: '1405095203918002', hubunganKeluarga: 'Istri' })] }))
    expect(galat.kode).toBe('CONFLICT')
    expect(galat.fields['anggota.1.nik']).toBe('NIK sudah terdaftar atas nama Siti Rahmah')
  })
  it('KK baru harus punya tepat satu kepala keluarga', async () => {
    masukSebagai(AKUN_UJI.operator)
    const tanpaKepala = DATANG.anggota.map((a) => ({ ...a, hubunganKeluarga: 'Famili Lain' as const }))
    const galat = await galatDari(catatDatang({ ...DATANG, anggota: tanpaKepala }))
    expect(galat.fields.anggota).toBe('KK baru harus punya tepat satu kepala keluarga')
  })
  it('Kepala Dusun ditolak (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(catatDatang(DATANG))).kode).toBe('FORBIDDEN')
    expect((await galatDari(catatPindah(PINDAH))).kode).toBe('FORBIDDEN')
  })
})

import { describe, expect, it } from 'vitest'
import { hasilVerifikasiSchema } from './schema'

const DASAR = {
  jenis: 'Surat Keterangan Tidak Mampu', nomor: '470/581/SS/IX/2026', terbit: '2026-09-24T10:00:00+07:00', nama: 'S*** R*****',
  penandatangan: { jabatan: 'Kepala Desa', nama: 'H. Muhammad Nasir' },
}

describe('skema website publik (SPEC §9, §7.6)', () => {
  it('hasil verifikasi: masa berlaku hanya berlaku, kedaluwarsa, atau dibatalkan', () => {
    expect(hasilVerifikasiSchema.safeParse({ ...DASAR, berlaku: { status: 'berlaku', sampai: '2026-12-24' } }).success).toBe(true)
    expect(hasilVerifikasiSchema.safeParse({ ...DASAR, berlaku: { status: 'kedaluwarsa', sampai: '2026-09-01' } }).success).toBe(true)
    expect(hasilVerifikasiSchema.safeParse({ ...DASAR, berlaku: { status: 'dibatalkan', pada: '2026-10-03T09:00:00+07:00' } }).success).toBe(true)
    expect(hasilVerifikasiSchema.safeParse({ ...DASAR, berlaku: { status: 'dibatalkan', sampai: '2026-12-24' } }).success).toBe(false)
    expect(hasilVerifikasiSchema.safeParse({ ...DASAR, berlaku: { status: 'ditangguhkan', sampai: null } }).success).toBe(false)
  })
  it('hasil verifikasi tidak pernah membawa NIK: field yang tidak dikenal dibuang', () => {
    const h = hasilVerifikasiSchema.parse({ ...DASAR, nik: '1405095203918002', berlaku: { status: 'berlaku', sampai: null } })
    expect(h).not.toHaveProperty('nik')
  })
})

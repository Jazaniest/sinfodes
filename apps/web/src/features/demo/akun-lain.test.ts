import { describe, expect, it } from 'vitest'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { akunLain } from './akun-lain'
import type { AkunDemo } from './PilihPeranDemo'

const AKUN: AkunDemo[] = [{ id: 'pgn_rosmiati', nama: 'Rosmiati', peran: 'operator', email: 'rosmiati@sungaisialang.desa.id' }]

describe('akun di luar pilihan peran (tahap 6D, fokus review 5)', () => {
  it('akun desa lain tampil dengan peran, nama, dan desanya', () => {
    expect(akunLain(AKUN, contohSesiDesaBaru())).toEqual({ id: 'pgn_yusri', label: 'Operator · Yusri · Tanjung Lamo' })
  })
  it('akun yang ada di pilihan, atau belum ada sesi: tidak ada pilihan tambahan', () => {
    expect(akunLain(AKUN, contohSesi('operator'))).toBeNull()
    expect(akunLain(AKUN, undefined)).toBeNull()
  })
})

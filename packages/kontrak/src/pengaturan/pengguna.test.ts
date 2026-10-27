import { describe, expect, it } from 'vitest'
import type { Pengguna, Peran } from '../pengguna/schema'
import { jabatanBawaan, periksaAturanPengguna, ubahPenggunaSchema, undangPenggunaSchema } from './pengguna'

const p = (id: string, peran: Peran, ubah: Partial<Pengguna> = {}): Pengguna => ({
  id, desaId: 'desa_a', nama: `Nama ${id}`, jabatan: 'Jabatan', peran, dusunId: peran === 'kadus' ? 'dsn_2' : null,
  email: `${id}@desa.id`, aktif: true, nip: null, ...ubah,
})
const SEMUA = [p('sekdes', 'sekdes'), p('kades', 'kades'), p('op', 'operator'), p('kadus', 'kadus'), p('lain', 'kades', { desaId: 'desa_b' })]
const [SEKDES, KADES, OPERATOR] = SEMUA

describe('pengguna desa (SPEC §8)', () => {
  it('undangan sah; surel dirapikan menjadi huruf kecil; Kepala Dusun wajib punya dusun', () => {
    expect(undangPenggunaSchema.parse({ nama: 'Wahyu Hidayat', email: ' Wahyu@Desa.ID ', peran: 'operator', dusunId: null })).toEqual({
      nama: 'Wahyu Hidayat', email: 'wahyu@desa.id', peran: 'operator', dusunId: null,
    })
    expect(undangPenggunaSchema.safeParse({ nama: 'Amran', email: 'amran@desa.id', peran: 'kadus', dusunId: null }).error?.issues[0]).toMatchObject({
      path: ['dusunId'], message: 'Pilih dusun untuk Kepala Dusun',
    })
  })
  it('jabatan bawaan dari peran', () => {
    expect(jabatanBawaan('kadus', { nomor: 2 })).toBe('Kepala Dusun II')
    expect(jabatanBawaan('operator', null)).toBe('Operator Desa')
    expect(jabatanBawaan('kaur-keuangan', null)).toBe('Kaur Keuangan')
  })
  it('akun sendiri tidak bisa diganti perannya atau dinonaktifkan (fokus review 2)', () => {
    expect(periksaAturanPengguna(SEMUA, 'sekdes', SEKDES, { ...SEKDES, aktif: false })).toMatchObject({ kode: 'FORBIDDEN' })
    expect(periksaAturanPengguna(SEMUA, 'sekdes', SEKDES, { ...SEKDES, peran: 'operator' })).toMatchObject({ kode: 'FORBIDDEN' })
  })
  it('Kepala Desa dan Sekretaris Desa hanya satu yang aktif per desa; desa lain tidak dihitung (fokus review 2)', () => {
    expect(periksaAturanPengguna(SEMUA, 'sekdes', OPERATOR, { ...OPERATOR, peran: 'kades' })).toEqual({
      kode: 'CONFLICT', field: 'peran', pesan: 'Sudah ada Kepala Desa aktif: Nama kades. Ganti perannya atau nonaktifkan dulu.',
    })
    expect(periksaAturanPengguna(SEMUA, 'sekdes', KADES, { ...KADES, aktif: false })).toBeNull()
    const kadesNonaktif = SEMUA.map((x) => (x.id === 'kades' ? { ...x, aktif: false } : x))
    expect(periksaAturanPengguna(kadesNonaktif, 'sekdes', OPERATOR, { ...OPERATOR, peran: 'kades' })).toBeNull()
    expect(periksaAturanPengguna(kadesNonaktif, 'sekdes', kadesNonaktif[1], { ...kadesNonaktif[1], aktif: true })).toBeNull()
  })
  it('surel unik di semua desa, karena surel dipakai untuk masuk', () => {
    const baru = p('baru', 'operator', { email: 'lain@desa.id' })
    expect(periksaAturanPengguna(SEMUA, 'sekdes', null, baru)).toEqual({ kode: 'CONFLICT', field: 'email', pesan: 'Surel ini sudah dipakai Nama lain.' })
    expect(periksaAturanPengguna(SEMUA, 'sekdes', null, p('baru', 'operator'))).toBeNull()
  })
  it('Kepala Dusun tanpa dusun ditolak', () => {
    expect(periksaAturanPengguna(SEMUA, 'sekdes', OPERATOR, { ...OPERATOR, peran: 'kadus', dusunId: null })).toMatchObject({
      kode: 'VALIDATION', field: 'dusunId',
    })
  })
  it('NIP: 18 digit angka tersimpan, kosong (null) menghapus, 17 digit atau huruf ditolak dengan pesan persis', () => {
    expect(ubahPenggunaSchema.parse({ nip: '198203152010011004' })).toEqual({ nip: '198203152010011004' })
    expect(ubahPenggunaSchema.parse({ nip: null })).toEqual({ nip: null })
    for (const salah of ['19820315201001100', '19820315201001100x', '1982031520100110044']) {
      expect(ubahPenggunaSchema.safeParse({ nip: salah }).error?.issues[0]).toMatchObject({ path: ['nip'], message: 'NIP 18 digit angka.' })
    }
  })
})

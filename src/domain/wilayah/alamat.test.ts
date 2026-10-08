import { describe, expect, it } from 'vitest'
import { DESA_DEMO, DUSUN_DEMO } from '@/mocks/data/desa-demo'
import { alamatLengkap, alamatPendek, kodeWilayahNik, namaDusun, namaDusunPendek } from './alamat'

const istilah = DESA_DEMO[0].istilahWilayah
const letak = { dusunId: 'dsn_ss_1', rw: '002', rt: '004' }

describe('alamat (SPEC §4.5)', () => {
  it('nama dusun memakai angka Romawi', () => {
    expect(namaDusun(DUSUN_DEMO[3], istilah)).toBe('Dusun IV Sungai Lamo')
    expect(namaDusunPendek(DUSUN_DEMO[1], istilah)).toBe('Dusun II')
  })
  it('format KTP', () => expect(alamatLengkap(letak, DUSUN_DEMO, istilah)).toBe('RT 004/RW 002, Dusun I Kampung Tengah'))
  it('format daftar', () => expect(alamatPendek(letak, DUSUN_DEMO, istilah)).toBe('Dusun I · RT 004/RW 002'))
  it('istilah wilayah mengikuti desa', () =>
    expect(alamatPendek(letak, DUSUN_DEMO, { dusun: 'Jorong', rw: 'RW', rt: 'RT' })).toBe('Jorong I · RT 004/RW 002'))
  it('dusun tidak dikenal: cukup RT/RW', () =>
    expect(alamatLengkap({ ...letak, dusunId: 'tidak-ada' }, DUSUN_DEMO, istilah)).toBe('RT 004/RW 002'))
  it('kode wilayah NIK warga asli', () => expect(kodeWilayahNik(DESA_DEMO[0])).toBe('140509'))
})

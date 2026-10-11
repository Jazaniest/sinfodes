import { describe, expect, it } from 'vitest'
import {
  balasanPengaduanSchema, filterPengaduanSchema, formatLama, periksaUbahStatus, teksTanggapanPertama, ubahStatusPengaduanSchema,
} from './schema'

describe('aturan pengaduan (SPEC §8)', () => {
  it('perpindahan status oleh petugas (fokus review 2)', () => {
    expect(periksaUbahStatus('ditanggapi', 'selesai')).toBeNull()
    expect(periksaUbahStatus('selesai', 'ditanggapi')).toBeNull()
    expect(periksaUbahStatus('baru', 'selesai')).toBe('Balas warga lebih dulu sebelum menandai selesai.')
    expect(periksaUbahStatus('baru', 'ditanggapi')).toBe('Status menjadi Ditanggapi setelah balasan pertama dikirim.')
    expect(periksaUbahStatus('selesai', 'selesai')).toBe('Pengaduan sudah berstatus Selesai.')
  })
  it('lama tanggapan: kurang dari 1 jam, jam, lalu hari', () => {
    expect(formatLama('2026-09-24T08:00:00+07:00', '2026-09-24T08:40:00+07:00')).toBe('kurang dari 1 jam')
    expect(formatLama('2026-09-24T08:00:00+07:00', '2026-09-24T13:30:00+07:00')).toBe('5 jam')
    expect(formatLama('2026-09-22T08:00:00+07:00', '2026-09-24T09:00:00+07:00')).toBe('2 hari')
  })
  it('tanggapan pertama: lamanya, atau berapa lama sudah menunggu', () => {
    const sekarang = new Date('2026-09-24T02:00:00Z')
    expect(teksTanggapanPertama({ masukPada: '2026-09-23T20:00:00+07:00', tanggapanPertamaPada: '2026-09-24T07:15:00+07:00' }, sekarang)).toEqual({
      teks: '11 jam',
      menunggu: false,
    })
    expect(teksTanggapanPertama({ masukPada: '2026-09-24T06:00:00+07:00', tanggapanPertamaPada: null }, sekarang)).toEqual({
      teks: 'belum dibalas · 3 jam',
      menunggu: true,
    })
  })
  it('balasan dirapikan; kosong atau hanya spasi ditolak (fokus review 2)', () => {
    expect(balasanPengaduanSchema.parse({ isi: '  Sudah kami cek.  ' })).toEqual({ isi: 'Sudah kami cek.' })
    const kosong = balasanPengaduanSchema.safeParse({ isi: '   ' })
    expect(kosong.success).toBe(false)
    expect(kosong.error?.issues[0]?.message).toBe('Balasan wajib diisi')
    expect(ubahStatusPengaduanSchema.safeParse({ status: 'baru' }).success).toBe(false)
  })
  it('filter: tab Baru bawaan; kategori bersepasi diterima, kategori asing ditolak', () => {
    expect(filterPengaduanSchema.parse({})).toEqual({ status: 'baru', page: 1, pageSize: 25 })
    expect(filterPengaduanSchema.parse({ kategori: 'Bantuan sosial', dusun: '3' })).toMatchObject({ kategori: 'Bantuan sosial', dusun: 3 })
    expect(filterPengaduanSchema.safeParse({ kategori: 'Politik' }).success).toBe(false)
  })
})

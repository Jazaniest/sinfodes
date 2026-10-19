import { describe, expect, it } from 'vitest'
import type { PeranSesi as Peran } from '@/domain/pengguna/schema'
import { angkaPengaduan, MENU_ADMIN, menuAktif, menuBawahUntuk, menuUntuk, type ItemMenu } from './navigasi'

const label = (peran: Peran) => menuUntuk(peran).flatMap((k) => k.item.map((i) => i.label))
const item = (nama: string): ItemMenu => {
  const i = MENU_ADMIN.flatMap((k) => k.item).find((x) => x.label === nama)
  if (!i) throw new Error(`Menu ${nama} tidak ada`)
  return i
}

describe('menu admin (SPEC §5.1, §5.2)', () => {
  it('operator: semua menu yang sudah dibangun, menurut kelompok SPEC §5.2', () =>
    expect(label('operator')).toEqual([
      'Beranda', 'Peringkat', 'Layanan Surat', 'Pengaduan', 'Kependudukan', 'Bantuan Sosial', 'Kesehatan', 'Peta Desa', 'Keuangan', 'Pembangunan',
      'Aset Desa', 'Lembaga Desa', 'Buku Administrasi', 'Website Desa',
    ]))
  it('kelompok mengikuti SPEC: Pelayanan, Data desa, lalu Tata kelola', () =>
    expect(menuUntuk('kades').map((k) => k.judul)).toEqual([null, 'Pelayanan', 'Data desa', 'Tata kelola']))
  it('Kepala Dusun melihat Layanan Surat (dusunnya)', () => expect(label('kadus')).toContain('Layanan Surat'))
  it('Kaur Keuangan: Peta Desa dan Tata kelola; kelompok Pelayanan disembunyikan', () => {
    expect(label('kaur-keuangan')).toEqual(['Beranda', 'Peringkat', 'Peta Desa', 'Keuangan', 'Pembangunan', 'Aset Desa', 'Lembaga Desa', 'Buku Administrasi'])
    expect(menuUntuk('kaur-keuangan').map((k) => k.judul)).toEqual([null, 'Data desa', 'Tata kelola'])
  })
  it('angka menu Layanan Surat memakai kunci "surat"; menu lain tanpa angka', () => {
    expect(item('Layanan Surat').hitungan).toBe('surat')
    expect(item('Kependudukan').hitungan).toBeNull()
  })
  it('menu aktif mengikuti awalan alamat', () => {
    expect(menuAktif(item('Beranda'), '/admin')).toBe(true)
    expect(menuAktif(item('Beranda'), '/admin/')).toBe(true)
    expect(menuAktif(item('Beranda'), '/admin/kependudukan/penduduk')).toBe(false)
    expect(menuAktif(item('Kependudukan'), '/admin/kependudukan/keluarga/kk_syahrial')).toBe(true)
    expect(menuAktif(item('Kependudukan'), '/admin/kependudukan-lain')).toBe(false)
    expect(menuAktif(item('Layanan Surat'), '/admin/surat/srt_abc123')).toBe(true)
    expect(menuAktif(item('Layanan Surat'), '/admin/suratku')).toBe(false)
  })
  it('angka menu Pengaduan: pengaduan Baru, hanya untuk peran yang menanggapi (fokus review 4)', () => {
    expect(item('Pengaduan')).toMatchObject({ href: '/admin/pengaduan', kemampuan: 'pengaduan.lihat', hitungan: 'pengaduan' })
    expect(angkaPengaduan('operator', 2)).toBe(2)
    expect(angkaPengaduan('kadus', 1)).toBe(1)
    expect(angkaPengaduan('kades', 2)).toBeUndefined()
    expect(label('kades')).toContain('Pengaduan')
  })
  it('Kepala Dusun melihat Pengaduan, Bantuan Sosial, dan Kesehatan; Kaur Keuangan tidak (fokus review 4)', () => {
    expect(label('kadus')).toEqual(expect.arrayContaining(['Pengaduan', 'Bantuan Sosial', 'Kesehatan']))
    for (const m of ['Pengaduan', 'Bantuan Sosial', 'Kesehatan']) expect(label('kaur-keuangan')).not.toContain(m)
  })
  it('Kepala Dusun tanpa Keuangan dan Aset; Peta, Pembangunan, dan Lembaga untuk semua peran (fokus review 2)', () => {
    expect(label('kadus')).not.toContain('Keuangan')
    expect(label('kadus')).not.toContain('Aset Desa')
    for (const peran of ['operator', 'sekdes', 'kades', 'kaur-keuangan', 'kadus'] as const) {
      expect(label(peran)).toEqual(expect.arrayContaining(['Peta Desa', 'Pembangunan', 'Lembaga Desa']))
    }
  })
  it('kelompok Publikasi dan menu Pengaturan hanya untuk Operator dan Sekdes; Kepala Dusun tanpa Buku Administrasi (3C, fokus review 1)', () => {
    expect(menuUntuk('operator').map((k) => k.judul)).toEqual([null, 'Pelayanan', 'Data desa', 'Tata kelola', 'Publikasi'])
    expect(label('sekdes')).toEqual(expect.arrayContaining(['Buku Administrasi', 'Website Desa']))
    for (const peran of ['kades', 'kaur-keuangan', 'kadus'] as const) expect(label(peran)).not.toContain('Website Desa')
    expect(label('kadus')).not.toContain('Buku Administrasi')
    const bawah = (peran: Peran) => menuBawahUntuk(peran).map((i) => i.label)
    // Siaran kabupaten (7B-3) untuk Operator, Sekdes, dan Kades, di antara Pengaturan dan Notifikasi.
    expect(bawah('operator')).toEqual(['Pengaturan', 'Siaran kabupaten', 'Notifikasi'])
    expect(bawah('sekdes')).toEqual(['Pengaturan', 'Siaran kabupaten', 'Notifikasi'])
    expect(bawah('kades')).toEqual(['Pengaturan', 'Siaran kabupaten', 'Notifikasi'])
    expect(menuBawahUntuk('operator').find((i) => i.label === 'Siaran kabupaten')?.href).toBe('/admin/siaran')
    for (const peran of ['kaur-keuangan', 'kadus'] as const) expect(bawah(peran)).toEqual(['Notifikasi'])
  })
  it('sesi bantuan Tim Sinfodes: menu lihat saja, tanpa Website Desa dan Pengaturan (SPEC-V0.2 §5.3)', () => {
    expect(label('bantuan')).not.toContain('Website Desa')
    expect(label('bantuan')).toEqual(expect.arrayContaining(['Kependudukan', 'Layanan Surat', 'Keuangan']))
    expect(menuBawahUntuk('bantuan').map((i) => i.label)).toEqual(['Notifikasi'])
  })
  it('Kepala Desa: menu Pengaturan langsung ke Akses Sinfodes; peran lain tetap ke Pengaturan (SPEC-V0.2 §5.3)', () => {
    const pengaturan = (peran: Peran) => menuBawahUntuk(peran).find((i) => i.label === 'Pengaturan')
    expect(pengaturan('kades')?.href).toBe('/admin/pengaturan/akses-sinfodes')
    expect(pengaturan('operator')?.href).toBe('/admin/pengaturan')
    expect(pengaturan('sekdes')?.href).toBe('/admin/pengaturan')
  })
})

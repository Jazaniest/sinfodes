import { describe, expect, it } from 'vitest'
import { bacaTawaranSurat, isiTawaranSurat } from './tawaran-surat'

describe('tawaran surat setelah mutasi (SPEC §6.6)', () => {
  it('?surat= hanya SKL, SKM, atau SPP', () => {
    expect(bacaTawaranSurat({ surat: 'SKM' })).toEqual({ surat: 'SKM' })
    expect(bacaTawaranSurat({ surat: 'SKD' })).toEqual({})
    expect(bacaTawaranSurat({ surat: 1 })).toEqual({})
    expect(bacaTawaranSurat({})).toEqual({})
  })
  it('bayi dan almarhum menjadi yang diterangkan; pengantar pindah atas nama orang yang pindah', () => {
    expect(isiTawaranSurat('SKL', { id: 'pdk_bayi', statusDasar: 'Hidup' })).toEqual({
      judul: 'Kelahiran sudah dicatat',
      tombol: 'Buat Surat Keterangan Kelahiran',
      href: '/admin/surat/baru?jenis=SKL&subjek=pdk_bayi&langkah=2',
    })
    expect(isiTawaranSurat('SKM', { id: 'pdk_alm', statusDasar: 'Meninggal' })?.href).toBe(
      '/admin/surat/baru?jenis=SKM&subjek=pdk_alm&langkah=2',
    )
    expect(isiTawaranSurat('SPP', { id: 'pdk_pindah', statusDasar: 'Pindah' })).toEqual({
      judul: 'Kepindahan sudah dicatat',
      tombol: 'Buat Surat Pengantar Pindah',
      href: '/admin/surat/baru?jenis=SPP&pemohon=pdk_pindah&langkah=2',
    })
  })
  it('tawaran yang tidak cocok dengan status penduduk diabaikan (mis. ?surat=SKM di profil orang yang hidup)', () => {
    expect(isiTawaranSurat('SKM', { id: 'pdk_a', statusDasar: 'Hidup' })).toBeNull()
    expect(isiTawaranSurat('SPP', { id: 'pdk_a', statusDasar: 'Meninggal' })).toBeNull()
    expect(isiTawaranSurat('SKL', { id: 'pdk_a', statusDasar: 'Pindah' })).toBeNull()
  })
})

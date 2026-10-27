import { describe, expect, it } from 'vitest'
import { contohJenis } from '@/test/contoh-surat'
import { bacaCariBuatSurat, CARI_BUAT_BAWAAN, hrefBuatSurat, langkahSah } from './cari-buat'

describe('parameter URL Buat surat (SPEC §7.4 layar 2)', () => {
  it('bawaan langkah 1; parameter rusak atau berisi NIK diabaikan', () => {
    expect(CARI_BUAT_BAWAAN).toEqual({ langkah: 1 })
    expect(bacaCariBuatSurat({ langkah: '9', jenis: 'skd', pemohon: '1405095203918002', subjek: 'pdk_bayi' })).toEqual({
      langkah: 1,
      subjek: 'pdk_bayi',
    })
  })
  it('langkah yang belum lengkap tidak bisa dilompati (fokus review 2)', () => {
    const skd = contohJenis('SKD')
    expect(langkahSah({ langkah: 4 }, null, false)).toBe(1)
    expect(langkahSah({ langkah: 4, jenis: 'SKD' }, skd, false)).toBe(2)
    expect(langkahSah({ langkah: 4, jenis: 'SKD', pemohon: 'pdk_a' }, skd, true)).toBe(4)
    expect(langkahSah({ langkah: 3, jenis: 'SKL', pemohon: 'pdk_a' }, contohJenis('SKL'), true)).toBe(2)
    expect(langkahSah({ langkah: 3, jenis: 'SKL', pemohon: 'pdk_a', subjek: 'pdk_b' }, contohJenis('SKL'), true)).toBe(3)
  })
  it('tautan dari halaman lain', () => {
    expect(hrefBuatSurat({})).toBe('/admin/surat/baru')
    expect(hrefBuatSurat({ pemohon: 'pdk_siti_rahmah' })).toBe('/admin/surat/baru?pemohon=pdk_siti_rahmah')
    expect(hrefBuatSurat({ jenis: 'SKL', subjek: 'pdk_bayi', langkah: 2 })).toBe('/admin/surat/baru?jenis=SKL&subjek=pdk_bayi&langkah=2')
  })
})

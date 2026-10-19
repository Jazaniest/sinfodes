import { describe, expect, it } from 'vitest'
import { hrefNotifikasi, kelompokPerHari, type Notifikasi } from './schema'

const n = (id: string, waktu: string, rujukan: Notifikasi['rujukan'] = null): Notifikasi => ({
  id, desaId: 'desa_sungai_sialang', penggunaId: 'pgn_rosmiati', jenis: 'pengumuman', judul: 'Judul', isi: '', waktu, dibaca: false, rujukan,
})

describe('notifikasi (SPEC §5.5)', () => {
  it('tautan menurut rujukannya', () => {
    expect(hrefNotifikasi(n('a', '2026-09-24T08:00:00+07:00', { jenis: 'permohonan', id: 'srt_x' }))).toBe('/admin/surat/srt_x')
    expect(hrefNotifikasi(n('b', '2026-09-24T08:00:00+07:00', { jenis: 'penduduk', id: 'pdk_x' }))).toBe('/admin/kependudukan/penduduk/pdk_x')
    expect(hrefNotifikasi(n('l', '2026-09-24T08:00:00+07:00', { jenis: 'laporan-kelahiran', id: 'lap_x' }))).toBe(
      '/admin/kependudukan/mutasi/lahir?laporan=lap_x',
    )
    expect(hrefNotifikasi(n('p', '2026-09-24T08:00:00+07:00', { jenis: 'pengaduan', id: 'adu_x' }))).toBe('/admin/pengaduan/adu_x')
    expect(hrefNotifikasi(n('t', '2026-09-24T08:00:00+07:00', { jenis: 'tenggat-laporan', id: 'tgt_x' }))).toBe('/admin/keuangan#laporan-kabupaten')
    expect(hrefNotifikasi(n('c', '2026-09-24T08:00:00+07:00'))).toBeNull()
  })
  it('dikelompokkan per tanggal WIB, urutan masukan dipertahankan', () => {
    const sekarang = new Date('2026-09-24T02:00:00Z')
    const grup = kelompokPerHari(
      [n('a', '2026-09-24T08:30:00+07:00'), n('b', '2026-09-24T07:00:00+07:00'), n('c', '2026-09-23T15:00:00+07:00'), n('d', '2026-09-21T10:00:00+07:00')],
      sekarang,
    )
    expect(grup.map((g) => [g.judul, g.item.map((i) => i.id)])).toEqual([
      ['Hari ini', ['a', 'b']],
      ['Kemarin', ['c']],
      ['Senin, 21 September 2026', ['d']],
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { contohJenis, contohPermohonan } from '@/test/contoh-surat'
import type { Peran } from '../pengguna/schema'
import { aksiTersedia, perluTindakan, statusMengizinkan, tahapAwalTtd } from './alur'
import type { Permohonan } from './permohonan'

const skd = contohJenis('SKD') // boleh a.n. Kepala Desa, tanpa paraf
const sktm = contohJenis('SKTM') // wajib paraf, tidak boleh a.n.
const tersedia = (peran: Peran, ubah: Partial<Permohonan>, jenis = skd) => aksiTersedia(contohPermohonan(ubah), jenis, peran)
const DIAMBIL = { pada: '2026-09-24T10:00:00+07:00', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } }

describe('aksi per status dan peran (SPEC §7.1, §7.4, fokus review 1)', () => {
  it('Menunggu: Operator dan Sekdes memproses atau menolak; Kades, Kaur Keuangan, dan Kadus hanya melihat', () => {
    expect(tersedia('operator', { status: 'menunggu' })).toEqual(['proses', 'tolak'])
    expect(tersedia('sekdes', { status: 'menunggu' })).toEqual(['proses', 'tolak'])
    for (const peran of ['kades', 'kaur-keuangan', 'kadus'] as const) expect(tersedia(peran, { status: 'menunggu' })).toEqual([])
  })
  it('Diproses: tolak atau ajukan tanda tangan', () => expect(tersedia('operator', { status: 'diproses' })).toEqual(['tolak', 'ajukan-ttd']))
  it('Perlu TTD tahap paraf: Sekdes memaraf; Kades hanya bisa mengembalikan', () => {
    expect(tersedia('sekdes', { status: 'perlu-ttd', tahap: 'paraf' }, sktm)).toEqual(['paraf', 'kembalikan'])
    expect(tersedia('kades', { status: 'perlu-ttd', tahap: 'paraf' }, sktm)).toEqual(['kembalikan'])
    expect(tersedia('operator', { status: 'perlu-ttd', tahap: 'paraf' }, sktm)).toEqual([])
  })
  it('Perlu TTD tahap tanda tangan: Kades; Sekdes a.n. hanya bila jenis suratnya mengizinkan', () => {
    expect(tersedia('kades', { status: 'perlu-ttd', tahap: 'tanda-tangan' })).toEqual(['kembalikan', 'tandatangani'])
    expect(tersedia('sekdes', { status: 'perlu-ttd', tahap: 'tanda-tangan' }, skd)).toEqual(['kembalikan', 'tandatangani'])
    expect(tersedia('sekdes', { status: 'perlu-ttd', tahap: 'tanda-tangan' }, sktm)).toEqual(['kembalikan'])
  })
  it('Selesai: petugas mengirim dan menandai diambil; hanya Sekdes dan Kades yang membatalkan', () => {
    expect(tersedia('operator', { status: 'selesai' })).toEqual(['tandai-diambil', 'kirim-wa'])
    expect(tersedia('sekdes', { status: 'selesai' })).toEqual(['batalkan', 'tandai-diambil', 'kirim-wa'])
    expect(tersedia('kades', { status: 'selesai' })).toEqual(['batalkan', 'tandai-diambil', 'kirim-wa'])
    expect(tersedia('kadus', { status: 'selesai' })).toEqual([])
    expect(tersedia('operator', { status: 'selesai', diambil: DIAMBIL })).toEqual(['kirim-wa'])
  })
  it('Ditolak dan Dibatalkan: tidak ada aksi', () => {
    for (const status of ['ditolak', 'dibatalkan'] as const) {
      for (const peran of ['operator', 'sekdes', 'kades'] as const) expect(tersedia(peran, { status })).toEqual([])
    }
  })
  it('aksi lama ditolak setelah status berpindah (fokus review 2)', () => {
    expect(statusMengizinkan('tandatangani', contohPermohonan({ status: 'selesai' }))).toBe(false)
    expect(statusMengizinkan('paraf', contohPermohonan({ status: 'perlu-ttd', tahap: 'tanda-tangan' }))).toBe(false)
    expect(statusMengizinkan('proses', contohPermohonan({ status: 'diproses' }))).toBe(false)
    expect(statusMengizinkan('tandai-diambil', contohPermohonan({ status: 'selesai', diambil: DIAMBIL }))).toBe(false)
  })
  it('tahap pertama setelah diajukan: paraf bila jenis suratnya mewajibkan', () => {
    expect(tahapAwalTtd(sktm)).toBe('paraf')
    expect(tahapAwalTtd(skd)).toBe('tanda-tangan')
  })
})

describe('perluTindakan (angka menu Layanan Surat, SPEC §5.2)', () => {
  const kembali = { oleh: { id: 'pgn_nasir', nama: 'H. Muhammad Nasir' }, pada: '2026-09-23T14:20:00+07:00', catatan: 'Alamat belum lengkap' }
  const daftar = [
    contohPermohonan({ status: 'menunggu' }),
    contohPermohonan({ status: 'menunggu' }),
    contohPermohonan({ status: 'diproses' }),
    contohPermohonan({ status: 'diproses', dikembalikan: kembali }),
    contohPermohonan({ status: 'perlu-ttd', tahap: 'paraf' }),
    contohPermohonan({ status: 'perlu-ttd', tahap: 'tanda-tangan' }),
    contohPermohonan({ status: 'selesai' }),
  ]
  it.each([
    ['operator', 3],
    ['sekdes', 4],
    ['kades', 1],
    ['kadus', 0],
    ['kaur-keuangan', 0],
  ] as const)('%s → %i', (peran, jumlah) => expect(perluTindakan(peran, daftar)).toBe(jumlah))
})

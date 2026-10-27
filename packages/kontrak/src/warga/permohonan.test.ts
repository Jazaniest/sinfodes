import { describe, expect, it } from 'vitest'
import type { EntriRiwayatSurat } from '../surat/permohonan'
import { contohPermohonan } from '../uji/contoh-surat'
import { kalimat, milikWarga, namaJenisLengkap, posisiPermohonan, riwayatUntukWarga, tampilDiBeranda } from './permohonan'

const SEKARANG = new Date('2026-09-24T02:00:00Z')
const dasar = { status: 'diproses', tahap: null, dikembalikan: false, diambil: false, mode: null } as const
const entri = (kejadian: EntriRiwayatSurat['kejadian'], oleh: string, catatan: string | null = null): EntriRiwayatSurat => ({
  id: `rws_${kejadian}`, kejadian, waktu: '2026-09-23T10:12:00+07:00', oleh: { id: oleh, nama: oleh }, catatan,
})

describe('permohonan di layanan warga (SPEC §10)', () => {
  it('posisi permohonan dalam kata sederhana', () => {
    expect(posisiPermohonan({ ...dasar, status: 'menunggu' })).toBe('menunggu diperiksa petugas desa')
    expect(posisiPermohonan(dasar)).toBe('sedang diproses petugas desa')
    expect(posisiPermohonan({ ...dasar, dikembalikan: true })).toBe('sedang diperbaiki petugas desa')
    expect(posisiPermohonan({ ...dasar, status: 'perlu-ttd', tahap: 'paraf' })).toBe('menunggu paraf Sekretaris Desa')
    expect(posisiPermohonan({ ...dasar, status: 'perlu-ttd', tahap: 'tanda-tangan' })).toBe('menunggu tanda tangan Kepala Desa')
    expect(posisiPermohonan({ ...dasar, status: 'selesai', mode: 'tte' })).toBe('selesai, surat bisa diunduh')
    expect(posisiPermohonan({ ...dasar, status: 'selesai', mode: 'basah' })).toBe('selesai, ambil di kantor desa')
    expect(posisiPermohonan({ ...dasar, status: 'selesai', mode: 'basah', diambil: true })).toBe('selesai, sudah diambil')
    expect(posisiPermohonan({ ...dasar, status: 'ditolak' })).toBe('ditolak')
    expect(posisiPermohonan({ ...dasar, status: 'dibatalkan' })).toBe('dibatalkan')
  })
  it('nama jenis surat selalu lengkap; posisi bisa dijadikan kalimat', () => {
    expect(namaJenisLengkap({ nama: 'Surat Keterangan Tidak Mampu', kode: 'SKTM' })).toBe('Surat Keterangan Tidak Mampu (SKTM)')
    expect(kalimat('menunggu tanda tangan Kepala Desa')).toBe('Menunggu tanda tangan Kepala Desa')
  })
  it('milik warga: dia pemohonnya, atau dia yang mengajukan lewat layanan warga (fokus review 3)', () => {
    const online = contohPermohonan()
    expect(milikWarga(online, 'pdk_siti_rahmah')).toBe(true)
    const untukSuami = contohPermohonan({ pemohonId: 'pdk_syahrial' })
    expect(milikWarga(untukSuami, 'pdk_siti_rahmah')).toBe(true)
    expect(milikWarga(untukSuami, 'pdk_syahrial')).toBe(true)
    const loket = contohPermohonan({ pemohonId: 'pdk_zulkifli', kanal: 'loket', riwayat: [entri('dibuat', 'pgn_rosmiati')] })
    expect(milikWarga(loket, 'pdk_zulkifli')).toBe(true)
    expect(milikWarga(loket, 'pdk_siti_rahmah')).toBe(false)
  })
  it('catatan antarpetugas tidak dikirim ke warga; alasan tolak dan batal tetap (fokus review 3)', () => {
    const r = riwayatUntukWarga([
      entri('kembalikan', 'pgn_nasir', 'Alamat usaha belum lengkap.'),
      entri('tolak', 'pgn_rosmiati', 'Pengantar RT belum dilampirkan.'),
      entri('batalkan', 'pgn_nasir', 'Salah ketik nama.'),
    ])
    expect(r.map((e) => e.catatan)).toEqual([null, 'Pengantar RT belum dilampirkan.', 'Salah ketik nama.'])
  })
  it('Beranda: yang masih berjalan, ditambah yang selesai 14 hari terakhir dan belum diambil', () => {
    const p = (status: 'diproses' | 'selesai' | 'ditolak', ditutupPada: string | null, diambil = false) => ({
      status, ditutupPada, diambil: diambil ? { pada: '2026-09-23T10:00:00+07:00', oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } } : null,
    })
    expect(tampilDiBeranda(p('diproses', null), SEKARANG)).toBe(true)
    expect(tampilDiBeranda(p('selesai', '2026-09-15T10:00:00+07:00'), SEKARANG)).toBe(true)
    expect(tampilDiBeranda(p('selesai', '2026-09-05T10:00:00+07:00'), SEKARANG)).toBe(false)
    expect(tampilDiBeranda(p('selesai', '2026-09-23T10:00:00+07:00', true), SEKARANG)).toBe(false)
    expect(tampilDiBeranda(p('ditolak', '2026-09-23T10:00:00+07:00'), SEKARANG)).toBe(false)
  })
})

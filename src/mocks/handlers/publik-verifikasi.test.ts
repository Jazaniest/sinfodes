import { describe, expect, it, vi } from 'vitest'
import { verifikasiSurat } from '@/api/publik'
import { samarkanNama } from '@/domain/publik/verifikasi'
import { ambilDb, ubahDb } from '@/mocks/db'
import { pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

/** Surat Selesai yang masih berlaku pada tanggal uji. */
function suratBerlaku() {
  const p = ambilDb().permohonan.find(
    (x) => x.desaId === 'desa_sungai_sialang' && x.status === 'selesai' && x.terbit !== null && (x.terbit.berlakuSampai ?? '9999') >= '2026-09-24',
  )
  if (!p?.terbit) throw new Error('Data uji tidak punya surat selesai yang masih berlaku')
  return { p, terbit: p.terbit }
}
const KODE_ASING = 'SS-AAAA-BBBB'

describe('verifikasi surat (SPEC §7.6)', () => {
  it('kode asli: jenis, nomor, tanggal terbit, nama disamarkan, penandatangan, dan masa berlaku', async () => {
    const { p, terbit } = suratBerlaku()
    const orang = ambilDb().penduduk.find((x) => x.id === (p.subjekId ?? p.pemohonId))
    const jenis = ambilDb().jenisSurat.find((j) => j.id === p.jenisId)
    const h = await verifikasiSurat('sungai-sialang', terbit.kodeVerifikasi)
    expect(h).toEqual({
      jenis: jenis?.nama,
      nomor: terbit.nomor,
      terbit: terbit.pada,
      nama: samarkanNama(orang?.nama ?? ''),
      penandatangan: { jabatan: terbit.penandatangan.peran === 'kades' ? 'Kepala Desa' : 'Sekretaris Desa', nama: terbit.penandatangan.nama },
      berlaku: { status: 'berlaku', sampai: terbit.berlakuSampai },
    })
    expect(JSON.stringify(h)).not.toContain(orang?.nik ?? 'tanpa-nik')
  })
  it('kode diketik huruf kecil dengan spasi tetap dikenali (fokus review 1)', async () => {
    const { terbit } = suratBerlaku()
    const h = await verifikasiSurat('sungai-sialang', terbit.kodeVerifikasi.toLowerCase().replace(/-/g, ' '))
    expect(h.nomor).toBe(terbit.nomor)
  })
  it('surat kedaluwarsa dan surat yang dibatalkan tetap ditemukan beserta statusnya (fokus review 2)', async () => {
    const { p, terbit } = suratBerlaku()
    const kode = terbit.kodeVerifikasi
    ubahDb((d) => {
      const x = d.permohonan.find((y) => y.id === p.id)
      if (x?.terbit) x.terbit.berlakuSampai = '2026-09-01'
    })
    expect((await verifikasiSurat('sungai-sialang', kode)).berlaku).toEqual({ status: 'kedaluwarsa', sampai: '2026-09-01' })
    ubahDb((d) => {
      const x = d.permohonan.find((y) => y.id === p.id)
      if (x) {
        x.status = 'dibatalkan'
        x.pembatalan = { oleh: { id: 'pgn_hendri', nama: 'Hendri Saputra' }, pada: '2026-09-20T10:00:00+07:00', catatan: 'Data salah' }
      }
    })
    expect((await verifikasiSurat('sungai-sialang', kode)).berlaku).toEqual({ status: 'dibatalkan', pada: '2026-09-20T10:00:00+07:00' })
  })
  it('kode yang tidak ada → pesan SPEC; format salah → VALIDATION tanpa dihitung sebagai percobaan', async () => {
    await expect(verifikasiSurat('sungai-sialang', KODE_ASING)).rejects.toMatchObject({
      kode: 'NOT_FOUND', message: 'Kode tidak ditemukan. Periksa kembali, atau hubungi kantor desa.',
    })
    await expect(verifikasiSurat('sungai-sialang', 'halo')).rejects.toMatchObject({
      kode: 'VALIDATION', fields: { kode: 'Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.' },
    })
    expect(ambilDb().percobaanVerifikasi[0].gagal).toHaveLength(1)
  })
  it('10 kode salah dalam 10 menit → RATE_LIMITED, juga untuk kode asli; terbuka lagi 10 menit kemudian (fokus review 3)', async () => {
    const { terbit } = suratBerlaku()
    for (let i = 0; i < 9; i++) await expect(verifikasiSurat('sungai-sialang', KODE_ASING)).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    await expect(verifikasiSurat('sungai-sialang', KODE_ASING)).rejects.toMatchObject({
      kode: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.',
    })
    await expect(verifikasiSurat('sungai-sialang', terbit.kodeVerifikasi)).rejects.toMatchObject({ kode: 'RATE_LIMITED' })
    vi.setSystemTime(new Date(SEKARANG_UJI.getTime() + 11 * 60_000))
    try {
      expect((await verifikasiSurat('sungai-sialang', terbit.kodeVerifikasi)).nomor).toBe(terbit.nomor)
    } finally {
      vi.setSystemTime(SEKARANG_UJI)
    }
  })
})

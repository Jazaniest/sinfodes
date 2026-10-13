import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ambilDb, ubahDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPublik } from '@/test/render'
import { VerifikasiSurat } from './VerifikasiSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })

/** Surat Selesai yang masih berlaku pada tanggal uji. */
function suratBerlaku() {
  const p = ambilDb().permohonan.find(
    (x) => x.desaId === 'desa_sungai_sialang' && x.status === 'selesai' && x.terbit !== null && (x.terbit.berlakuSampai ?? '9999') >= '2026-09-24',
  )
  if (!p?.terbit) throw new Error('Data uji tidak punya surat selesai yang masih berlaku')
  return p.terbit
}

describe('Cek keaslian surat (SPEC §7.6)', () => {
  it('dibuka dari QR (?kode=): langsung diperiksa; ASLI dengan nomor, nama disamarkan, dan status hijau', async () => {
    const t = suratBerlaku()
    renderPublik(<VerifikasiSurat kode={t.kodeVerifikasi} onPeriksa={() => {}} />)
    const hasil = await screen.findByRole('region', { name: /^Surat ini asli/ })
    expect(hasil).toHaveTextContent('Asli')
    expect(hasil).toHaveTextContent(t.nomor)
    expect(hasil).toHaveTextContent(/\*/)
    expect(within(hasil).getByText(/^Berlaku/)).toHaveClass('text-hijau')
    expect(screen.getByRole('textbox', { name: 'Kode verifikasi' })).toHaveValue(t.kodeVerifikasi)
  })
  it('kode yang diketik dirapikan dulu lalu disimpan di alamat halaman (fokus review 1)', async () => {
    const onPeriksa = vi.fn()
    renderPublik(<VerifikasiSurat kode={null} onPeriksa={onPeriksa} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Kode verifikasi' }), ' ss 7k3m q9td')
    await user.click(screen.getByRole('button', { name: 'Periksa' }))
    expect(onPeriksa).toHaveBeenCalledWith('SS-7K3M-Q9TD')
  })
  it('format yang jelas salah ditandai tanpa bertanya ke server (fokus review 1)', async () => {
    const onPeriksa = vi.fn()
    renderPublik(<VerifikasiSurat kode={null} onPeriksa={onPeriksa} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Kode verifikasi' }), 'halo')
    await user.click(screen.getByRole('button', { name: 'Periksa' }))
    expect(screen.getByText('Kode verifikasi berbentuk seperti SS-7K3M-Q9TD.')).toBeInTheDocument()
    expect(onPeriksa).not.toHaveBeenCalled()
  })
  it('kode tidak ditemukan → pesan SPEC', async () => {
    renderPublik(<VerifikasiSurat kode="SS-AAAA-BBBB" onPeriksa={() => {}} />)
    expect(await screen.findByText('Kode tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByText('Periksa kembali, atau hubungi kantor desa.')).toBeInTheDocument()
  })
  it('surat yang dibatalkan: tetap ASLI, tetapi status merah dan penjelasan tidak berlaku (fokus review 2)', async () => {
    const t = suratBerlaku()
    ubahDb((d) => {
      const x = d.permohonan.find((y) => y.terbit?.kodeVerifikasi === t.kodeVerifikasi)
      if (x) {
        x.status = 'dibatalkan'
        x.pembatalan = { oleh: { id: 'pgn_hendri', nama: 'Hendri Saputra' }, pada: '2026-09-20T10:00:00+07:00', catatan: 'Data salah' }
      }
    })
    renderPublik(<VerifikasiSurat kode={t.kodeVerifikasi} onPeriksa={() => {}} />)
    const hasil = await screen.findByRole('region', { name: /^Surat ini asli/ })
    expect(within(hasil).getByText('Dibatalkan pada 20 Sep 2026')).toHaveClass('text-merah')
    expect(within(hasil).getByText('Surat ini sudah tidak berlaku')).toBeInTheDocument()
  })
  it('terlalu banyak percobaan → pesan RATE_LIMITED (fokus review 3)', async () => {
    serverUji.use(
      http.post('*/api/v1/publik/:slug/verifikasi', () =>
        HttpResponse.json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.' } }, { status: 429 }),
      ),
    )
    renderPublik(<VerifikasiSurat kode="SS-AAAA-BBBB" onPeriksa={() => {}} />)
    expect(await screen.findByText('Terlalu banyak percobaan')).toBeInTheDocument()
    expect(screen.getByText('Terlalu banyak percobaan. Coba lagi dalam 10 menit.')).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GalatApi } from '@/api/galat'
import { kirimBukti } from '@/api/langganan'
import { formatRupiah } from '@/domain/format/angka'
import { ID_SUNGAI_SIALANG } from '@/mocks/data/desa-demo'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Langganan } from './Langganan'

// Berkas di FormData tidak bisa dikirim di lingkungan uji jsdom; pengiriman berkas diuji di API (langganan.test.ts).
vi.mock('@/api/langganan', async (asli) => ({ ...(await asli<typeof import('@/api/langganan')>()), kirimBukti: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })
// Tanpa mengembalikan nilainya: fungsi yang dikembalikan beforeEach dipanggil vitest sebagai pembersih.
beforeEach(() => {
  vi.mocked(kirimBukti).mockReset()
})
afterEach(() => kosongkanToast())

const tagihanTerbit = () => ambilDb().tagihan.find((t) => t.desaId === ID_SUNGAI_SIALANG && t.status === 'terbit')!

function pasang(akun: string = AKUN_UJI.kaurKeuangan, peran: Parameters<typeof contohSesi>[0] = 'kaur-keuangan') {
  masukSebagai(akun)
  renderPanel(
    <>
      <Langganan sekarang={new Date('2026-09-24T02:00:00Z')} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}

async function isiFormulir(user: UserEvent, o: { nominal?: string } = {}) {
  const masukan = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!masukan) throw new Error('input berkas tidak ada')
  await user.upload(masukan, new File([new Uint8Array(2048)], 'bukti.png', { type: 'image/png' }))
  await user.click(within(screen.getByRole('group', { name: /Tanggal transfer/ })).getAllByRole('spinbutton')[0])
  await user.keyboard('23092026')
  await user.type(screen.getByRole('textbox', { name: /Nama rekening pengirim/ }), 'Pemdes Sungai Sialang')
  if (o.nominal !== undefined) {
    const nominal = screen.getByRole('textbox', { name: /Nominal yang ditransfer/ })
    await user.clear(nominal)
    await user.type(nominal, o.nominal)
    await user.tab()
  }
}

describe('Pengaturan › Langganan (rencana 7D-1 Tugas 5)', { timeout: 30_000 }, () => {
  it('Kaur Keuangan: paket, nominal besar, rekening, dan tombol Salin yang menyalin angka tanpa titik', async () => {
    const user = pasang()
    const t = tagihanTerbit()
    expect(await screen.findByRole('heading', { name: 'Tagihan berjalan' })).toBeInTheDocument()
    expect(screen.getByText(/^Paket Lengkap · Per triwulan · aktif sampai 31 Desember 2026$/)).toBeInTheDocument()
    expect(screen.getByLabelText(`Nominal ${formatRupiah(t.nominal)}`)).toHaveTextContent(formatRupiah(t.nominal))
    expect(screen.getByText('Bank Contoh Nusantara')).toBeInTheDocument()
    expect(screen.getByText('000 1234 5678')).toBeInTheDocument()
    expect(screen.getByText(`${t.nomor} · Triwulan IV 2026`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salin nominal' }))
    expect(await navigator.clipboard.readText()).toBe(String(t.nominal))
    expect(await screen.findByText('Nominal disalin.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Unduh tagihan' })).toHaveAttribute('href', `/admin/pengaturan/langganan/tagihan/${t.id}`)
  })
  it('riwayat tagihan: terbaru dulu dengan status, dan tautan Tagihan per baris', async () => {
    pasang()
    const tabel = await screen.findByRole('table', { name: 'Riwayat tagihan' })
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris[0]).toHaveTextContent('Triwulan IV 2026')
    expect(baris[0]).toHaveTextContent('Belum dibayar')
    expect(baris[1]).toHaveTextContent('Triwulan III 2026')
    expect(baris[1]).toHaveTextContent('Lunas')
    expect(within(baris[0]).getByRole('link', { name: `Tagihan ${tagihanTerbit().nomor}` })).toBeInTheDocument()
  })
  it('nominal berbeda menampilkan peringatan persis, dan nominal sama tidak', async () => {
    const user = pasang()
    const t = tagihanTerbit()
    await screen.findByRole('form', { name: 'Unggah bukti transfer' })
    expect(screen.queryByText(/berbeda dengan tagihan/)).not.toBeInTheDocument()
    await isiFormulir(user, { nominal: '1000000' })
    expect(await screen.findByText(`Nominal yang diisi (Rp1.000.000) berbeda dengan tagihan (${formatRupiah(t.nominal)}). Bukti tetap bisa dikirim; pastikan nominal transfer sudah benar.`)).toBeInTheDocument()
  })
  it('isian kosong ditandai di kolomnya tanpa memanggil server', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Kirim bukti' }))
    expect(await screen.findByText('Unggah bukti transfer.')).toBeInTheDocument()
    expect(screen.getByText('Pilih tanggal transfer.')).toBeInTheDocument()
    expect(screen.getByText('Nama rekening pengirim wajib diisi.')).toBeInTheDocument()
    expect(kirimBukti).not.toHaveBeenCalled()
  })
  it('kirim bukti: isian dan berkas sampai ke API, toast sukses, lalu status menjadi Menunggu verifikasi', async () => {
    const user = pasang()
    const t = tagihanTerbit()
    await screen.findByRole('form', { name: 'Unggah bukti transfer' })
    vi.mocked(kirimBukti).mockImplementation(async () => {
      ubahDb((d) => {
        const x = d.tagihan.find((y) => y.id === t.id)!
        x.status = 'menunggu-verifikasi'
        x.bukti = {
          berkas: 'bukti.png', ukuranKb: 2, jenisBerkas: 'gambar', dataUrl: null, tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang',
          nominalTransfer: t.nominal, nominalCocok: true, diunggahPada: '2026-09-24T09:00:00+07:00', oleh: { jenis: 'desa', id: 'pgn_nurhayati', nama: 'Nurhayati' },
        }
      })
      return ambilDb().tagihan.find((y) => y.id === t.id)!
    })
    await isiFormulir(user)
    await user.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    expect(await screen.findByText('Bukti terkirim. Tim Sinfodes akan memeriksanya.')).toBeInTheDocument()
    expect(kirimBukti).toHaveBeenCalledWith(t.id, { tanggalTransfer: '2026-09-23', namaPengirim: 'Pemdes Sungai Sialang', nominalTransfer: t.nominal }, expect.objectContaining({ name: 'bukti.png' }))
    expect(await screen.findByText(/Tim Sinfodes memeriksa bukti dalam 1-2 hari kerja\./)).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Unggah bukti transfer' })).not.toBeInTheDocument()
    const tabel = screen.getByRole('table', { name: 'Riwayat tagihan' })
    expect(within(tabel).getAllByRole('row')[1]).toHaveTextContent('Menunggu verifikasi')
  })
  it('409 dari server (tab lain sudah mengirim): toast pesan server dan layar dimuat ulang ke status terbaru', async () => {
    const user = pasang()
    const t = tagihanTerbit()
    await screen.findByRole('form', { name: 'Unggah bukti transfer' })
    vi.mocked(kirimBukti).mockImplementation(async () => {
      ubahDb((d) => {
        d.tagihan.find((y) => y.id === t.id)!.status = 'menunggu-verifikasi'
      })
      throw new GalatApi('CONFLICT', 'Tagihan ini tidak menunggu pembayaran.', 409)
    })
    await isiFormulir(user)
    await user.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    expect(await screen.findByText('Tagihan ini tidak menunggu pembayaran.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Unggah bukti transfer' })).not.toBeInTheDocument())
  })
  it('galat 422 dari server tampil di isiannya', async () => {
    const user = pasang()
    await screen.findByRole('form', { name: 'Unggah bukti transfer' })
    vi.mocked(kirimBukti).mockRejectedValue(new GalatApi('VALIDATION', 'Isian belum lengkap atau tidak valid.', 422, { namaPengirim: 'Paling banyak 80 karakter.' }))
    await isiFormulir(user)
    await user.click(screen.getByRole('button', { name: 'Kirim bukti' }))
    expect(await screen.findByText('Paling banyak 80 karakter.')).toBeInTheDocument()
  })
  it('bukti yang ditolak: banner dengan alasannya dan formulir tetap tersedia', async () => {
    ubahDb((d) => {
      d.tagihan.find((t) => t.id === tagihanTerbit().id)!.penolakanTerakhir = { alasan: 'Nominal tidak sesuai', pada: '2026-09-23T10:00:00+07:00', olehNama: 'Dina' }
    })
    pasang()
    expect(await screen.findByText('Bukti sebelumnya ditolak: Nominal tidak sesuai. Silakan unggah ulang.')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Unggah bukti transfer' })).toBeInTheDocument()
  })
  it('desa Uji coba (atau Persiapan): "Desa belum berlangganan." tanpa tagihan', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const sesi = contohSesi('kaur-keuangan')
    renderPanel(<Langganan />, { ...sesi, desa: { ...sesi.desa, status: 'Uji coba' } })
    expect(await screen.findByText('Desa belum berlangganan.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tagihan berjalan' })).not.toBeInTheDocument()
  })
  it('tab Pengaturan: Kepala Desa melihat Langganan dan Akses Sinfodes, Kaur Keuangan hanya Langganan', async () => {
    const tab = () => within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getAllByRole('link').map((a) => a.textContent)
    masukSebagai(AKUN_UJI.kades)
    const { unmount } = renderPanel(<Langganan />, contohSesi('kades'))
    await screen.findByRole('heading', { name: 'Tagihan berjalan' })
    expect(tab()).toEqual(['Langganan', 'Akses Sinfodes'])
    unmount()
    masukSebagai(AKUN_UJI.kaurKeuangan)
    renderPanel(<Langganan />, contohSesi('kaur-keuangan'))
    await screen.findByRole('heading', { name: 'Tagihan berjalan' })
    expect(tab()).toEqual(['Langganan'])
  })
})

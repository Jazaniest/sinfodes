import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { formatRupiah } from '@/domain/format/angka'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailTagihan } from './DetailTagihan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const menunggu = () => ambilDb().tagihan.filter((t) => t.status === 'menunggu-verifikasi').sort((a, b) => a.id.localeCompare(b.id))[0]

function pasang(id: string) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(
    <>
      <DetailTagihan id={id} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
  )
  return userEvent.setup()
}
const dialog = () => within(screen.getByRole('dialog'))

describe('Detail Tagihan Konsol (rencana 7D-2 Tugas 3)', () => {
  it('menunggu verifikasi: data tagihan, bukti beserta data yang diisi desa, aksi, dan riwayat', async () => {
    const t = menunggu()
    pasang(t.id)
    expect(await screen.findByRole('heading', { level: 1, name: `Tagihan ${t.nomor}` })).toBeInTheDocument()
    expect(screen.getAllByText(formatRupiah(t.nominal)).length).toBeGreaterThan(0)
    const namaDesa = ambilDb().desa.find((d) => d.id === t.desaId)!.nama
    expect(await screen.findByRole('img', { name: `Bukti transfer ${namaDesa}` })).toBeInTheDocument()
    expect(screen.getByText(t.bukti!.namaPengirim)).toBeInTheDocument()
    for (const nama of ['Tandai lunas', 'Tolak bukti', 'Batalkan tagihan']) expect(screen.getByRole('button', { name: nama })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lihat tagihan' })).toHaveAttribute('href', `/konsol/tagihan/${t.id}/tagihan`)
    expect(screen.queryByRole('link', { name: 'Cetak kwitansi' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Riwayat tagihan' })).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2)
  })
  it('Tandai lunas: dialog bertanggal hari ini, sukses menjadi Lunas dengan tombol Cetak kwitansi', async () => {
    const t = menunggu()
    const user = pasang(t.id)
    await user.click(await screen.findByRole('button', { name: 'Tandai lunas' }))
    expect(dialog().getByRole('group', { name: /Tanggal diterima/ })).toHaveTextContent('24')
    expect(dialog().getByRole('textbox', { name: /Nominal diterima/ })).toHaveValue(new Intl.NumberFormat('id-ID').format(t.bukti!.nominalTransfer))
    await user.click(dialog().getByRole('button', { name: 'Tandai lunas' }))
    expect(await screen.findByText('Tagihan ditandai lunas. Kwitansi sudah terbit.')).toBeInTheDocument()
    const cetak = await screen.findByRole('link', { name: 'Cetak kwitansi' })
    expect(cetak).toHaveAttribute('href', `/konsol/tagihan/${t.id}/kwitansi`)
    expect(screen.queryByRole('button', { name: 'Tolak bukti' })).not.toBeInTheDocument()
    expect(ambilDb().tagihan.find((x) => x.id === t.id)!.status).toBe('lunas')
  })
  it('Tolak bukti: alasan pendek ditandai dengan pesan persis; alasan sah mengembalikan ke Belum dibayar', async () => {
    const t = menunggu()
    const user = pasang(t.id)
    await user.click(await screen.findByRole('button', { name: 'Tolak bukti' }))
    await user.type(dialog().getByRole('textbox', { name: /Alasan/ }), 'Pendek')
    await user.click(dialog().getByRole('button', { name: 'Tolak bukti' }))
    expect(await dialog().findByText('Isi alasan paling sedikit 10 karakter.')).toBeInTheDocument()
    expect(ambilDb().tagihan.find((x) => x.id === t.id)!.status).toBe('menunggu-verifikasi')
    await user.type(dialog().getByRole('textbox', { name: /Alasan/ }), ' sekali, nominal tidak sesuai')
    await user.click(dialog().getByRole('button', { name: 'Tolak bukti' }))
    expect(await screen.findByText('Bukti ditolak. Desa diberi tahu alasannya.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tandai lunas' })).not.toBeInTheDocument())
    expect(ambilDb().tagihan.find((x) => x.id === t.id)).toMatchObject({ status: 'terbit', bukti: null })
    expect(screen.getByText(/Bukti sebelumnya ditolak: Pendek sekali, nominal tidak sesuai/)).toBeInTheDocument()
  })
  it('Batalkan tagihan: alasan wajib, lalu status Dibatalkan tanpa aksi lagi', async () => {
    const t = menunggu()
    const user = pasang(t.id)
    await user.click(await screen.findByRole('button', { name: 'Batalkan tagihan' }))
    await user.type(dialog().getByRole('textbox', { name: /Alasan/ }), 'Tagihan dobel terbit')
    await user.click(dialog().getByRole('button', { name: 'Batalkan tagihan' }))
    expect(await screen.findByText('Tagihan dibatalkan.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Batalkan tagihan' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Dibatalkan').length).toBeGreaterThan(0)
  })
  it('aksi bersamaan (Review Focus 1): tagihan sudah diubah tim lain, jadi 409 tampil sebagai toast dan layar dimuat ulang', async () => {
    const t = menunggu()
    const user = pasang(t.id)
    await user.click(await screen.findByRole('button', { name: 'Tolak bukti' }))
    await user.type(dialog().getByRole('textbox', { name: /Alasan/ }), 'Nominal tidak sesuai tagihan')
    ubahDb((d) => {
      d.tagihan.find((x) => x.id === t.id)!.status = 'lunas'
    })
    await user.click(dialog().getByRole('button', { name: 'Tolak bukti' }))
    expect(await screen.findByText('Tagihan ini tidak menunggu verifikasi.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tolak bukti' })).not.toBeInTheDocument())
  })
  it('tagihan terbit: hanya Batalkan, tanpa Tandai lunas', async () => {
    const terbit = ambilDb().tagihan.find((x) => x.status === 'terbit')!
    pasang(terbit.id)
    expect(await screen.findByRole('button', { name: 'Batalkan tagihan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai lunas' })).not.toBeInTheDocument()
  })
  it('ID tidak ada', async () => {
    pasang('tgh_tidak_ada')
    expect(await screen.findByText('Tagihan tidak ditemukan')).toBeInTheDocument()
  })
})

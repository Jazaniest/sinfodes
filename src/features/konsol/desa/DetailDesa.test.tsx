import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailDesa } from './DetailDesa'
import type { TabDetailDesa } from './tab-detail'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id: string, tab: TabDetailDesa) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(
    <>
      <DetailDesa id={id} tab={tab} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
  )
  return userEvent.setup()
}

describe('Detail desa Konsol (SPEC §11)', () => {
  it('Ringkasan: identitas, alamat dan alamat lama, kontak Kepala Desa dan operator; tab berupa tautan; tanpa isi data desa', async () => {
    pasang('desa_sungai_sialang', 'ringkasan')
    expect(await screen.findByRole('heading', { level: 1, name: 'Desa Sungai Sialang' })).toBeInTheDocument()
    expect(screen.getByText('Teluk Meranti · Pelalawan · Riau · Aktif')).toBeInTheDocument()
    const tab = screen.getByRole('navigation', { name: 'Bagian detail desa' })
    expect(within(tab).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Persiapan', 'Keaktifan', 'Langganan'])
    expect(within(tab).getByRole('link', { name: 'Keaktifan' })).toHaveAttribute('href', '/konsol/desa/desa_sungai_sialang?tab=keaktifan')
    expect(screen.getByText('H. Muhammad Nasir')).toBeInTheDocument()
    expect(screen.getByText('Rosmiati · rosmiati@sungaisialang.desa.id')).toBeInTheDocument()
    expect(screen.getByText('Hendri Saputra · hendri@sungaisialang.desa.id')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'sungaisialang.sinfodes.localhost' })).toHaveAttribute('href', 'http://sungaisialang.sinfodes.localhost:3000/')
    expect(screen.getByText('sungai-sialang')).toBeInTheDocument()
    expect(screen.queryByText('Penduduk')).not.toBeInTheDocument()
    expect(screen.queryByText('Kelengkapan data')).not.toBeInTheDocument()
  })
  it('Persiapan Tanjung Lamo: 0 dari 5 langkah, semua belum (fokus review 5)', async () => {
    pasang('desa_tanjung_lamo', 'persiapan')
    expect(await screen.findByText('0 dari 5 langkah selesai')).toBeInTheDocument()
    const langkah = within(screen.getByRole('list', { name: 'Langkah persiapan' })).getAllByRole('listitem')
    expect(langkah).toHaveLength(5)
    expect(langkah[2]).toHaveTextContent('Impor data penduduk dari Excel')
    expect(langkah.every((l) => l.textContent?.includes('Belum'))).toBe(true)
  })
  it('Keaktifan: akun aktif, penyimpanan berkas, dan masuk per minggu dengan Lihat sebagai tabel; tanpa surat (SPEC-V0.2 §7)', async () => {
    const user = pasang('desa_sungai_sialang', 'keaktifan')
    expect(within(await screen.findByRole('list', { name: 'Masuk panel per minggu' })).getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getByText('Akun aktif')).toBeInTheDocument()
    expect(screen.getByText('Penyimpanan berkas')).toBeInTheDocument()
    expect(screen.getByText(/^[0-9.,]+ (KB|MB)$/)).toBeInTheDocument()
    expect(screen.queryByText(/Surat terbit per bulan|Surat per bulan/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Lihat sebagai tabel' }))
    expect(screen.getByRole('table', { name: 'Masuk panel per minggu' })).toHaveTextContent('21 Sep 2026')
  })
  it('Keaktifan desa tanpa masuk: keterangan, bukan grafik kosong (fokus review 4)', async () => {
    pasang('desa_tanjung_lamo', 'keaktifan')
    expect(await screen.findByText('Belum ada yang masuk panel dalam 12 minggu terakhir.')).toBeInTheDocument()
  })
  it('Langganan: paket dan harga per triwulan, masa aktif, dan tagihan terbaru dulu beserta statusnya (Triwulan IV sudah terbit H-14)', async () => {
    pasang('desa_sungai_rambai', 'langganan')
    expect(await screen.findByText('Lengkap · Rp3.000.000 per triwulan')).toBeInTheDocument()
    const tagihan = within(screen.getByRole('table', { name: 'Tagihan' })).getAllByRole('row').slice(1)
    expect(tagihan.length).toBeGreaterThan(0)
    expect(tagihan[0]).toHaveTextContent('Triwulan IV 2026')
    expect(tagihan[0]).toHaveTextContent('Belum dibayar')
    expect(tagihan[1]).toHaveTextContent('Triwulan III 2026')
    expect(tagihan[1]).toHaveTextContent('Lewat jatuh tempo')
    expect(tagihan.slice(2).every((t) => t.textContent?.includes('Lunas'))).toBe(true)
  })
  it('Langganan: nomor tagihan menuju detail tagihan di menu Tagihan', async () => {
    pasang('desa_sungai_sialang', 'langganan')
    const terbit = ambilDb().tagihan.find((t) => t.desaId === 'desa_sungai_sialang' && t.status === 'terbit')!
    expect(await screen.findByRole('link', { name: terbit.nomor })).toHaveAttribute('href', `/konsol/tagihan/${terbit.id}`)
  })
  it('Langganan: periode tagihan diubah dari pemilih, berlaku mulai tagihan berikutnya', async () => {
    const user = pasang('desa_sungai_sialang', 'langganan')
    await user.click(await screen.findByRole('button', { name: /Periode tagihan/ }))
    await user.click(await screen.findByRole('option', { name: 'Per tahun' }))
    expect(await screen.findByText('Periode tagihan diubah. Berlaku mulai tagihan berikutnya.')).toBeInTheDocument()
    expect(ambilDb().langganan.find((l) => l.desaId === 'desa_sungai_sialang')!.periodeTagihan).toBe('tahunan')
    expect(await screen.findByRole('button', { name: /Periode tagihan.*Per tahun|Per tahun.*Periode tagihan/ })).toBeInTheDocument()
  })
  it('Ubah status desa Aktif hanya menawarkan Ditangguhkan; setelah kirim, riwayat status bertambah', async () => {
    const user = pasang('desa_sungai_sialang', 'langganan')
    expect(await screen.findByText('Belum ada perubahan status.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ubah status' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /Status tujuan/ }))
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['Ditangguhkan'])
    await user.click(screen.getByRole('option', { name: 'Ditangguhkan' }))
    await user.click(dialog.getByRole('button', { name: 'Ubah status' }))
    expect(await dialog.findByText('Isi alasan paling sedikit 10 karakter.')).toBeInTheDocument()
    await user.type(dialog.getByRole('textbox', { name: /Alasan/ }), 'Tunggakan dua triwulan tidak dibayar.')
    await user.click(dialog.getByRole('button', { name: 'Ubah status' }))
    expect(await screen.findByText('Status desa diubah menjadi Ditangguhkan.')).toBeInTheDocument()
    const riwayat = await screen.findByRole('list', { name: 'Riwayat status' })
    expect(within(riwayat).getAllByRole('listitem')).toHaveLength(1)
    expect(riwayat).toHaveTextContent('Aktif → Ditangguhkan')
    expect(riwayat).toHaveTextContent('Tunggakan dua triwulan tidak dibayar.')
    expect(screen.getByText(/Teluk Meranti · Pelalawan · Riau · Ditangguhkan/)).toBeInTheDocument()
  })
  it('Persiapan yang belum lengkap: pesan server tampil di dialog dan status tidak berubah', async () => {
    const user = pasang('desa_tanjung_lamo', 'langganan')
    await user.click(await screen.findByRole('button', { name: 'Ubah status' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByRole('textbox', { name: /Alasan/ }), 'Persiapan dinilai sudah cukup.')
    await user.click(dialog.getByRole('button', { name: 'Ubah status' }))
    expect(await dialog.findByText('Selesaikan kelima langkah persiapan dulu.')).toBeInTheDocument()
    expect(ambilDb().desa.find((d) => d.id === 'desa_tanjung_lamo')!.status).toBe('Persiapan')
  })
  it('desa Ditangguhkan contoh: riwayat status memuat alasannya', async () => {
    const air = ambilDb().desa.find((d) => d.nama === 'Air Tawar Jaya')!
    pasang(air.id, 'langganan')
    const riwayat = await screen.findByRole('list', { name: 'Riwayat status' })
    expect(riwayat).toHaveTextContent('Aktif → Ditangguhkan')
    expect(riwayat).toHaveTextContent('Tagihan dua triwulan belum dibayar.')
  })
  it('Langganan desa Persiapan: masa aktif belum ditentukan, belum ada tagihan (fokus review 4)', async () => {
    pasang('desa_tanjung_lamo', 'langganan')
    expect(await screen.findByText('Belum ditentukan, desa masih dalam persiapan')).toBeInTheDocument()
    expect(screen.getByText('Belum ada tagihan.')).toBeInTheDocument()
  })
  it('desa yang tidak ada → "Desa tidak ditemukan" dengan jalan kembali', async () => {
    pasang('desa_tidak_ada', 'ringkasan')
    expect(await screen.findByRole('heading', { level: 1, name: 'Desa tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar desa' })).toHaveAttribute('href', '/konsol/desa')
  })
})

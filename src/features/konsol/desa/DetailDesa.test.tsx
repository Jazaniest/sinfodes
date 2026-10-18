import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { DetailDesa } from './DetailDesa'
import type { TabDetailDesa } from './tab-detail'

pakaiApiTiruan()

function pasang(id: string, tab: TabDetailDesa) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  renderKonsol(<DetailDesa id={id} tab={tab} sekarang={SEKARANG_UJI} />)
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
  it('Langganan: paket dan harga per triwulan, masa aktif, dan tagihan terbaru dulu beserta statusnya', async () => {
    pasang('desa_sungai_rambai', 'langganan')
    expect(await screen.findByText('Lengkap · Rp3.000.000 per triwulan')).toBeInTheDocument()
    const tagihan = within(screen.getByRole('table', { name: 'Tagihan' })).getAllByRole('row').slice(1)
    expect(tagihan.length).toBeGreaterThan(0)
    expect(tagihan[0]).toHaveTextContent('Triwulan III 2026')
    expect(tagihan[0]).toHaveTextContent('Lewat jatuh tempo')
    expect(tagihan.slice(1).every((t) => t.textContent?.includes('Lunas'))).toBe(true)
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

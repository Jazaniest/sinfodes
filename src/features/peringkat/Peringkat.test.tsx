import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { Peringkat } from './Peringkat'

pakaiApiTiruan()

describe('Peringkat desa (rencana 7C-2 Tugas 3)', () => {
  it('Sekdes Sungai Sialang: judul, 9 baris kategori, kolom Ambang juara 3, dan tren 6 baris', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderPanel(<Peringkat filter={{}} onUbahFilter={() => {}} />, contohSesi('sekdes'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Peringkat desa' })).toBeInTheDocument()
    expect(await screen.findByText('Agustus 2026 · Kecamatan Teluk Meranti · Kabupaten Pelalawan')).toBeInTheDocument()
    const tabel = screen.getByRole('table', { name: 'Posisi desa per kategori, Agustus 2026' })
    expect(within(tabel).getByRole('columnheader', { name: 'Ambang juara 3' })).toBeInTheDocument()
    expect(within(tabel).getAllByRole('row')).toHaveLength(10)
    expect(within(tabel).getByRole('rowheader', { name: 'Layanan Tercepat' })).toBeInTheDocument()
    expect(within(tabel).getByRole('rowheader', { name: 'Juara Umum' })).toBeInTheDocument()
    const tren = screen.getByRole('table', { name: 'Indeks enam periode terakhir' })
    expect(within(tren).getAllByRole('row')).toHaveLength(7)
  })
  it('mengganti periode ke September menampilkan banner klasemen sementara', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderPanel(<Peringkat filter={{ periode: '2026-09' }} onUbahFilter={() => {}} />, contohSesi('sekdes'))
    expect(await screen.findByText(/^Klasemen sementara\. Angka masih bisa berubah sampai periode tutup pada 1 Oktober 2026/)).toBeInTheDocument()
  })
  it('memilih musim menulis pilihan ke URL lewat onUbahFilter', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const ubah = vi.fn()
    const user = userEvent.setup()
    renderPanel(<Peringkat filter={{}} onUbahFilter={ubah} />, contohSesi('sekdes'))
    await user.click(await screen.findByRole('radio', { name: 'Triwulan' }))
    expect(ubah).toHaveBeenCalledWith({ musim: 'triwulan', periode: undefined })
  })
  it('saran berupa tautan; atau kalimat pujian bila tidak ada', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderPanel(<Peringkat filter={{}} onUbahFilter={() => {}} />, contohSesi('sekdes'))
    const saran = await screen.findByRole('region', { name: 'Saran untuk naik' })
    const tautan = within(saran).queryAllByRole('link')
    if (tautan.length === 0) expect(within(saran).getByText('Belum ada saran. Pertahankan kebiasaan baik desa.')).toBeInTheDocument()
    for (const t of tautan) expect(t.getAttribute('href')).toMatch(/^\/admin\//)
  })
  it('sesi Tanjung Lamo menampilkan alasan non-peserta tanpa tabel', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(<Peringkat filter={{}} onUbahFilter={() => {}} />, contohSesiDesaBaru())
    expect(await screen.findByText('Desa Tanjung Lamo belum ikut peringkat. Peringkat diikuti desa berstatus Aktif sepanjang periode.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

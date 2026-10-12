import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { unduhBerkas } from '@/ui/unduh'
import { DaftarBuku } from './DaftarBuku'
import { IsiBuku } from './IsiBuku'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan()

const AKUN: Partial<Record<Peran, string>> = { operator: AKUN_UJI.operator, kades: AKUN_UJI.kades, 'kaur-keuangan': AKUN_UJI.kaurKeuangan }

function pasangDaftar(peran: Peran) {
  masukSebagai(AKUN[peran] ?? AKUN_UJI.operator)
  renderPanel(<DaftarBuku />, contohSesi(peran))
}
function pasangIsi(kode: string, peran: Peran = 'kades') {
  masukSebagai(AKUN[peran] ?? AKUN_UJI.kades)
  const onUbahHalaman = vi.fn()
  renderPanel(<IsiBuku kode={kode} halaman={{ page: 1, pageSize: 25 }} onUbahHalaman={onUbahHalaman} sekarang={SEKARANG_UJI} />, contohSesi(peran))
  return { onUbahHalaman, user: userEvent.setup() }
}

describe('Buku Administrasi (SPEC §8, Lampiran B)', () => {
  it('daftar per kelompok: sumber, jumlah baris, dan Lihat; buku manual tanpa Lihat', async () => {
    pasangDaftar('operator')
    expect(await screen.findByRole('heading', { name: 'Administrasi umum' })).toBeInTheDocument()
    const induk = screen.getByRole('listitem', { name: 'Buku Induk Penduduk' })
    expect(induk).toHaveTextContent('Terisi otomatis dari Kependudukan · 2.812 baris')
    expect(within(induk).getByRole('link', { name: 'Lihat Buku Induk Penduduk' })).toHaveAttribute('href', '/admin/buku/induk-penduduk')
    const kas = screen.getByRole('listitem', { name: 'Buku Kas Umum' })
    expect(kas).toHaveTextContent('Diisi manual')
    expect(within(kas).queryByRole('link')).not.toBeInTheDocument()
  })
  it('Kaur Keuangan hanya melihat buku keuangan (fokus review 1)', async () => {
    pasangDaftar('kaur-keuangan')
    expect(await screen.findByRole('heading', { name: 'Administrasi keuangan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administrasi penduduk' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administrasi umum' })).not.toBeInTheDocument()
  })
  it('isi Buku Induk: kolom resmi, 25 baris per halaman, pindah halaman', async () => {
    const { onUbahHalaman, user } = pasangIsi('induk-penduduk')
    const tabel = await screen.findByRole('grid', { name: 'Buku Induk Penduduk' })
    expect(within(tabel).getByRole('columnheader', { name: 'Nama lengkap' })).toBeInTheDocument()
    expect(within(tabel).getAllByRole('row').slice(1)).toHaveLength(25)
    expect(screen.getByText(/Terisi otomatis dari Kependudukan · 2\.812 baris/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Berikutnya/ }))
    expect(onUbahHalaman).toHaveBeenCalledWith({ page: 2 })
  })
  it('Unduh CSV berisi semua baris dengan kolom bukunya', async () => {
    const { user } = pasangIsi('apb-desa')
    await user.click(await screen.findByRole('button', { name: 'Unduh CSV' }))
    await vi.waitFor(() => expect(unduhBerkas).toHaveBeenCalled())
    const [nama, isi] = vi.mocked(unduhBerkas).mock.calls[0]
    expect(nama).toBe('buku-apb-desa-2026-09-24.csv')
    expect(isi).toContain('Kode rekening;Uraian;Anggaran (Rp)')
    expect(isi).toContain('Jumlah belanja')
  })
  it('Cetak memasang lembar berisi semua baris, lalu membuka dialog cetak', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { user } = pasangIsi('rab')
    await user.click(await screen.findByRole('button', { name: 'Cetak' }))
    const lembar = await screen.findByRole('region', { name: 'Lembar cetak Buku Rencana Anggaran Biaya' })
    expect(within(lembar).getAllByRole('row').slice(1)).toHaveLength(8)
    expect(cetak).toHaveBeenCalledOnce()
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(screen.queryByRole('region', { name: 'Lembar cetak Buku Rencana Anggaran Biaya' })).not.toBeInTheDocument()
  })
  it('buku yang tidak boleh dibuka dan buku manual tampil sebagai pesan (fokus review 1)', async () => {
    pasangIsi('induk-penduduk', 'kaur-keuangan')
    expect(await screen.findByText('Peran Anda tidak berhak membuka buku ini.')).toBeInTheDocument()
  })
})

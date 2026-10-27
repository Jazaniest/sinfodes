import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilKeluarga } from '@/api/keluarga'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DetailKeluarga } from './DetailKeluarga'

pakaiApiTiruan({ dbSegarTiapUji: true })

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  const onBukaKeluarga = vi.fn()
  renderPanel(<DetailKeluarga id="kk_syahrial" onBukaPenduduk={vi.fn()} onBukaKeluarga={onBukaKeluarga} />, contohSesi(peran))
  return { onBukaKeluarga, user: userEvent.setup() }
}

describe('Aksi KK (SPEC §6.5)', { timeout: 15_000 }, () => {
  it('operator: Tambah anggota, Ganti kepala keluarga, Pecah KK, dan Cetak', async () => {
    pasang()
    expect(await screen.findByRole('link', { name: 'Tambah anggota' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk/tambah?keluarga=kk_syahrial',
    )
    expect(screen.getByRole('button', { name: 'Ganti kepala keluarga' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pecah KK' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cetak' })).toBeInTheDocument()
  })
  it('Kepala Desa hanya bisa mencetak', async () => {
    pasang('kades')
    expect(await screen.findByRole('button', { name: 'Cetak' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tambah anggota' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pecah KK' })).not.toBeInTheDocument()
  })
  it('Cetak membuka dialog cetak browser', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { user } = pasang()
    await user.click(await screen.findByRole('button', { name: 'Cetak' }))
    expect(cetak).toHaveBeenCalledOnce()
    cetak.mockRestore()
  })
  it('ganti kepala keluarga lewat dialog; hubungan kepala lama diusulkan', async () => {
    const { user } = pasang()
    await user.click(await screen.findByRole('button', { name: 'Ganti kepala keluarga' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ganti kepala keluarga' })
    await user.click(within(dialog).getByRole('radio', { name: /Siti Rahmah/ }))
    expect(within(dialog).getByRole('button', { name: /Hubungan Syahrial setelah diganti/ })).toHaveTextContent('Suami')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'KK Siti Rahmah' })).toBeInTheDocument()
  })
  it('pecah KK tiga langkah: kepala lama tidak bisa dipilih, pratinjau, lalu KK baru', async () => {
    const { user, onBukaKeluarga } = pasang()
    await user.click(await screen.findByRole('button', { name: 'Pecah KK' }))
    const dialog = await screen.findByRole('dialog', { name: 'Pecah KK' })
    expect(within(dialog).getByRole('checkbox', { name: /Syahrial/ })).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox', { name: /Siti Rahmah/ }))
    await user.click(within(dialog).getByRole('checkbox', { name: /Muhammad Alif/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Lanjut' }))
    expect(within(dialog).getByText('Langkah 2 dari 3 · Kepala dan alamat')).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /Siti Rahmah/ })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Lanjut' }))
    expect(within(dialog).getByText(/Kepala keluarga Siti Rahmah · 2 anggota/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onBukaKeluarga).toHaveBeenCalled())
    const [idBaru] = onBukaKeluarga.mock.calls[0]
    expect((await ambilKeluarga(idBaru)).anggota.map((a) => a.nama)).toEqual(['Siti Rahmah', 'Muhammad Alif'])
  })
  it('KK tanpa anggota: keterangan arsip, tanpa aksi (fokus review 3)', async () => {
    const kk = ambilDb().keluarga.find((k) => k.id === 'kk_syahrial')
    if (!kk) throw new Error('KK contoh tidak ada')
    kk.anggotaIds = []
    pasang()
    expect(await screen.findByText('KK ini tidak lagi punya anggota')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'KK 140509 201123 8004' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cetak' })).not.toBeInTheDocument()
  })
})

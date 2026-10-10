import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-aria-components'
import { describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { PencarianCepat } from './PencarianCepat'

pakaiApiTiruan()

const LABEL_KOTAK = 'Cari penduduk, nomor KK, surat, atau halaman'

function pasang(peran: Peran) {
  const navigate = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider navigate={navigate}>
        <PencarianCepat isOpen onOpenChange={onOpenChange} peran={peran} />
      </RouterProvider>
    </QueryClientProvider>,
  )
  return { navigate, onOpenChange, user: userEvent.setup() }
}

describe('Pencarian cepat (SPEC §5.4)', () => {
  it('kosong: dialog berlabel dengan daftar halaman', () => {
    pasang('operator')
    expect(screen.getByRole('dialog', { name: 'Pencarian cepat' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Beranda' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Penduduk' })).toBeInTheDocument()
  })
  it('NIK → penduduk; Enter membuka profilnya lalu menutup', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { navigate, onOpenChange, user } = pasang('operator')
    await user.type(screen.getByLabelText(LABEL_KOTAK), '1405095203918002')
    expect(await screen.findByRole('menuitem', { name: 'Siti Rahmah' })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(navigate.mock.calls[0]?.[0]).toBe('/admin/kependudukan/penduduk/pdk_siti_rahmah')
    expect(navigate).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it('NIK ditempel (tanpa item terfokus) → Enter tetap membuka hasil pertama', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { navigate, user } = pasang('operator')
    await user.click(screen.getByLabelText(LABEL_KOTAK))
    await user.paste('1405095203918002')
    expect(await screen.findByRole('menuitem', { name: 'Siti Rahmah' })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(navigate.mock.calls[0]?.[0]).toBe('/admin/kependudukan/penduduk/pdk_siti_rahmah')
    expect(navigate).toHaveBeenCalledOnce()
  })
  it('nomor KK lengkap → KK di urutan pertama; Enter membuka KK, bukan anggotanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { navigate, user } = pasang('operator')
    await user.click(screen.getByLabelText(LABEL_KOTAK))
    await user.paste('1405092011238004')
    expect(await screen.findByRole('menuitem', { name: 'KK Syahrial' })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(navigate.mock.calls[0]?.[0]).toBe('/admin/kependudukan/keluarga/kk_syahrial')
    expect(navigate).toHaveBeenCalledOnce()
  })
  it('nama halaman langsung tersaring', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { user } = pasang('operator')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'balita')
    expect(screen.getByRole('menuitem', { name: 'Balita' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Beranda' })).not.toBeInTheDocument()
  })
  it('Kaur Keuangan: tanpa halaman kependudukan dan tanpa hasil penduduk', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const { user } = pasang('kaur-keuangan')
    expect(screen.queryByRole('menuitem', { name: 'Penduduk' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(LABEL_KOTAK), '1405095203918002')
    expect(await screen.findByText('Tidak ada yang cocok.')).toBeInTheDocument()
  })
  it('aksi "Catat kelahiran" untuk peran yang boleh mengubah data (SPEC §5.4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { user } = pasang('operator')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'catat kel')
    expect(screen.getByRole('menuitem', { name: /Catat kelahiran/ })).toBeInTheDocument()
  })
  it('Kepala Desa melihat halaman Mutasi, tanpa aksi catat', async () => {
    masukSebagai(AKUN_UJI.kades)
    const { user } = pasang('kades')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'mutasi')
    expect(screen.getByRole('menuitem', { name: /^Mutasi/ })).toBeInTheDocument()
    await user.clear(screen.getByLabelText(LABEL_KOTAK))
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'catat')
    expect(screen.queryByRole('menuitem', { name: /Catat kelahiran/ })).not.toBeInTheDocument()
  })
  it('halaman Statistik penduduk bisa dicari (SPEC §5.4)', async () => {
    masukSebagai(AKUN_UJI.kades)
    const { user } = pasang('kades')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'statistik')
    expect(screen.getByRole('menuitem', { name: /^Statistik penduduk/ })).toBeInTheDocument()
  })
  it('nomor surat → surat itu; Enter membuka ruang kerjanya (SPEC §5.4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const terbit = ambilDb().permohonan.find((p) => p.terbit && p.desaId === 'desa_sungai_sialang')
    const nomor = terbit?.terbit?.nomor ?? '-'
    const pemohon = ambilDb().penduduk.find((p) => p.id === terbit?.pemohonId)?.nama ?? '-'
    const { navigate, user } = pasang('operator')
    await user.click(screen.getByLabelText(LABEL_KOTAK))
    await user.paste(nomor)
    const item = await screen.findByRole('menuitem', { name: new RegExp(` · ${pemohon}$`) })
    expect(item).toHaveTextContent(nomor)
    await user.keyboard('{Enter}')
    expect(navigate.mock.calls[0]?.[0]).toBe(`/admin/surat/${terbit?.id}`)
  })
  it('nama pemohon → permohonannya, di bawah hasil penduduk (SPEC §5.4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { user } = pasang('operator')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'Zulkifli')
    const daftar = await screen.findAllByRole('menuitem', { name: 'Surat Keterangan Usaha · Zulkifli' })
    const item = daftar.find((el) => el.textContent?.includes('Diproses'))
    expect(item).toHaveTextContent('Belum bernomor · Diproses')
    expect(item).toHaveAttribute('href', expect.stringMatching(/^\/admin\/surat\/srt_/))
  })
  it('aksi Buat surat bisa dicari Operator', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { user } = pasang('operator')
    await user.type(screen.getByLabelText(LABEL_KOTAK), 'buat surat')
    expect(screen.getByRole('menuitem', { name: 'Buat surat' })).toBeInTheDocument()
  })
})

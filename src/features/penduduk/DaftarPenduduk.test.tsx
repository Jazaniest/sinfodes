import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import type { Peran } from '@/domain/pengguna/schema'
import { aturModeJaringan } from '@/mocks/jaringan'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { aturLebarLayar } from '@/test/layar'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarPenduduk } from './DaftarPenduduk'
import { FILTER_PENDUDUK_BAWAAN } from './filter-url'

pakaiApiTiruan()

function pasang(filter: Partial<FilterPenduduk> = {}, peran: Peran = 'operator') {
  const onUbahFilter = vi.fn()
  const onBukaProfil = vi.fn()
  renderPanel(
    <DaftarPenduduk
      filter={{ ...FILTER_PENDUDUK_BAWAAN, ...filter }}
      onUbahFilter={onUbahFilter}
      onBukaProfil={onBukaProfil}
      sekarang={SEKARANG_UJI}
    />,
    contohSesi(peran),
  )
  return { onUbahFilter, onBukaProfil, user: userEvent.setup() }
}

describe('Daftar penduduk (SPEC §6.2)', () => {
  it('kepala halaman, 25 baris, dan paginasi', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onUbahFilter, user } = pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Penduduk' })).toBeInTheDocument()
    expect(await screen.findByText(/^2\.812 jiwa · diperbarui hari ini \d{2}\.\d{2}$/)).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', { name: 'Daftar penduduk' })
    expect(within(tabel).getAllByRole('row')).toHaveLength(26)
    expect(screen.getByText('1–25 dari 2.812')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Berikutnya/ }))
    expect(onUbahFilter).toHaveBeenCalledWith({ page: 2 })
  })
  it('NIK di kotak cari dikirim lewat POST, tidak pernah ke URL (fokus review 4)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const permintaan: string[] = []
    serverUji.events.on('request:start', ({ request }) => {
      permintaan.push(`${request.method} ${request.url}`)
    })
    const { user } = pasang()
    await screen.findByRole('grid', { name: 'Daftar penduduk' })
    await user.click(screen.getByRole('searchbox', { name: 'Cari penduduk' }))
    await user.paste('1405095203918002')
    expect(await screen.findByRole('row', { name: /Siti Rahmah/ })).toBeInTheDocument()
    expect(permintaan.some((p) => p.startsWith('POST') && p.endsWith('/api/v1/penduduk/cari'))).toBe(true)
    expect(permintaan.every((p) => !p.includes('1405095203918002'))).toBe(true)
    expect(window.location.href).not.toContain('1405095203918002')
  })
  it('filter siap pakai mengubah filter dan kembali ke halaman 1', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onUbahFilter, user } = pasang()
    await user.click(screen.getByRole('radio', { name: 'Balita' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ preset: 'balita', page: 1 })
  })
  it('filter tanpa hasil → pesan dan Hapus filter', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onUbahFilter, user } = pasang({ umurMin: 140 })
    expect(await screen.findByText('Tidak ada penduduk yang cocok dengan filter ini')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Hapus filter' })[0])
    expect(onUbahFilter).toHaveBeenCalledWith(expect.objectContaining({ umurMin: undefined, status: 'Hidup', page: 1 }))
  })
  it('cari di dalam filter aktif tanpa hasil → dijelaskan, Hapus filter tetap menyimpan kata cari', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onUbahFilter, user } = pasang({ preset: 'balita' })
    await screen.findByRole('grid', { name: 'Daftar penduduk' })
    await user.click(screen.getByRole('searchbox', { name: 'Cari penduduk' }))
    await user.paste('1405095203918002')
    expect(await screen.findByText(/hanya di dalam filter yang sedang aktif/)).toBeInTheDocument()
    const kosong = screen.getByText(/hanya di dalam filter yang sedang aktif/).parentElement as HTMLElement
    await user.click(within(kosong).getByRole('button', { name: 'Hapus filter' }))
    expect(onUbahFilter).toHaveBeenLastCalledWith(expect.objectContaining({ preset: undefined, page: 1 }))
    expect(screen.getByRole('searchbox', { name: 'Cari penduduk' })).toHaveValue('1405095203918002')
  })
  it('mantan penduduk: umur tidak ditampilkan di baris maupun laci', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { user } = pasang({ status: 'Meninggal' })
    const tabel = await screen.findByRole('grid', { name: 'Daftar penduduk' })
    const baris = within(tabel).getAllByRole('row')[1]
    expect(baris).not.toHaveTextContent(/\d+ tahun/)
    await user.click(baris)
    const laci = await screen.findByRole('dialog')
    expect(within(laci).queryByText('Umur')).not.toBeInTheDocument()
  })
  it('halaman di luar jangkauan → Ke halaman pertama (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onUbahFilter, user } = pasang({ page: 999 })
    await user.click(await screen.findByRole('button', { name: 'Ke halaman pertama' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ page: 1 })
  })
  it('klik baris membuka laci dengan anggota keluarga; Buka profil', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { onBukaProfil, user } = pasang()
    const tabel = await screen.findByRole('grid', { name: 'Daftar penduduk' })
    await user.click(within(tabel).getAllByRole('row')[1])
    const laci = await screen.findByRole('dialog')
    expect(within(laci).getByRole('heading', { name: 'Anggota keluarga' })).toBeInTheDocument()
    expect((await within(laci).findAllByRole('listitem')).length).toBeGreaterThan(0)
    await user.click(within(laci).getByRole('button', { name: 'Buka profil' }))
    expect(onBukaProfil).toHaveBeenCalledOnce()
  })
  it('Kepala Dusun: tanpa pilihan dusun', async () => {
    masukSebagai(AKUN_UJI.kadus)
    pasang({}, 'kadus')
    await screen.findByRole('grid', { name: 'Daftar penduduk' })
    expect(screen.queryByRole('button', { name: /Semua dusun/ })).not.toBeInTheDocument()
  })
  it('galat jaringan → Coba lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    aturModeJaringan('gagal')
    pasang()
    expect((await screen.findAllByRole('button', { name: 'Coba lagi' })).length).toBeGreaterThan(0)
  })
  it('layar HP: baris bertumpuk', async () => {
    aturLebarLayar(390)
    masukSebagai(AKUN_UJI.operator)
    pasang()
    expect(await screen.findByRole('list', { name: 'Daftar penduduk' })).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })
})

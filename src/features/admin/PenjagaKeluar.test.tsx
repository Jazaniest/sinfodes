import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderDenganRouter } from '@/test/router'
import { PenjagaKeluar } from './PenjagaKeluar'

describe('penjaga keluar halaman (SPEC §6.4)', () => {
  it('ada perubahan → konfirmasi; "Tetap di sini" membatalkan pindah halaman', async () => {
    const { router } = await renderDenganRouter(<PenjagaKeluar aktif />)
    await act(async () => {
      router.history.push('/lain')
    })
    expect(await screen.findByRole('alertdialog', { name: 'Tinggalkan halaman ini?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tetap di sini' }))
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByText('Halaman lain')).not.toBeInTheDocument()
  })
  it('"Tinggalkan" melanjutkan pindah halaman', async () => {
    const { router } = await renderDenganRouter(<PenjagaKeluar aktif />)
    await act(async () => {
      router.history.push('/lain')
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Tinggalkan' }))
    expect(await screen.findByText('Halaman lain')).toBeInTheDocument()
  })
  it('tanpa perubahan → langsung pindah', async () => {
    const { router } = await renderDenganRouter(<PenjagaKeluar aktif={false} />)
    await act(async () => {
      router.history.push('/lain')
    })
    expect(await screen.findByText('Halaman lain')).toBeInTheDocument()
  })
  it('navigasi setelah simpan berhasil (ignoreBlocker) tidak memunculkan dialog (fokus review 5)', async () => {
    const { router } = await renderDenganRouter(<PenjagaKeluar aktif />)
    await act(async () => {
      await router.navigate({ to: '/lain', ignoreBlocker: true } as never)
    })
    expect(await screen.findByText('Halaman lain')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
  it('keterangan bisa disesuaikan halaman', async () => {
    const { router } = await renderDenganRouter(<PenjagaKeluar aktif keterangan="Perubahan isian surat yang belum disimpan akan hilang." />)
    await act(async () => {
      router.history.push('/lain')
    })
    expect(await screen.findByText('Perubahan isian surat yang belum disimpan akan hilang.')).toBeInTheDocument()
  })
})

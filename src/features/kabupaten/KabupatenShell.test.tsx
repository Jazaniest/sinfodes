import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { KabupatenShell } from './KabupatenShell'
import { menuKabupaten } from './navigasi'

it('kerangka dasbor: lambang contoh, nama kabupaten, menu menurut peran, dan Keluar (SPEC-V0.2 §8.3)', async () => {
  const onKeluar = vi.fn()
  render(
    <KabupatenShell sesi={contohSesiKabupaten('kab_rosnani')} jalur="/kabupaten/admin/pemantauan" onKeluar={onKeluar}>
      <p>Isi dasbor</p>
    </KabupatenShell>,
  )
  expect(screen.getByRole('img', { name: 'Lambang contoh' })).toBeInTheDocument()
  expect(screen.getByText('Kabupaten Pelalawan')).toBeInTheDocument()
  const nav = screen.getByRole('navigation', { name: 'Menu kabupaten' })
  // Isi menu diuji di navigasi.test.ts; di sini cukup bahwa kerangka menampilkan menu Peninjau apa adanya (tanpa Pengguna).
  expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(menuKabupaten('peninjau').map((m) => m.label))
  expect(within(nav).queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument()
  expect(within(nav).getByRole('link', { name: 'Pemantauan' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Peninjau')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Hj\. Rosnani/ }))
  await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
  expect(onKeluar).toHaveBeenCalledOnce()
})

it('mode gelap (7E-2): menu akun punya pilihan Tampilan; atribut dilepas saat kerangka dilepas', async () => {
  localStorage.setItem('sinfodes.mode', 'perangkat')
  const { unmount } = render(
    <KabupatenShell sesi={contohSesiKabupaten('kab_rosnani')} jalur="/kabupaten/admin/pemantauan" onKeluar={vi.fn()}>
      <p>Isi dasbor</p>
    </KabupatenShell>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Hj\. Rosnani/ }))
  const kelompok = screen.getByRole('group', { name: 'Tampilan' })
  expect(within(kelompok).getAllByRole('menuitemradio').map((p) => p.textContent)).toEqual(['Terang', 'Gelap', 'Ikuti perangkat'])
  expect(within(kelompok).getByRole('menuitemradio', { name: 'Ikuti perangkat' })).toBeChecked()
  await user.click(within(kelompok).getByRole('menuitemradio', { name: 'Gelap' }))
  expect(document.documentElement).toHaveAttribute('data-mode', 'gelap')
  expect(localStorage.getItem('sinfodes.mode')).toBe('gelap')
  unmount()
  expect(document.documentElement).not.toHaveAttribute('data-mode')
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { KabupatenShell } from './KabupatenShell'

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
  expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Pemantauan'])
  expect(within(nav).getByRole('link', { name: 'Pemantauan' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Peninjau')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Hj\. Rosnani/ }))
  await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
  expect(onKeluar).toHaveBeenCalledOnce()
})

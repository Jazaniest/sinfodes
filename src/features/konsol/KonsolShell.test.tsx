import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { contohSesiKonsol } from '@/test/konsol'
import { KonsolShell } from './KonsolShell'
import { SesiKonsolKonteks } from './sesi-konteks'

function pasang(jalur = '/konsol') {
  const onKeluar = vi.fn()
  const sesi = contohSesiKonsol()
  render(
    <SesiKonsolKonteks value={sesi}>
      <KonsolShell sesi={sesi} jalur={jalur} onKeluar={onKeluar}>
        <p>Isi khusus tim</p>
      </KonsolShell>
    </SesiKonsolKonteks>,
  )
  return { onKeluar, user: userEvent.setup() }
}

describe('kerangka Konsol (SPEC §11, §4.7)', () => {
  it('Tim Sinfodes: sidebar tinta dengan logo di depan; menu Ringkasan dan Desa, aktif juga di halaman di bawahnya', () => {
    pasang('/konsol/desa/desa_sungai_sialang')
    const nav = screen.getByRole('navigation', { name: 'Menu konsol' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Desa'])
    expect(within(nav).getByRole('link', { name: 'Desa' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Ringkasan' })).not.toHaveAttribute('aria-current')
    expect(nav.closest('.bg-tinta')).not.toBeNull()
    expect(screen.getByText('Konsol')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Isi khusus tim')
  })
  it('menu akun: nama, peran, dan Keluar', async () => {
    const { onKeluar, user } = pasang()
    expect(screen.getByText('Tim Sinfodes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Dina/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
    expect(onKeluar).toHaveBeenCalledOnce()
  })
})

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
  it('Tim Sinfodes: sidebar tinta dengan logo di depan; menu Ringkasan, Desa, Kabupaten, dan Tagihan, aktif juga di halaman di bawahnya', () => {
    pasang('/konsol/desa/desa_sungai_sialang')
    const nav = screen.getByRole('navigation', { name: 'Menu konsol' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Desa', 'Kabupaten', 'Tagihan'])
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
  it('mode gelap (7E-2): menu akun punya pilihan Tampilan; sidebar tetap bersisi tinta; atribut dilepas saat dilepas', async () => {
    localStorage.setItem('sinfodes.mode', 'gelap')
    const onKeluar = vi.fn()
    const sesi = contohSesiKonsol()
    const { unmount } = render(
      <SesiKonsolKonteks value={sesi}>
        <KonsolShell sesi={sesi} jalur="/konsol" onKeluar={onKeluar}>
          <p>Isi khusus tim</p>
        </KonsolShell>
      </SesiKonsolKonteks>,
    )
    expect(document.documentElement).toHaveAttribute('data-mode', 'gelap')
    expect(document.querySelector('[data-sisi-konsol]')).not.toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Dina/ }))
    const kelompok = screen.getByRole('group', { name: 'Tampilan' })
    expect(within(kelompok).getByRole('menuitemradio', { name: 'Gelap' })).toBeChecked()
    await user.click(within(kelompok).getByRole('menuitemradio', { name: 'Terang' }))
    expect(document.documentElement).not.toHaveAttribute('data-mode')
    expect(localStorage.getItem('sinfodes.mode')).toBe('terang')
    unmount()
  })
})

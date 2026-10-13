import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PeranKonsol } from '@/domain/konsol/schema'
import { contohSesiKonsol } from '@/test/konsol'
import { KhususTim } from './KhususTim'
import { KonsolShell } from './KonsolShell'
import { SesiKonsolKonteks } from './sesi-konteks'

function pasang(peran: PeranKonsol, jalur = '/konsol') {
  const onKeluar = vi.fn()
  const sesi = contohSesiKonsol(peran)
  render(
    <SesiKonsolKonteks value={sesi}>
      <KonsolShell sesi={sesi} jalur={jalur} onKeluar={onKeluar}>
        <KhususTim>
          <p>Isi khusus tim</p>
        </KhususTim>
      </KonsolShell>
    </SesiKonsolKonteks>,
  )
  return { onKeluar, user: userEvent.setup() }
}

describe('kerangka Konsol (SPEC §11, §4.7)', () => {
  it('Tim Sinfodes: sidebar tinta dengan logo di depan; menu Ringkasan dan Desa, aktif juga di halaman di bawahnya', () => {
    pasang('tim', '/konsol/desa/desa_sungai_sialang')
    const nav = screen.getByRole('navigation', { name: 'Menu konsol' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Desa', 'Pemantauan'])
    expect(within(nav).getByRole('link', { name: 'Desa' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Ringkasan' })).not.toHaveAttribute('aria-current')
    expect(nav.closest('.bg-tinta')).not.toBeNull()
    expect(screen.getByText('Konsol')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Isi khusus tim')
  })
  it('pemantau: tanpa menu Desa, dan halaman khusus tim berganti "Tidak punya akses" (fokus review 1)', () => {
    pasang('pemantau', '/konsol/desa')
    const nav = screen.getByRole('navigation', { name: 'Menu konsol' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Ringkasan', 'Pemantauan'])
    expect(screen.getByRole('heading', { level: 1, name: 'Tidak punya akses' })).toBeInTheDocument()
    expect(screen.queryByText('Isi khusus tim')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Ringkasan' })).toHaveAttribute('href', '/konsol')
  })
  it('menu akun: nama, peran atau wilayah, dan Keluar', async () => {
    const { onKeluar, user } = pasang('pemantau')
    await user.click(screen.getByRole('button', { name: /Dinas PMD Kabupaten Pelalawan/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
    expect(onKeluar).toHaveBeenCalledOnce()
    expect(screen.getByText('Pemantau · Kabupaten Pelalawan')).toBeInTheDocument()
  })
})

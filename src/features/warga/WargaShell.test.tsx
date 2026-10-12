import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contohSesiWarga } from '@/test/sesi'
import { WargaShell } from './WargaShell'

function pasang(jalur: string) {
  return render(
    <WargaShell sesi={contohSesiWarga()} jalur={jalur}>
      <p>Isi halaman</p>
    </WargaShell>,
  )
}

describe('WargaShell (SPEC §4.4, §10)', () => {
  it('kepala berisi nama desa; navigasi bawah berlabel teks dengan menu aktif', () => {
    pasang('/warga/riwayat/srt_contoh')
    expect(screen.getByText('Desa Sungai Sialang')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Menu layanan warga' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Beranda', 'Ajukan', 'Riwayat', 'Akun'])
    expect(within(nav).getByRole('link', { name: 'Riwayat' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('Isi halaman')
  })
  it('Beranda hanya aktif di /warga, tidak di halaman lain', () => {
    pasang('/warga/')
    const nav = screen.getByRole('navigation', { name: 'Menu layanan warga' })
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Akun' })).not.toHaveAttribute('aria-current')
  })
  it('popover pilihan dan dialog (dirender ke body) ikut skala warga; dilepas saat meninggalkan layanan warga', () => {
    const { unmount } = pasang('/warga')
    expect(document.body).toHaveClass('skala-warga')
    unmount()
    expect(document.body).not.toHaveClass('skala-warga')
  })
  it('seluruh kerangka memakai skala warga; navigasi memberi ruang untuk toolbar demo (fokus review 4)', () => {
    const { container } = pasang('/warga')
    expect(container.firstElementChild).toHaveClass('skala-warga')
    expect(screen.getByRole('navigation', { name: 'Menu layanan warga' }).className).toContain('[html[data-demo-toolbar]_&]:pb-14')
    expect(screen.getByRole('main').className).toContain('[html[data-demo-toolbar]_&]:pb-40')
  })
})

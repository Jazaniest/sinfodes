import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IdentitasPublik } from '@/domain/publik/schema'
import { contohIdentitasPublik } from '@/test/publik'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { WebsiteShell } from './WebsiteShell'

function pasang(jalur: string, ubah: Partial<IdentitasPublik> = {}) {
  return render(
    <WebsiteShell identitas={{ ...contohIdentitasPublik(), ...ubah }} jalur={jalur} tanggal="Kamis, 24 September 2026">
      <p>Isi halaman</p>
    </WebsiteShell>,
  )
}

describe('kerangka website desa (SPEC §9)', () => {
  it('kepala warta desa dan menu lengkap SPEC §9; menu aktif juga di halaman di bawahnya', () => {
    pasang('/desa/sungaisialang/kabar/semenisasi-jalan-dusun-iii-capai-70-persen')
    expect(screen.getByRole('banner')).toHaveTextContent('Sungai Sialang')
    expect(screen.getByRole('banner')).toHaveTextContent('Kamis, 24 September 2026')
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Beranda', 'Profil', 'Kabar', 'Transparansi', 'Statistik', 'Potensi', 'Layanan', 'Cek surat',
    ])
    expect(within(nav).getByRole('link', { name: 'Transparansi' })).toHaveAttribute('href', '/desa/sungaisialang/transparansi')
    expect(within(nav).getByRole('link', { name: 'Kabar' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('Isi halaman')
    expect(screen.getByRole('link', { name: 'Langsung ke isi' })).toHaveAttribute('href', '#isi')
  })
  it('Beranda hanya aktif di alamat beranda', () => {
    pasang('/desa/sungaisialang/')
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Kabar' })).not.toHaveAttribute('aria-current')
  })
  it('kaki halaman: alamat, jam layanan, WhatsApp kantor, pengelola, dan kredit foto (SPEC §9)', () => {
    pasang('/desa/sungaisialang')
    const kaki = screen.getByRole('contentinfo')
    expect(kaki).toHaveTextContent('Jalan Lintas Teluk Meranti Km 4, Sungai Sialang')
    expect(kaki).toHaveTextContent('Kecamatan Teluk Meranti, Kabupaten Pelalawan, Riau 28353')
    expect(kaki).toHaveTextContent('Senin-Kamis 08.00-15.00 WIB')
    expect(within(kaki).getByRole('link', { name: /^WhatsApp kantor/ })).toHaveAttribute('href', 'https://wa.me/6281266031140')
    expect(kaki).toHaveTextContent('Dikelola Pemerintah Desa Sungai Sialang · Didukung Sinfodes')
    expect(within(kaki).getByRole('link', { name: 'Kredit foto' })).toHaveAttribute('href', '/desa/sungaisialang/kredit-foto')
  })
  it('wadah memasang variabel kontrak dan memetakan token Register ke variabel itu (SPEC-V0.2 §11.1)', () => {
    const tema = { ...contohIdentitasPublik().tema, warnaUtama: '#2F5D3A', warnaAksen: '#4A6B2F', huruf: 'fraunces' as const, sudut: 'bulat' as const }
    const { container } = pasang('/desa/sungaisialang', { tema })
    const akar = container.querySelector<HTMLElement>('[data-situs]')!
    expect(akar.style.getPropertyValue('--desa-warna-utama')).toBe('#2F5D3A')
    expect(akar.style.getPropertyValue('--desa-warna-aksen')).toBe('#4A6B2F')
    expect(akar.style.getPropertyValue('--desa-sudut')).toBe('10px')
    expect(akar.style.getPropertyValue('--desa-huruf-judul')).toContain('Fraunces')
    expect(akar.style.getPropertyValue('--color-biru')).toBe('var(--desa-warna-utama)')
    expect(akar.style.getPropertyValue('--radius-1')).toBe('var(--desa-sudut)')
    expect(akar).toHaveClass('skala-publik')
    expect(container.querySelector('svg[data-motif="pucuk-rebung"]')).not.toBeNull()
  })
  it('bagian kerangka bernama sesuai kontrak: kepala, menu, isi, kaki', () => {
    const { container } = pasang('/desa/sungaisialang')
    for (const bagian of ['kepala', 'menu', 'isi', 'kaki']) {
      expect(container.querySelector(`[data-bagian="${bagian}"]`), bagian).not.toBeNull()
    }
    expect(container.querySelector('main')).toHaveAttribute('data-bagian', 'isi')
  })
  it('favicon: lambang desa dipasang ke link[rel=icon] dan dipulihkan saat kerangka dilepas', () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.svg">'
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    const { unmount } = pasang('/desa/sungaisialang', { favicon: lambang })
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', lambang)
    unmount()
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  })
  it('logo efektif: logo unggahan, kalau tidak lambang desa, kalau tidak monogram', () => {
    const lambang = `data:image/png;base64,${'B'.repeat(64)}`
    const a = pasang('/desa/sungaisialang', { favicon: lambang })
    expect(a.container.querySelector('header img')).toHaveAttribute('src', lambang)
    a.unmount()
    const logo = `data:image/png;base64,${'C'.repeat(64)}`
    const b = pasang('/desa/sungaisialang', { favicon: lambang, tema: { ...contohIdentitasPublik().tema, logo } })
    expect(b.container.querySelector('header img')).toHaveAttribute('src', logo)
  })
  it('nameplate, menu, dan kaki halaman tidak ikut tercetak; hanya isi halaman (fokus review 5)', () => {
    pasang('/desa/sungaisialang/transparansi')
    expect(screen.getByRole('navigation', { name: 'Menu website desa' }).parentElement).toHaveClass('print:hidden')
    expect(screen.getByRole('contentinfo')).toHaveClass('print:hidden')
    expect(screen.getByRole('main')).toHaveClass('print:p-0')
  })
  it('bentuk kepala dan perlakuan foto mengikuti tema (7E-2)', () => {
    const tema = { ...contohIdentitasPublik().tema, kepala: 'pita' as const, foto: 'penuh' as const }
    const { container } = render(
      <WebsiteShell identitas={{ ...contohIdentitasPublik(), tema }} jalur="/desa/sungaisialang" tanggal="Kamis, 24 September 2026">
        <FotoWarta berkas="/demo/foto/ombak-bono.jpg" alt="" keterangan="Ombak Bono" />
      </WebsiteShell>,
    )
    expect(container.querySelector('header[data-bentuk="pita"] [data-pita]')).not.toBeNull()
    expect(container.querySelector('figure')).toHaveAttribute('data-foto', 'penuh')
    expect(screen.getByRole('navigation', { name: 'Menu website desa' })).toBeInTheDocument()
  })
  it('menu mengikuti identitas.menu; tautan luar dibuka di tab baru dengan penanda (7F-1)', () => {
    const identitas = {
      ...contohIdentitasPublik(),
      menu: [
        { label: 'Beranda', href: '/desa/sungaisialang', luar: false },
        { label: 'Kabar', href: '/desa/sungaisialang/kabar', luar: false },
        { label: 'Situs Kecamatan', href: 'https://kecamatan.example.id', luar: true },
      ],
    }
    render(
      <WebsiteShell identitas={identitas} jalur="/desa/sungaisialang/halaman/sejarah-kampung" tanggal="Kamis, 24 September 2026">
        <p>Isi halaman</p>
      </WebsiteShell>,
    )
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/desa/sungaisialang', '/desa/sungaisialang/kabar', 'https://kecamatan.example.id',
    ])
    const luar = within(nav).getByRole('link', { name: /Situs Kecamatan/ })
    expect(luar).toHaveAttribute('target', '_blank')
    expect(luar).toHaveAttribute('rel', 'noopener noreferrer')
    expect(luar).toHaveTextContent('(membuka situs lain)')
    expect(within(nav).getByRole('link', { name: 'Kabar' })).not.toHaveAttribute('aria-current')
  })
  it('menu aktif juga untuk halaman tambahan di bawahnya (7F-1)', () => {
    const identitas = {
      ...contohIdentitasPublik(),
      menu: [
        { label: 'Beranda', href: '/desa/sungaisialang', luar: false },
        { label: 'Sejarah Kampung', href: '/desa/sungaisialang/halaman/sejarah-kampung', luar: false },
      ],
    }
    render(
      <WebsiteShell identitas={identitas} jalur="/desa/sungaisialang/halaman/sejarah-kampung" tanggal="Kamis, 24 September 2026">
        <p>Isi halaman</p>
      </WebsiteShell>,
    )
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getByRole('link', { name: 'Sejarah Kampung' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
  })
  it('tema bawaan: kepala warta dan foto berbingkai', () => {
    const { container } = render(
      <WebsiteShell identitas={contohIdentitasPublik()} jalur="/desa/sungaisialang" tanggal="Kamis, 24 September 2026">
        <FotoWarta berkas="/demo/foto/ombak-bono.jpg" alt="" keterangan="Ombak Bono" />
      </WebsiteShell>,
    )
    expect(container.querySelector('header[data-bentuk="warta"]')).not.toBeNull()
    expect(container.querySelector('figure')).toHaveAttribute('data-foto', 'bingkai')
  })
  it('website publik tidak pernah memasang mode gelap, walau pilihan tersimpan gelap (fokus review 1)', () => {
    localStorage.setItem('sinfodes.mode', 'gelap')
    const { unmount } = pasang('/desa/sungaisialang')
    expect(document.documentElement).not.toHaveAttribute('data-mode')
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-mode')
  })
  it('kepala ringkas: menu di dalam kepala dan tidak melebar penuh, supaya berada di kanan nama (7E-2)', () => {
    const tema = { ...contohIdentitasPublik().tema, kepala: 'ringkas' as const }
    const { container } = pasang('/desa/sungaisialang', { tema })
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(container.querySelector('header[data-bentuk="ringkas"]')).toContainElement(nav)
    expect(nav).not.toHaveClass('max-w-5xl')
    expect(nav).not.toHaveClass('mx-auto')
  })
})

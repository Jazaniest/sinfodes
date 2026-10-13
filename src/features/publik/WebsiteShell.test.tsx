import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IdentitasPublik } from '@/domain/publik/schema'
import { contohIdentitasPublik } from '@/test/publik'
import { WebsiteShell } from './WebsiteShell'

function pasang(jalur: string, ubah: Partial<IdentitasPublik> = {}) {
  return render(
    <WebsiteShell identitas={{ ...contohIdentitasPublik(), ...ubah }} jalur={jalur} tanggal="Kamis, 24 September 2026">
      <p>Isi halaman</p>
    </WebsiteShell>,
  )
}

describe('kerangka website desa (SPEC §9)', () => {
  it('kepala warta desa dan menu: hanya halaman yang sudah ada, menu aktif juga di halaman di bawahnya', () => {
    pasang('/desa/sungai-sialang/kabar/semenisasi-jalan-dusun-iii-capai-70-persen')
    expect(screen.getByRole('banner')).toHaveTextContent('Sungai Sialang')
    expect(screen.getByRole('banner')).toHaveTextContent('Kamis, 24 September 2026')
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Beranda', 'Kabar', 'Layanan', 'Cek surat'])
    expect(within(nav).getByRole('link', { name: 'Kabar' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('Isi halaman')
    expect(screen.getByRole('link', { name: 'Langsung ke isi' })).toHaveAttribute('href', '#isi')
  })
  it('Beranda hanya aktif di alamat beranda', () => {
    pasang('/desa/sungai-sialang/')
    const nav = screen.getByRole('navigation', { name: 'Menu website desa' })
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Kabar' })).not.toHaveAttribute('aria-current')
  })
  it('kaki halaman: alamat, jam layanan, WhatsApp kantor, pengelola, dan kredit foto (SPEC §9)', () => {
    pasang('/desa/sungai-sialang')
    const kaki = screen.getByRole('contentinfo')
    expect(kaki).toHaveTextContent('Jalan Lintas Teluk Meranti Km 4, Sungai Sialang')
    expect(kaki).toHaveTextContent('Kecamatan Teluk Meranti, Kabupaten Pelalawan, Riau 28353')
    expect(kaki).toHaveTextContent('Senin–Kamis 08.00–15.00 WIB')
    expect(within(kaki).getByRole('link', { name: /^WhatsApp kantor/ })).toHaveAttribute('href', 'https://wa.me/6281266031140')
    expect(kaki).toHaveTextContent('Dikelola Pemerintah Desa Sungai Sialang · Didukung Sinfodes')
    expect(within(kaki).getByRole('link', { name: 'Kredit foto' })).toHaveAttribute('href', '/desa/sungai-sialang/kredit-foto')
  })
  it('aksen desa menggantikan biru Register; skala HP website (SPEC §9, fokus review 5)', () => {
    const { container } = pasang('/desa/sungai-sialang', { aksen: 'hijau-sawit' })
    const akar = container.firstElementChild as HTMLElement
    expect(akar.style.getPropertyValue('--color-biru')).toBe('#2F5D3A')
    expect(akar).toHaveClass('skala-publik')
    expect(container.querySelector('svg[data-motif="pucuk-rebung"] path')).toHaveAttribute('fill', '#2F5D3A')
  })
  it('nameplate, menu, dan kaki halaman tidak ikut tercetak; hanya isi halaman (fokus review 5)', () => {
    pasang('/desa/sungai-sialang/transparansi')
    expect(screen.getByRole('navigation', { name: 'Menu website desa' }).parentElement).toHaveClass('print:hidden')
    expect(screen.getByRole('contentinfo')).toHaveClass('print:hidden')
    expect(screen.getByRole('main')).toHaveClass('print:p-0')
  })
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { aturLebarLayar } from '@/test/layar'
import { contohSesi } from '@/test/sesi'
import { AdminShell } from './AdminShell'
import { ButuhAkses } from './ButuhAkses'
import { SesiAdminKonteks } from './sesi-konteks'

function pasang(peran: Peran, jalur = '/admin') {
  const onCari = vi.fn()
  const onKeluar = vi.fn()
  render(
    <AdminShell sesi={contohSesi(peran)} jalur={jalur} onCari={onCari} onKeluar={onKeluar}>
      <p>Isi halaman</p>
    </AdminShell>,
  )
  return { onCari, onKeluar, user: userEvent.setup() }
}

describe('AdminShell (SPEC §5.2, §5.7)', () => {
  it('identitas desa, menu sesuai peran, menu aktif, dan area utama', () => {
    pasang('operator', '/admin/kependudukan/penduduk/pdk_siti_rahmah')
    expect(screen.getByText('Desa Sungai Sialang')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Menu utama' })
    expect(within(nav).getByRole('link', { name: 'Kependudukan' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('Isi halaman')
  })
  it('Kaur Keuangan tidak melihat menu Kependudukan', () => {
    pasang('kaur-keuangan')
    expect(screen.queryByRole('link', { name: 'Kependudukan' })).not.toBeInTheDocument()
  })
  it('kotak cari memanggil onCari; menu akun berisi Keluar', async () => {
    const { onCari, onKeluar, user } = pasang('operator')
    await user.click(screen.getByRole('button', { name: /Cari NIK, nama, nomor KK/ }))
    expect(onCari).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: /Rosmiati/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Keluar' }))
    expect(onKeluar).toHaveBeenCalledOnce()
  })
  it('layar < 1024px: bar atas dengan tombol Menu yang membuka laci navigasi', async () => {
    aturLebarLayar(390)
    const { user } = pasang('operator')
    expect(screen.queryByRole('navigation', { name: 'Menu utama' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const laci = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(laci).getByRole('link', { name: 'Kependudukan' })).toBeInTheDocument()
  })
  it('menu Notifikasi berangka untuk semua peran (SPEC §5.2)', () => {
    render(
      <AdminShell sesi={contohSesi('kadus')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()} hitungan={{ notifikasi: 3 }}>
        <p>isi</p>
      </AdminShell>,
    )
    expect(screen.getByRole('link', { name: 'Notifikasi, 3 belum dibaca' })).toHaveAttribute('href', '/admin/notifikasi')
  })
  it('menu Pengaturan di bawah garis untuk Operator; lambang unggahan tampil di kepala sidebar (3C)', () => {
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    const sesi = contohSesi('operator')
    const { container } = render(
      <AdminShell sesi={{ ...sesi, desa: { ...sesi.desa, lambang } }} jalur="/admin/pengaturan" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    const lain = screen.getByRole('navigation', { name: 'Menu lain' })
    expect(within(lain).getByRole('link', { name: 'Pengaturan' })).toHaveAttribute('aria-current', 'page')
    expect(container.querySelector(`img[src="${lambang}"]`)).not.toBeNull()
  })
  it('Kepala Dusun tidak melihat menu Pengaturan', () => {
    pasang('kadus')
    expect(screen.queryByRole('link', { name: 'Pengaturan' })).not.toBeInTheDocument()
  })
})

describe('identitas desa di panel (rencana 7E-1 Tugas 6)', () => {
  const sesiDenganAksen = (warnaAksen: string, favicon: string | null = null) => ({ ...contohSesi('operator'), tampilanPanel: { warnaAksen, favicon } })
  const garis = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-garis-aksen]')

  it('sidebar: garis 3 px warna aksen desa di tepi atas, dekoratif', () => {
    const { container } = render(
      <AdminShell sesi={sesiDenganAksen('#4A6B2F')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    const g = garis(container)!
    expect(g).toHaveAttribute('aria-hidden', 'true')
    expect(g).toHaveStyle({ backgroundColor: '#4A6B2F' })
    expect(g.className).toContain('h-[3px]')
    expect(g.closest('aside')).not.toBeNull()
  })
  it('HP: garis aksen ada di bilah atas', () => {
    aturLebarLayar(390)
    const { container } = render(
      <AdminShell sesi={sesiDenganAksen('#9A3B2A')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    expect(garis(container)).toHaveStyle({ backgroundColor: '#9A3B2A' })
    expect(garis(container)!.closest('header')).not.toBeNull()
  })
  it('tanpa data tampilan panel tidak ada garis', () => {
    const { container } = render(
      <AdminShell sesi={{ ...contohSesi('operator'), tampilanPanel: undefined }} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    expect(garis(container)).toBeNull()
  })
  it('favicon lambang desa dipasang saat panel dimuat dan favicon Sinfodes kembali setelah dilepas', () => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">'
    const lambang = `data:image/png;base64,${'A'.repeat(64)}`
    const { unmount } = render(
      <AdminShell sesi={sesiDenganAksen('#1F4E79', lambang)} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', lambang)
    unmount()
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
    document.head.innerHTML = ''
  })
  it('tanpa lambang favicon berupa monogram dari inisial desa', () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.svg">'
    render(
      <AdminShell sesi={sesiDenganAksen('#1F4E79')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    const href = document.head.querySelector('link[rel="icon"]')?.getAttribute('href') ?? ''
    expect(decodeURIComponent(href)).toContain('>SS<')
    document.head.innerHTML = ''
  })
  it('panel tidak memasang variabel desa lain: tombol tetap biru Register (fokus review 5)', () => {
    const { container } = render(
      <AdminShell sesi={sesiDenganAksen('#4A6B2F')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()}>
        <p>isi</p>
      </AdminShell>,
    )
    expect(container.innerHTML).not.toContain('--desa-')
    expect(container.innerHTML).not.toContain('--color-biru')
  })
})

describe('ButuhAkses (SPEC §3.5)', () => {
  it('peran tidak berhak → "Tidak punya akses" dengan tautan kembali', () => {
    render(
      <SesiAdminKonteks value={contohSesi('kaur-keuangan')}>
        <ButuhAkses kemampuan="penduduk.lihat">
          <p>Isi rahasia</p>
        </ButuhAkses>
      </SesiAdminKonteks>,
    )
    expect(screen.getByRole('heading', { name: 'Tidak punya akses' })).toBeInTheDocument()
    expect(screen.getByText(/Kaur Keuangan/)).toBeInTheDocument()
    expect(screen.queryByText('Isi rahasia')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/admin')
  })
  it('peran berhak → isi tampil', () => {
    render(
      <SesiAdminKonteks value={contohSesi('kadus')}>
        <ButuhAkses kemampuan="penduduk.lihat">
          <p>Isi dusun</p>
        </ButuhAkses>
      </SesiAdminKonteks>,
    )
    expect(screen.getByText('Isi dusun')).toBeInTheDocument()
  })
  it('angka di samping menu: yang perlu ditindaklanjuti peran aktif (SPEC §5.2)', () => {
    const { rerender } = render(
      <AdminShell sesi={contohSesi('operator')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()} hitungan={{ surat: 8 }}>
        <p>Isi halaman</p>
      </AdminShell>,
    )
    expect(screen.getByRole('link', { name: 'Layanan Surat, 8 perlu ditindaklanjuti' })).toHaveAttribute('href', '/admin/surat')
    rerender(
      <AdminShell sesi={contohSesi('operator')} jalur="/admin" onCari={vi.fn()} onKeluar={vi.fn()} hitungan={{ surat: 0 }}>
        <p>Isi halaman</p>
      </AdminShell>,
    )
    expect(screen.getByRole('link', { name: 'Layanan Surat' })).toBeInTheDocument()
  })
})

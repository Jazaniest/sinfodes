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

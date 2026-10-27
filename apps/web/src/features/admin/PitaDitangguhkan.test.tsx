import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contohSesi } from '@/test/sesi'
import { AdminShell } from './AdminShell'
import { PitaDitangguhkan } from './PitaDitangguhkan'
import { SesiAdminKonteks } from './sesi-konteks'

function sesiDitangguhkan(peran: Parameters<typeof contohSesi>[0]) {
  const sesi = contohSesi(peran)
  return { ...sesi, desa: { ...sesi.desa, status: 'Ditangguhkan' as const } }
}

describe('desa Ditangguhkan di panel (SPEC-V0.2 §10.5)', () => {
  it('pita menyebut penangguhan dan menautkan Langganan bagi peran yang berhak', () => {
    render(
      <SesiAdminKonteks value={sesiDitangguhkan('kaur-keuangan')}>
        <PitaDitangguhkan />
      </SesiAdminKonteks>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Langganan ditangguhkan, hubungi Sinfodes.')
    expect(screen.getByRole('link', { name: 'Buka Langganan' })).toHaveAttribute('href', '/admin/pengaturan/langganan')
  })
  it('Operator tidak punya akses Langganan, jadi pita tanpa tautan', () => {
    render(
      <SesiAdminKonteks value={sesiDitangguhkan('operator')}>
        <PitaDitangguhkan />
      </SesiAdminKonteks>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Langganan ditangguhkan, hubungi Sinfodes.')
    expect(screen.queryByRole('link', { name: 'Buka Langganan' })).not.toBeInTheDocument()
  })
  it('kerangka: Website Desa dan menu tulis hilang, menu lihat tetap; Pengaturan Sekdes menuju Langganan', () => {
    render(
      <AdminShell sesi={sesiDitangguhkan('sekdes')} jalur="/admin" onCari={() => undefined} onKeluar={() => undefined}>
        <p>Isi</p>
      </AdminShell>,
    )
    expect(screen.queryByRole('link', { name: 'Website Desa' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kependudukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pengaturan' })).toHaveAttribute('href', '/admin/pengaturan/langganan')
  })
})

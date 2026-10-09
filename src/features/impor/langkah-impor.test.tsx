import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { unggahImpor } from '@/api/impor'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { unduhBerkas } from '@/ui/unduh'
import { LangkahCocokkan } from './LangkahCocokkan'
import { LangkahUnggah } from './LangkahUnggah'

vi.mock('@/ui/unduh', () => ({ unduhBerkas: vi.fn() }))

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('Impor langkah 1: unggah (SPEC §6.8)', () => {
  it('Coba dengan file contoh → laporan berkas diteruskan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onTerbaca = vi.fn()
    renderPanel(<LangkahUnggah onTerbaca={onTerbaca} />, contohSesi())
    await userEvent.click(screen.getByRole('button', { name: 'Coba dengan file contoh' }))
    await vi.waitFor(() => expect(onTerbaca).toHaveBeenCalled())
    expect(onTerbaca.mock.calls[0][0]).toMatchObject({ namaBerkas: 'pendataan-rt-teluk-rengas.xlsx' })
  })
  it('Unduh template: CSV satu baris kepala kolom', async () => {
    renderPanel(<LangkahUnggah onTerbaca={vi.fn()} />, contohSesi())
    await userEvent.click(screen.getByRole('button', { name: 'Unduh template' }))
    expect(unduhBerkas).toHaveBeenCalledWith('template-impor-penduduk.csv', expect.stringMatching(/^\uFEFFNIK;Nama lengkap;Jenis kelamin;/))
  })
})

describe('Impor langkah 2: cocokkan kolom', () => {
  it('kolom tak dikenali ditandai; memetakannya mengubah pemetaan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const laporan = await unggahImpor(null)
    const onUbah = vi.fn()
    renderPanel(
      <LangkahCocokkan laporan={laporan} pemetaan={laporan.kolom.map((k) => k.field)} onUbah={onUbah} onKembali={vi.fn()} onLanjut={vi.fn()} />,
      contohSesi(),
    )
    expect(screen.getByText(/17 baris · 16 kolom\. 14 kolom dikenali otomatis; 2 belum dikenali\./)).toBeInTheDocument()
    expect(screen.getAllByText('Belum dikenali')).toHaveLength(2)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Kolom “Gol\. Drh” dipakai sebagai/ }))
    await user.click(await screen.findByRole('option', { name: 'Golongan darah' }))
    expect(onUbah.mock.calls[0][0][14]).toBe('golonganDarah')
    expect(screen.getByRole('button', { name: 'Lanjut ke pemeriksaan' })).toBeEnabled()
  })
  it('kolom wajib hilang → dijelaskan, tidak bisa lanjut', async () => {
    masukSebagai(AKUN_UJI.operator)
    const laporan = await unggahImpor(null)
    const pemetaan = laporan.kolom.map((k) => (k.field === 'nik' ? null : k.field))
    renderPanel(<LangkahCocokkan laporan={laporan} pemetaan={pemetaan} onUbah={vi.fn()} onKembali={vi.fn()} onLanjut={vi.fn()} />, contohSesi())
    expect(screen.getByRole('alert')).toHaveTextContent('Kolom wajib belum ada: NIK.')
    expect(screen.getByRole('button', { name: 'Lanjut ke pemeriksaan' })).toBeDisabled()
  })
})

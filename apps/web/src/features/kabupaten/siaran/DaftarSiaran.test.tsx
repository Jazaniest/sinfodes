import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { DaftarSiaran } from './DaftarSiaran'

pakaiApiTiruan()

function pasang(akun: string = AKUN_KABUPATEN_UJI.admin) {
  masukKabupatenSebagai(akun)
  renderKabupaten(<DaftarSiaran />, contohSesiKabupaten(akun))
}

describe('daftar siaran kabupaten (SPEC-V0.2 §8.4)', () => {
  it('Admin: Tulis siaran, empat baris terbaru dulu dengan sasaran dan angka baca', async () => {
    pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Siaran ke desa' })).toBeInTheDocument()
    expect(screen.getByText('Siaran tidak bisa diubah setelah terkirim, tetapi bisa ditarik.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tulis siaran' })).toHaveAttribute('href', '/kabupaten/admin/siaran/tulis')
    const tabel = await screen.findByRole('table', { name: 'Siaran' })
    expect(within(tabel).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Judul', 'Dikirim', 'Sasaran', 'Dibaca', 'Ditindaklanjuti',
    ])
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(4)
    expect(baris[0]).toHaveTextContent('Pemutakhiran data penerima BLT-DD triwulan IV')
    const rakor = within(tabel).getByRole('link', { name: 'Undangan rapat koordinasi penyaluran Dana Desa tahap II' })
    expect(rakor).toHaveAttribute('href', '/kabupaten/admin/siaran/srn_pll_rakor')
    const barisRakor = rakor.closest('tr')
    expect(barisRakor).toHaveTextContent('Semua desa')
    expect(barisRakor).toHaveTextContent(/\d+ dari 25/)
    expect(baris[0]).toHaveTextContent('2 kecamatan')
    expect(within(tabel).getByText('Perubahan jadwal rapat koordinasi').closest('tr')).toHaveTextContent('Ditarik')
    // Siaran tanpa tindak lanjut: kolom Ditindaklanjuti berisi tanda pisah.
    expect(within(tabel).getByText('Penyesuaian jam pelayanan kantor desa').closest('tr')?.lastElementChild).toHaveTextContent('—')
  })
  it('Peninjau tidak melihat Tulis siaran', async () => {
    pasang(AKUN_KABUPATEN_UJI.peninjau)
    await screen.findByRole('table', { name: 'Siaran' })
    expect(screen.queryByRole('link', { name: 'Tulis siaran' })).not.toBeInTheDocument()
  })
})

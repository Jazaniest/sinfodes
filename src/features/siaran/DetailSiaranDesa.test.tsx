import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailSiaranDesa } from './DetailSiaranDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const AKUN: Partial<Record<Peran, string>> = { operator: AKUN_UJI.operator, sekdes: AKUN_UJI.sekdes, kades: AKUN_UJI.kades }

function pasang(id: string, peran: Peran = 'kades') {
  masukSebagai(AKUN[peran] ?? AKUN_UJI.operator)
  renderPanel(
    <>
      <DetailSiaranDesa id={id} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}
const bacaSs = (id: string) => ambilDb().bacaSiaran.find((b) => b.siaranId === id && b.desaId === 'desa_sungai_sialang')

describe('detail siaran di panel desa (SPEC-V0.2 §8.4 Di panel desa)', () => {
  it('Kades membuka BLT: tercatat dibaca olehnya; isi dan kotak tindak lanjut tampil', async () => {
    pasang('srn_pll_blt')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pemutakhiran data penerima BLT-DD triwulan IV' })).toBeInTheDocument()
    expect(screen.getByText('Dari Kabupaten Pelalawan · 21 September 2026 pukul 08.30')).toBeInTheDocument()
    expect(await screen.findByText('Dibuka pertama oleh H. Muhammad Nasir, 24 September 2026 pukul 09.00.')).toBeInTheDocument()
    expect(bacaSs('srn_pll_blt')?.dibaca.oleh.id).toBe('pgn_nasir')
    expect(screen.getByRole('article', { name: 'Isi siaran' })).toHaveTextContent('BLT Dana Desa triwulan IV')
    expect(screen.getByText('Perlu tindak lanjut sampai 5 Oktober 2026')).toBeInTheDocument()
  })
  it('Kades menandai tindak lanjut dengan catatan', async () => {
    const user = pasang('srn_pll_blt')
    await user.click(await screen.findByRole('button', { name: 'Tandai sudah ditindaklanjuti' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tandai sudah ditindaklanjuti' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Catatan (opsional)' }), 'Data 12 KK sudah diperbarui.')
    await user.click(within(dialog).getByRole('button', { name: 'Tandai' }))
    expect(await screen.findByText('Siaran ditandai sudah ditindaklanjuti.')).toBeInTheDocument()
    expect(await screen.findByText('Sudah ditindaklanjuti 24 September 2026 oleh H. Muhammad Nasir.')).toBeInTheDocument()
    expect(screen.getByText('Data 12 KK sudah diperbarui.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai sudah ditindaklanjuti' })).not.toBeInTheDocument()
  })
  it('Operator tidak melihat tombol, hanya keterangan siapa yang menandai', async () => {
    pasang('srn_pll_blt', 'operator')
    expect(await screen.findByText('Kepala Desa atau Sekretaris Desa menandai tindak lanjut.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai sudah ditindaklanjuti' })).not.toBeInTheDocument()
  })
  it('siaran ditarik: banner tanpa isi', async () => {
    pasang('srn_pll_ralat', 'sekdes')
    expect(await screen.findByText('Ditarik oleh kabupaten pada 14 September 2026. Isi siaran tidak ditampilkan lagi.')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Isi siaran' })).not.toBeInTheDocument()
  })
  it('ditarik saat sedang dibuka: Tandai ditolak, lalu banner ditarik tampil (fokus review 3)', async () => {
    const user = pasang('srn_pll_blt', 'sekdes')
    await user.click(await screen.findByRole('button', { name: 'Tandai sudah ditindaklanjuti' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tandai sudah ditindaklanjuti' })
    ubahDb((d) => {
      const s = d.siaran.find((x) => x.id === 'srn_pll_blt')
      if (s) s.ditarik = { pada: '2026-09-24T08:55:00+07:00', oleh: { id: 'kab_fajar', nama: 'Fajar Ramadhan' } }
    })
    await user.click(within(dialog).getByRole('button', { name: 'Tandai' }))
    expect(await screen.findByText('Siaran sudah ditarik oleh kabupaten.')).toBeInTheDocument()
    expect(await screen.findByText(/^Ditarik oleh kabupaten pada 24 September 2026\./)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('isi ber-markup tampil sebagai teks (fokus review 1)', async () => {
    ubahDb((d) => {
      const s = d.siaran.find((x) => x.id === 'srn_pll_blt')
      if (s) s.isi = '<img src=x onerror="alert(1)">Rapat'
    })
    pasang('srn_pll_blt')
    const artikel = await screen.findByRole('article', { name: 'Isi siaran' })
    expect(artikel).toHaveTextContent('<img src=x onerror="alert(1)">Rapat')
    expect(artikel.querySelector('img')).toBeNull()
  })
  it('siaran di luar sasaran desa: tidak ditemukan', async () => {
    pasang('srn_siak_rakor')
    expect(await screen.findByText('Siaran tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Siaran kabupaten' })).toHaveAttribute('href', '/admin/siaran')
  })
})

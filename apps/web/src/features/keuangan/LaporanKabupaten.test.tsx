import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Keuangan } from './Keuangan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const AKUN: Partial<Record<Peran, string>> = { operator: AKUN_UJI.operator, 'kaur-keuangan': AKUN_UJI.kaurKeuangan }

function pasang(peran: Peran) {
  masukSebagai(AKUN[peran] ?? AKUN_UJI.operator)
  renderPanel(
    <>
      <Keuangan sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}
const bagian = () => screen.findByRole('region', { name: 'Laporan ke Kabupaten Pelalawan' })

describe('Laporan ke kabupaten di halaman Keuangan (SPEC-V0.2 §8.3 butir 4)', () => {
  it('Operator melihat status tanpa tombol menandai', async () => {
    pasang('operator')
    const b = await bagian()
    expect(b).toHaveAttribute('id', 'laporan-kabupaten')
    const baris = within(b).getAllByRole('listitem')
    expect(baris).toHaveLength(3)
    expect(baris[0]).toHaveTextContent('Laporan realisasi Dana Desa tahap II 2026')
    expect(baris[0]).toHaveTextContent('30 September 2026 · 6 hari lagi')
    expect(baris[0]).toHaveTextContent('Belum dikirim')
    expect(baris[2]).toHaveTextContent('Sudah dikirim 26 Juli 2026 oleh Nurhayati')
    expect(within(b).queryByRole('button', { name: 'Tandai sudah dikirim' })).not.toBeInTheDocument()
  })
  it('Kaur Keuangan menandai dengan tanggal bawaan hari ini, lalu bisa membatalkan', async () => {
    const user = pasang('kaur-keuangan')
    const b = await bagian()
    await user.click(within(b).getAllByRole('button', { name: 'Tandai sudah dikirim' })[0])
    const dialog = await screen.findByRole('dialog', { name: 'Tandai sudah dikirim' })
    expect(dialog).toHaveTextContent('Laporan realisasi Dana Desa tahap II 2026')
    expect(within(within(dialog).getByRole('group', { name: /Tanggal dikirim/ })).getAllByRole('spinbutton').map((s) => s.textContent)).toEqual([
      '24', '09', '2026',
    ])
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Ditandai sudah dikirim ke kabupaten.')).toBeInTheDocument()
    const baris = (await within(b).findAllByRole('listitem'))[0]
    expect(await within(baris).findByText('Sudah dikirim 24 September 2026 oleh Nurhayati')).toBeInTheDocument()
    await user.click(within(baris).getByRole('button', { name: 'Batalkan tanda' }))
    expect(await within(baris).findByText('Belum dikirim')).toBeInTheDocument()
  })
  it('tetap tampil walaupun APBDes tahun ini belum tersedia', async () => {
    ubahDb((d) => {
      d.apbdes = []
    })
    pasang('operator')
    expect(await screen.findByText('APBDes tahun ini belum tersedia')).toBeInTheDocument()
    expect(await bagian()).toBeInTheDocument()
  })
})

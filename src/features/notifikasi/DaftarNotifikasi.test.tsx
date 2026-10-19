import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-aria-components'
import { describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarNotifikasi } from './DaftarNotifikasi'

pakaiApiTiruan({ dbSegarTiapUji: true })

function pasang(peran: Peran = 'operator') {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  const navigate = vi.fn()
  renderPanel(
    <RouterProvider navigate={navigate}>
      <DaftarNotifikasi sekarang={SEKARANG_UJI} />
    </RouterProvider>,
    contohSesi(peran),
  )
  return { navigate, user: userEvent.setup() }
}
const belumDibaca = (penggunaId: string) => ambilDb().notifikasi.filter((n) => n.penggunaId === penggunaId && !n.dibaca)

describe('Notifikasi (SPEC §5.5)', () => {
  it('per hari, yang belum dibaca ditandai, dengan jumlahnya', async () => {
    pasang()
    expect(await screen.findByText('3 belum dibaca')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /\(belum dibaca\)/ })).toHaveLength(3)
  })
  it('membuka notifikasi: menuju rujukannya dan ditandai dibaca', async () => {
    const { navigate, user } = pasang()
    await screen.findByText('3 belum dibaca')
    const [pertama] = screen.getAllByRole('link', { name: /\(belum dibaca\)/ })
    const tujuan = pertama.getAttribute('href')
    await user.click(pertama)
    expect(navigate.mock.calls[0]?.[0]).toBe(tujuan)
    expect(await screen.findByText('2 belum dibaca')).toBeInTheDocument()
    expect(belumDibaca('pgn_rosmiati')).toHaveLength(2)
  })
  it('Tandai semua sudah dibaca', async () => {
    const { user } = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tandai semua sudah dibaca' }))
    expect(await screen.findByText('Semua sudah dibaca')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai semua sudah dibaca' })).not.toBeInTheDocument()
    expect(belumDibaca('pgn_rosmiati')).toHaveLength(0)
  })
  it('Kepala Desa: pengumuman tanpa tautan bisa ditandai dibaca sendiri', async () => {
    // Tanpa tenggat laporan, supaya pengumuman ini satu-satunya yang belum dibaca Kades (pengingat tenggat diuji di 7B-2).
    ubahDb((d) => {
      d.tenggatLaporan = []
    })
    const { user } = pasang('kades')
    const daftar = await screen.findByRole('list', { name: /^Notifikasi / })
    expect(within(daftar).getByText('Baru di Sinfodes: surat dari loket dan tumpukan tanda tangan')).toBeInTheDocument()
    await user.click(within(daftar).getByRole('button', { name: 'Tandai dibaca' }))
    await waitFor(() => expect(belumDibaca('pgn_nasir')).toHaveLength(0))
    expect(await screen.findByText('Semua sudah dibaca')).toBeInTheDocument()
  })
})

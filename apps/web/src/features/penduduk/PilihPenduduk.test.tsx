import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { FilterPenduduk } from '@/domain/penduduk/filter'
import type { Penduduk } from '@/domain/penduduk/schema'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { PilihPenduduk } from './PilihPenduduk'

pakaiApiTiruan()

function Uji({ onPilih, filter }: { onPilih: (p: Penduduk | null) => void; filter?: Partial<FilterPenduduk> }) {
  const [terpilih, setTerpilih] = useState<Penduduk | null>(null)
  return (
    <PilihPenduduk
      label="Ibu"
      terpilih={terpilih}
      onPilih={(p) => {
        setTerpilih(p)
        onPilih(p)
      }}
      filter={filter}
      hariIni={SEKARANG_UJI}
    />
  )
}

describe('PilihPenduduk', () => {
  it('cari nama → pilih → data penduduk lengkap', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onPilih = vi.fn()
    renderPanel(<Uji onPilih={onPilih} />, contohSesi())
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('Siti Rahmah')
    await user.click(await screen.findByRole('option', { name: 'Siti Rahmah', description: /140509 520391 8002/ }))
    expect(onPilih).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'pdk_siti_rahmah', keluargaId: 'kk_syahrial' }))
  })
  it('NIK dicari lewat POST dan tidak pernah masuk URL', async () => {
    masukSebagai(AKUN_UJI.operator)
    const permintaan: string[] = []
    serverUji.events.on('request:start', ({ request }) => {
      permintaan.push(`${request.method} ${request.url}`)
    })
    renderPanel(<Uji onPilih={vi.fn()} />, contohSesi())
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('1405095203918002')
    expect(await screen.findByRole('option', { name: /Siti Rahmah/ })).toBeInTheDocument()
    expect(permintaan.some((p) => p.startsWith('POST') && p.endsWith('/api/v1/penduduk/cari'))).toBe(true)
    expect(permintaan.every((p) => !p.includes('1405095203918002'))).toBe(true)
  })
  it('filter tambahan: memilih ibu tidak menampilkan laki-laki', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Uji onPilih={vi.fn()} filter={{ jk: 'P' }} />, contohSesi())
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('Syahrial')
    expect(await screen.findByText('Tidak ada penduduk yang cocok.')).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import type { OpsiKeluarga } from './opsi-keluarga'
import { PilihKeluarga } from './PilihKeluarga'

pakaiApiTiruan()

function Uji({ onPilih }: { onPilih: (k: OpsiKeluarga | null) => void }) {
  const [terpilih, setTerpilih] = useState<OpsiKeluarga | null>(null)
  return (
    <PilihKeluarga
      label="Pilih KK"
      terpilih={terpilih}
      onPilih={(k) => {
        setTerpilih(k)
        onPilih(k)
      }}
    />
  )
}

describe('PilihKeluarga', () => {
  it('nomor KK → KK Syahrial lengkap dengan alamat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onPilih = vi.fn()
    renderPanel(<Uji onPilih={onPilih} />, contohSesi())
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Pilih KK' }))
    await user.paste('1405092011238004')
    await user.click(await screen.findByRole('option', { name: 'KK Syahrial', description: /Dusun I · RT 004\/RW 002/ }))
    expect(onPilih).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'kk_syahrial', nomorKk: '1405092011238004', dusunId: 'dsn_ss_1', rw: '002', rt: '004' }),
    )
    expect(screen.getByRole('combobox', { name: 'Pilih KK' })).toHaveValue('KK Syahrial')
  })
})

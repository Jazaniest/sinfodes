import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilTokenSesi } from '@/api/client'
import { kunciPenduduk, opsiDaftarPenduduk } from '@/api/penduduk'
import { kunciSesi } from '@/api/sesi'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { masukDemo } from './masuk-demo'
import { PilihPeranDemo, type AkunDemo } from './PilihPeranDemo'

pakaiApiTiruan()

const AKUN: AkunDemo[] = [
  { id: 'pgn_rosmiati', nama: 'Rosmiati', peran: 'operator', email: 'rosmiati@sungaisialang.desa.id' },
  { id: 'pgn_sukardi', nama: 'Sukardi', peran: 'kadus', email: 'sukardi@sungaisialang.desa.id' },
]

describe('ganti peran demo (SPEC §3.6)', () => {
  it('masukDemo: token baru dan data peran lama dibuang (fokus review 2)', async () => {
    const queryClient = new QueryClient()
    masukSebagai(AKUN_UJI.operator)
    await queryClient.fetchQuery(opsiDaftarPenduduk({}))
    expect(queryClient.getQueryData(kunciPenduduk.daftar({}))).toBeDefined()
    const sesi = await masukDemo('sukardi@sungaisialang.desa.id', 'demo', queryClient)
    expect(sesi.pengguna.peran).toBe('kadus')
    expect(ambilTokenSesi()).toBe('demo.pgn_sukardi')
    expect(queryClient.getQueryData(kunciPenduduk.daftar({}))).toBeUndefined()
    // Sesi baru sudah di cache: penjaga rute langsung memakainya tanpa menunggu API (kerangka berganti lebih dulu).
    expect(queryClient.getQueryData(kunciSesi)).toEqual(sesi)
  })
  it('pilihan peran menampilkan akun aktif dan memanggil onPilih', async () => {
    const onPilih = vi.fn()
    render(<PilihPeranDemo akun={AKUN} aktifId="pgn_rosmiati" sibuk={false} onPilih={onPilih} />)
    const pilihan = screen.getByLabelText('Peran')
    expect(pilihan).toHaveValue('pgn_rosmiati')
    await userEvent.selectOptions(pilihan, 'pgn_sukardi')
    expect(onPilih).toHaveBeenCalledWith(AKUN[1])
  })
})

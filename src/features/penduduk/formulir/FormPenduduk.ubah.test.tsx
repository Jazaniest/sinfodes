import { screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilPenduduk, ambilRiwayatPenduduk } from '@/api/penduduk'
import type { Penduduk } from '@/domain/penduduk/schema'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import type { OpsiKeluarga } from '../../keluarga/opsi-keluarga'
import { FormPenduduk } from './FormPenduduk'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => localStorage.clear())

const KK_SYAHRIAL: OpsiKeluarga = {
  id: 'kk_syahrial', nomorKk: '1405092011238004', namaKepala: 'Syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', jumlahAnggota: 4,
}

async function pasang(id: string) {
  masukSebagai(AKUN_UJI.operator)
  const penduduk: Penduduk = await ambilPenduduk(id)
  const onTersimpan = vi.fn()
  renderPanel(
    <FormPenduduk mode={{ jenis: 'ubah', penduduk, keluarga: KK_SYAHRIAL }} onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />,
    contohSesi(),
  )
  return { penduduk, onTersimpan, user: userEvent.setup() }
}

async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

describe('Formulir ubah penduduk (SPEC §6.4)', { timeout: 15_000 }, () => {
  it('terisi data lama; perubahan pekerjaan tersimpan dan tercatat di Riwayat', async () => {
    const { user, onTersimpan } = await pasang('pdk_siti_rahmah')
    expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toHaveValue('Siti Rahmah')
    expect(screen.queryByRole('button', { name: 'Simpan & tambah lagi' })).not.toBeInTheDocument()
    await pilih(user, /Pekerjaan/, 'Wiraswasta')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0].pekerjaan).toBe('Wiraswasta')
    const [terbaru] = await ambilRiwayatPenduduk('pdk_siti_rahmah')
    expect(terbaru).toMatchObject({ field: 'pekerjaan', nilaiBaru: 'Wiraswasta' })
  })
  it('NIK sendiri tidak dicek ulang dan tidak dianggap ganda (fokus review 4)', async () => {
    const permintaan: string[] = []
    serverUji.events.on('request:start', ({ request }) => {
      permintaan.push(request.url)
    })
    const { user } = await pasang('pdk_siti_rahmah')
    await user.click(screen.getByRole('textbox', { name: 'NIK' }))
    await user.tab()
    await new Promise((r) => setTimeout(r, 200))
    expect(permintaan.some((u) => u.endsWith('/penduduk/cek-nik'))).toBe(false)
    expect(screen.queryByText(/sudah terdaftar/)).not.toBeInTheDocument()
  })
  it('tanpa perubahan → tidak memanggil API, langsung kembali ke profil', async () => {
    const { user, onTersimpan, penduduk } = await pasang('pdk_siti_rahmah')
    const riwayatSebelum = ambilDb().riwayat.length
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalledWith(penduduk, 'profil'))
    expect(ambilDb().riwayat.length).toBe(riwayatSebelum)
  })
  it('kepala keluarga: hubungan tidak bisa diubah di sini', async () => {
    await pasang('pdk_syahrial')
    expect(screen.getByRole('button', { name: /Hubungan dalam keluarga/ })).toBeDisabled()
    expect(screen.getByText('Kepala keluarga diganti lewat halaman KK.')).toBeInTheDocument()
  })
})

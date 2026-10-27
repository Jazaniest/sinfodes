import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilKeluarga } from '@/api/keluarga'
import { ambilPenduduk } from '@/api/penduduk'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { CatatLahir } from './CatatLahir'
import { CatatMeninggal } from './CatatMeninggal'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function isi(user: UserEvent, label: string, teks: string) {
  await user.click(screen.getByRole('textbox', { name: label }))
  await user.paste(teks)
}
async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}
async function ketikJam(user: UserEvent, label: string, digit: string) {
  await user.click(within(screen.getByRole('group', { name: label })).getAllByRole('spinbutton')[0])
  await user.keyboard(digit)
}

describe('Alur mutasi (SPEC §6.6)', { timeout: 20_000 }, () => {
  it('kelahiran: pilih ibu → saran ayah dan anak ke-, isi data bayi, tersimpan tanpa NIK di KK ibu', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onTersimpan = vi.fn()
    renderPanel(<CatatLahir onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Ibu' }))
    await user.paste('Siti Rahmah')
    await user.click(await screen.findByRole('option', { name: 'Siti Rahmah', description: /140509 520391 8002/ }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ayah' })).toHaveValue('Syahrial'))
    expect(screen.getByRole('textbox', { name: 'Anak ke-' })).toHaveValue('3')
    await isi(user, 'Nama bayi', 'Aisyah Putri')
    await user.click(screen.getByRole('radio', { name: 'Perempuan' }))
    await pilih(user, /Tempat dilahirkan/, 'Puskesmas')
    await ketikJam(user, 'Jam lahir', '0415')
    await pilih(user, /Penolong kelahiran/, 'Bidan/Perawat')
    await isi(user, 'Berat', '3100')
    await isi(user, 'Panjang', '49')
    await isi(user, 'Nama pelapor', 'Syahrial')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0]).toMatchObject({
      nik: null, nama: 'Aisyah Putri', keluargaId: 'kk_syahrial', namaAyah: 'Syahrial', hubunganKeluarga: 'Anak',
    })
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(5)
  })
  it('kematian kepala keluarga: pengganti wajib dipilih, lalu status Meninggal (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const syahrial = await ambilPenduduk('pdk_syahrial')
    const onTersimpan = vi.fn()
    renderPanel(
      <CatatMeninggal pendudukAwal={syahrial} onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />,
      contohSesi(),
    )
    const user = userEvent.setup()
    expect(await screen.findByRole('radiogroup', { name: 'Kepala keluarga pengganti' })).toBeInTheDocument()
    await ketikJam(user, 'Jam meninggal', '2140')
    await isi(user, 'Tempat meninggal', 'Rumah')
    await pilih(user, /Sebab kematian/, 'Sakit biasa/tua')
    await pilih(user, /Yang menerangkan/, 'Tenaga kesehatan')
    await isi(user, 'Nama pelapor', 'Siti Rahmah')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Pilih kepala keluarga pengganti')).toBeInTheDocument()
    expect(onTersimpan).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: /Siti Rahmah/ }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0]).toMatchObject({ id: 'pdk_syahrial', statusDasar: 'Meninggal' })
    expect((await ambilKeluarga('kk_syahrial')).keluarga.kepalaKeluargaId).toBe('pdk_siti_rahmah')
  })
  it('kematian anggota biasa: tanpa pilihan pengganti', async () => {
    masukSebagai(AKUN_UJI.operator)
    const nurAini = await ambilPenduduk('pdk_nur_aini')
    renderPanel(<CatatMeninggal pendudukAwal={nurAini} onTersimpan={vi.fn()} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('combobox', { name: 'Penduduk yang meninggal' })).toHaveValue('Nur Aini')
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByRole('radiogroup', { name: 'Kepala keluarga pengganti' })).not.toBeInTheDocument()
  })
})

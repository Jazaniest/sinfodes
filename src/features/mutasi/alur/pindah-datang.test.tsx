import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilPenduduk, ambilRingkasanPenduduk } from '@/api/penduduk'
import { buatNik } from '@/domain/penduduk/nik'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { CatatDatang } from './CatatDatang'
import { CatatPindah } from './CatatPindah'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function isiDi(user: UserEvent, akar: HTMLElement, label: string, teks: string) {
  await user.click(within(akar).getByRole('textbox', { name: label }))
  await user.paste(teks)
}
async function pilihDi(user: UserEvent, akar: HTMLElement, label: RegExp, opsi: string) {
  await user.click(within(akar).getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

describe('Alur pindah dan datang (SPEC §6.6)', { timeout: 25_000 }, () => {
  it('pindah seluruh anggota KK: tanpa pengganti; KK tidak lagi dihitung (fokus review 3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const siti = await ambilPenduduk('pdk_siti_rahmah')
    const onTersimpan = vi.fn()
    renderPanel(<CatatPindah pendudukAwal={siti} onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    const badan = document.body
    await user.click(await screen.findByRole('radio', { name: 'Seluruh anggota KK (4 orang)' }))
    expect(screen.queryByRole('radiogroup', { name: 'Kepala keluarga pengganti' })).not.toBeInTheDocument()
    await isiDi(user, badan, 'Provinsi', 'Riau')
    await isiDi(user, badan, 'Kabupaten/kota', 'Kota Pekanbaru')
    await isiDi(user, badan, 'Kecamatan', 'Tampan')
    await isiDi(user, badan, 'Desa/kelurahan', 'Simpang Baru')
    await pilihDi(user, badan, /Alasan pindah/, 'Pekerjaan')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0]).toHaveLength(4)
    expect((await ambilRingkasanPenduduk()).kk).toBe(805)
  })
  it('kepala keluarga pindah sendiri → pilihan pengganti muncul', async () => {
    masukSebagai(AKUN_UJI.operator)
    const syahrial = await ambilPenduduk('pdk_syahrial')
    renderPanel(<CatatPindah pendudukAwal={syahrial} onTersimpan={vi.fn()} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('radiogroup', { name: 'Kepala keluarga pengganti' })).toBeInTheDocument()
  })
  it('kedatangan dua orang ke KK baru dengan NIK asal', async () => {
    masukSebagai(AKUN_UJI.operator)
    const onTersimpan = vi.fn()
    renderPanel(<CatatDatang onTersimpan={onTersimpan} onBatal={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesi())
    const user = userEvent.setup()
    const badan = document.body
    await isiDi(user, badan, 'Nomor SKPWNI', '3310/SKPWNI/2026/0042')
    await isiDi(user, badan, 'Provinsi', 'Jawa Tengah')
    await isiDi(user, badan, 'Kabupaten/kota', 'Klaten')
    await isiDi(user, badan, 'Kecamatan', 'Wedi')
    await isiDi(user, badan, 'Desa/kelurahan', 'Pandes')
    await user.click(screen.getByRole('radio', { name: 'Buat KK baru' }))
    await pilihDi(user, badan, /Dusun/, 'Dusun III Teluk Rengas')
    await pilihDi(user, badan, /RW/, '005')
    await pilihDi(user, badan, /RT/, '012')

    const satu = screen.getByRole('group', { name: 'Anggota 1' })
    await isiDi(user, satu, 'NIK', buatNik({ kodeWilayah: '331001', tanggalLahir: '1988-05-12', jenisKelamin: 'L', nomorUrut: 9871 }))
    await user.tab()
    await isiDi(user, satu, 'Nama lengkap', 'Sutrisno')
    await isiDi(user, satu, 'Tempat lahir', 'Klaten')
    await pilihDi(user, satu, /Agama/, 'Islam')

    await user.click(screen.getByRole('button', { name: 'Tambah anggota' }))
    const dua = screen.getByRole('group', { name: 'Anggota 2' })
    await isiDi(user, dua, 'NIK', buatNik({ kodeWilayah: '331001', tanggalLahir: '1990-07-03', jenisKelamin: 'P', nomorUrut: 9872 }))
    await user.tab()
    await isiDi(user, dua, 'Nama lengkap', 'Suparmi')
    await isiDi(user, dua, 'Tempat lahir', 'Klaten')
    await pilihDi(user, dua, /Agama/, 'Islam')
    await pilihDi(user, dua, /Hubungan dalam keluarga/, 'Istri')

    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0].penduduk.map((p: { nama: string }) => p.nama)).toEqual(['Sutrisno', 'Suparmi'])
    expect((await ambilRingkasanPenduduk()).kk).toBe(807)
  })
})

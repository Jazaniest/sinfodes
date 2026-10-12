import { screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { pakaiBerkasNode } from '@/test/berkas-node'
import { renderWarga } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { FormLaporan } from './FormLaporan'

pakaiApiTiruan({ dbSegarTiapUji: true })
pakaiBerkasNode()
afterEach(() => kosongkanToast())

const kecilkan = async (f: File) => new File([new Uint8Array(150 * 1024)], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })

function pasang(anggotaAwal?: string) {
  masukSebagaiWarga(AKUN_WARGA_UJI.siti)
  const onTerkirim = vi.fn()
  renderWarga(
    <>
      <FormLaporan anggotaAwal={anggotaAwal} onTerkirim={onTerkirim} kecilkan={kecilkan} />
      <PenampungToast />
    </>,
  )
  return { onTerkirim, user: userEvent.setup({ applyAccept: false }) }
}

async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

describe('Laporkan data yang salah (SPEC §10)', () => {
  it('pilih data dan nilai yang benar dari daftar; foto dokumen opsional → laporan terkirim', async () => {
    const { onTerkirim, user } = pasang('pdk_nur_aini')
    expect(await screen.findByRole('heading', { level: 1, name: 'Laporkan data yang salah' })).toBeInTheDocument()
    await pilih(user, /Data yang salah$/, 'Golongan darah')
    expect(screen.getByText('Tercatat sekarang: Tidak Tahu')).toBeInTheDocument()
    await pilih(user, /Seharusnya$/, 'A')
    const input = screen.getByRole('group', { name: 'Foto dokumen (tidak wajib)' }).querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('Input foto tidak ada')
    await user.upload(input, new File([new Uint8Array(2000 * 1024)], 'kartu.png', { type: 'image/png' }))
    await screen.findByText('kartu.jpg')
    await user.click(screen.getByRole('button', { name: 'Kirim laporan' }))
    expect(await screen.findByText('Laporan terkirim. Kantor desa akan memeriksanya.')).toBeInTheDocument()
    expect(onTerkirim).toHaveBeenCalledTimes(1)
    const l = ambilDb().laporanData.find((x) => x.isi.jenis === 'perbaikan' && x.isi.pendudukId === 'pdk_nur_aini')
    expect(l).toMatchObject({ isi: { field: 'golonganDarah', nilaiBaru: 'A' }, lampiran: { berkas: 'kartu.jpg' } })
  })
  it('nilai yang sama dengan data sekarang ditandai sebelum dikirim (fokus review 5)', async () => {
    const { onTerkirim, user } = pasang()
    await screen.findByRole('heading', { level: 1, name: 'Laporkan data yang salah' })
    await pilih(user, /Data yang salah$/, 'Agama')
    await pilih(user, /Seharusnya$/, 'Islam')
    await user.click(screen.getByRole('button', { name: 'Kirim laporan' }))
    expect(screen.getByText('Nilai ini sama dengan agama yang tercatat sekarang.')).toBeInTheDocument()
    expect(onTerkirim).not.toHaveBeenCalled()
  })
  it('laporan kedua untuk data yang masih ditinjau ditolak dengan pesan jelas, tanpa Kirim ulang (fokus review 5)', async () => {
    const { onTerkirim, user } = pasang('pdk_syahrial')
    await screen.findByRole('heading', { level: 1, name: 'Laporkan data yang salah' })
    await pilih(user, /Data yang salah$/, 'Pekerjaan')
    await pilih(user, /Seharusnya$/, 'Pedagang')
    await user.click(screen.getByRole('button', { name: 'Kirim laporan' }))
    expect(await screen.findByText('Laporan untuk data ini masih ditinjau kantor desa.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kirim ulang' })).not.toBeInTheDocument()
    expect(onTerkirim).not.toHaveBeenCalled()
  })
  it('kirim gagal: isian tetap, Kirim ulang berhasil (fokus review 1)', async () => {
    const { onTerkirim, user } = pasang('pdk_nur_aini')
    await screen.findByRole('heading', { level: 1, name: 'Laporkan data yang salah' })
    await pilih(user, /Data yang salah$/, 'Golongan darah')
    await pilih(user, /Seharusnya$/, 'B')
    aturModeJaringan('gagal')
    await user.click(screen.getByRole('button', { name: 'Kirim laporan' }))
    expect(await screen.findByText('Laporan belum terkirim')).toBeInTheDocument()
    aturModeJaringan('instan')
    await user.click(screen.getByRole('button', { name: 'Kirim ulang' }))
    await vi.waitFor(() => expect(onTerkirim).toHaveBeenCalledTimes(1))
  })
})

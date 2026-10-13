import { screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TambahDesa } from './TambahDesa'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  const onSelesai = vi.fn()
  renderKonsol(
    <>
      <TambahDesa onSelesai={onSelesai} onBatal={() => {}} />
      <PenampungToast />
    </>,
  )
  return { onSelesai, user: userEvent.setup() }
}

// Nama tombol Select adalah "nilai label", jadi regexnya diakhiri label.
async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

async function isiWilayah(user: UserEvent, kabupaten: string, kecamatan: string) {
  await pilih(user, /Provinsi$/, 'Riau')
  await pilih(user, /Kabupaten\/kota$/, kabupaten)
  await pilih(user, /Kecamatan$/, kecamatan)
}

describe('Tambah desa (SPEC §11)', () => {
  it('wilayah bertingkat lalu simpan: desa berstatus Persiapan dan konfirmasi "Undangan terkirim"', async () => {
    const { onSelesai, user } = pasang()
    await user.type(screen.getByRole('textbox', { name: 'Nama desa' }), 'Koto Baru Sentosa')
    await isiWilayah(user, 'Kampar', 'Kampa')
    await user.type(screen.getByRole('textbox', { name: 'Kode desa' }), '2077')
    expect(screen.getByText('Kode lengkap: 14.01.17.2077')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /^Lengkap/ }))
    await user.type(screen.getByRole('textbox', { name: 'Email admin pertama' }), 'admin@kotobarusentosa.desa.id')
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    await vi.waitFor(() =>
      expect(onSelesai).toHaveBeenCalledWith({ id: 'desa_koto_baru_sentosa', nama: 'Koto Baru Sentosa', email: 'admin@kotobarusentosa.desa.id' }),
    )
    expect(await screen.findByText(/^Undangan terkirim ke admin@kotobarusentosa\.desa\.id/)).toBeInTheDocument()
    expect(ambilDb().desa.find((d) => d.id === 'desa_koto_baru_sentosa')?.status).toBe('Persiapan')
  })
  it('isian kosong: galat di setiap kolom, tanpa permintaan ke server (fokus review 3)', async () => {
    const { onSelesai, user } = pasang()
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    expect(screen.getByText('Nama desa minimal 3 huruf.')).toBeInTheDocument()
    expect(screen.getByText('Pilih kecamatan.')).toBeInTheDocument()
    expect(screen.getByText('Kode desa 4 angka berawalan 2, mis. 2015.')).toBeInTheDocument()
    expect(screen.getByText('Email admin belum benar.')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
    expect(ambilDb().desa).toHaveLength(40)
  })
  it('kode desa yang sudah terdaftar: galat dari server tampil di kolomnya (fokus review 3)', async () => {
    const { onSelesai, user } = pasang()
    await user.type(screen.getByRole('textbox', { name: 'Nama desa' }), 'Sialang Baru')
    await isiWilayah(user, 'Pelalawan', 'Teluk Meranti')
    await user.type(screen.getByRole('textbox', { name: 'Kode desa' }), '2009')
    await user.type(screen.getByRole('textbox', { name: 'Email admin pertama' }), 'admin@sialangbaru.desa.id')
    await user.click(screen.getByRole('button', { name: 'Simpan dan kirim undangan' }))
    expect(await screen.findByText('Kode desa 14.05.09.2009 sudah terdaftar.')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
  })
  it('provinsi tanpa data kabupaten dijelaskan, bukan pilihan kosong tanpa keterangan (fokus review 3)', async () => {
    const { user } = pasang()
    await pilih(user, /Provinsi$/, 'Jambi')
    expect(screen.getByText('Kabupaten provinsi ini belum ada di tabel wilayah demo.')).toBeInTheDocument()
  })
})

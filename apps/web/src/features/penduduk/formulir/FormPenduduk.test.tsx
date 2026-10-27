import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilKeluarga } from '@/api/keluarga'
import { buatNik } from '@/domain/penduduk/nik'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import type { OpsiKeluarga } from '../../keluarga/opsi-keluarga'
import { FormPenduduk, type ModeFormulir } from './FormPenduduk'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => localStorage.clear())

const KK_SYAHRIAL: OpsiKeluarga = {
  id: 'kk_syahrial', nomorKk: '1405092011238004', namaKepala: 'Syahrial', dusunId: 'dsn_ss_1', rw: '002', rt: '004', jumlahAnggota: 4,
}
const NIK_ANAK = buatNik({ kodeWilayah: '140509', tanggalLahir: '2015-05-10', jenisKelamin: 'L', nomorUrut: 9876 })
const DRAF_UMUM = 'sinfodes.draf.penduduk.tambah.umum.pgn_rosmiati'
const DRAF_KK = 'sinfodes.draf.penduduk.tambah.kk_syahrial.pgn_rosmiati'

function pasang(mode: ModeFormulir = { jenis: 'tambah', keluargaAwal: KK_SYAHRIAL }) {
  masukSebagai(AKUN_UJI.operator)
  const onTersimpan = vi.fn()
  const onKotor = vi.fn()
  const hasil = renderPanel(
    <FormPenduduk mode={mode} onTersimpan={onTersimpan} onBatal={vi.fn()} onKotor={onKotor} sekarang={SEKARANG_UJI} />,
    contohSesi(),
  )
  return { ...hasil, onTersimpan, onKotor, user: userEvent.setup() }
}

async function isi(user: UserEvent, label: string, teks: string) {
  await user.click(screen.getByRole('textbox', { name: label }))
  await user.paste(teks)
}

async function pilih(user: UserEvent, label: RegExp, opsi: string) {
  await user.click(screen.getByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

async function isiDataAnak(user: UserEvent) {
  await isi(user, 'NIK', NIK_ANAK)
  await user.tab()
  await isi(user, 'Nama lengkap', 'Fajar Ramadhan')
  await isi(user, 'Tempat lahir', 'Teluk Meranti')
  await pilih(user, /Agama/, 'Islam')
  await pilih(user, /Hubungan dalam keluarga/, 'Anak')
}

describe('Formulir tambah penduduk (SPEC §6.4)', { timeout: 15_000 }, () => {
  it('tambah anggota KK: NIK mengisi jenis kelamin dan tanggal lahir, lalu tersimpan; draf dibuang (fokus review 5)', async () => {
    const { user, onTersimpan } = pasang()
    await isi(user, 'NIK', NIK_ANAK)
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Laki-laki' })).toBeChecked()
    await isi(user, 'Nama lengkap', 'Fajar Ramadhan')
    await isi(user, 'Tempat lahir', 'Teluk Meranti')
    await pilih(user, /Agama/, 'Islam')
    await pilih(user, /Hubungan dalam keluarga/, 'Anak')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    const [p, lanjut] = onTersimpan.mock.calls[0]
    expect(lanjut).toBe('profil')
    expect(p).toMatchObject({ nik: NIK_ANAK, jenisKelamin: 'L', tanggalLahir: '2015-05-10', keluargaId: 'kk_syahrial', hubunganKeluarga: 'Anak' })
    expect((await ambilKeluarga('kk_syahrial')).anggota).toHaveLength(5)
    expect(localStorage.getItem(DRAF_KK)).toBeNull()
  })
  it('kolom wajib kosong → pesan per kolom dan fokus ke kolom pertama yang salah', async () => {
    const { user, onTersimpan } = pasang({ jenis: 'tambah', keluargaAwal: null })
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    for (const pesan of [
      'Nama lengkap wajib diisi', 'Pilih jenis kelamin', 'Pilih agama', 'Tempat lahir wajib diisi', 'Tanggal lahir wajib diisi',
      'Pilih KK, atau buat KK baru', 'Pilih hubungan dalam keluarga',
    ]) {
      expect(await screen.findByText(pesan)).toBeInTheDocument()
    }
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toHaveFocus())
    expect(onTersimpan).not.toHaveBeenCalled()
  })
  it('NIK yang sudah terdaftar ditolak saat kolom ditinggalkan, dengan tautan ke profilnya (fokus review 4)', async () => {
    const { user } = pasang()
    await isi(user, 'NIK', '1405095203918002')
    await user.tab()
    expect(await screen.findByText('NIK sudah terdaftar atas nama Siti Rahmah')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buka profil Siti Rahmah' })).toHaveAttribute('href', '/admin/kependudukan/penduduk/pdk_siti_rahmah')
  })
  it('data berbeda dengan NIK → peringatan, lalu konfirmasi sebelum simpan', async () => {
    const { user, onTersimpan } = pasang()
    await isi(user, 'NIK', buatNik({ kodeWilayah: '140509', tanggalLahir: '1991-03-12', jenisKelamin: 'P', nomorUrut: 9877 }))
    await user.tab()
    await user.click(screen.getByRole('radio', { name: 'Laki-laki' }))
    expect(await screen.findByText(/Jenis kelamin berbeda dengan NIK \(Perempuan\)/)).toBeInTheDocument()
    await isi(user, 'Nama lengkap', 'Rahmat')
    await isi(user, 'Tempat lahir', 'Teluk Meranti')
    await pilih(user, /Agama/, 'Islam')
    await pilih(user, /Hubungan dalam keluarga/, 'Famili Lain')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Data berbeda dengan NIK' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan tetap' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    expect(onTersimpan.mock.calls[0][0]).toMatchObject({ jenisKelamin: 'L', tanggalLahir: '1991-03-12' })
  })
  it('KK baru: hubungan otomatis kepala keluarga, alamat mengikuti wilayah yang dipilih', async () => {
    const { user, onTersimpan } = pasang({ jenis: 'tambah', keluargaAwal: null })
    await user.click(screen.getByRole('radio', { name: 'Buat KK baru' }))
    expect(screen.getByRole('button', { name: /Hubungan dalam keluarga/ })).toHaveTextContent('Kepala Keluarga')
    await pilih(user, /Dusun/, 'Dusun III Teluk Rengas')
    await pilih(user, /RW/, '005')
    await pilih(user, /RT/, '012')
    expect(screen.getByText('RT 012/RW 005, Dusun III Teluk Rengas')).toBeInTheDocument()
    await isi(user, 'NIK', buatNik({ kodeWilayah: '140509', tanggalLahir: '1990-01-15', jenisKelamin: 'L', nomorUrut: 9878 }))
    await user.tab()
    await isi(user, 'Nama lengkap', 'Riko Saputra')
    await isi(user, 'Tempat lahir', 'Pelalawan')
    await pilih(user, /Agama/, 'Islam')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalled())
    const [p] = onTersimpan.mock.calls[0]
    expect(p.hubunganKeluarga).toBe('Kepala Keluarga')
    expect((await ambilKeluarga(p.keluargaId)).keluarga.kepalaKeluargaId).toBe(p.id)
  })
  it('"Simpan & tambah lagi" mengosongkan isian tetapi tetap di KK yang sama', async () => {
    const { user, onTersimpan } = pasang()
    await isiDataAnak(user)
    await user.click(screen.getByRole('button', { name: 'Simpan & tambah lagi' }))
    await waitFor(() => expect(onTersimpan).toHaveBeenCalledWith(expect.objectContaining({ keluargaId: 'kk_syahrial' }), 'tambah-lagi'))
    expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Pilih KK' })).toHaveValue('KK Syahrial')
  })
  it('draf tersimpan dan dipulihkan; "Buang draf" mengosongkan isian (fokus review 5)', async () => {
    const pertama = pasang({ jenis: 'tambah', keluargaAwal: null })
    await isi(pertama.user, 'Nama lengkap', 'Fajar')
    await waitFor(() => expect(localStorage.getItem(DRAF_UMUM)).not.toBeNull())
    pertama.unmount()
    const kedua = pasang({ jenis: 'tambah', keluargaAwal: null })
    expect(await screen.findByText('Draf dari 09.00 dipulihkan')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toHaveValue('Fajar')
    await waitFor(() => expect(kedua.onKotor).toHaveBeenLastCalledWith(true))
    await kedua.user.click(screen.getByRole('button', { name: 'Buang draf' }))
    expect(screen.getByRole('textbox', { name: 'Nama lengkap' })).toHaveValue('')
    expect(localStorage.getItem(DRAF_UMUM)).toBeNull()
  })
})

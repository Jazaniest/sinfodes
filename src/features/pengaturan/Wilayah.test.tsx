import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { Wilayah } from './Wilayah'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderPanel(
    <>
      <Wilayah />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return userEvent.setup()
}

function pasangDesaBaru() {
  masukSebagai(AKUN_DESA_BARU_UJI)
  renderPanel(
    <>
      <Wilayah />
      <PenampungToast />
    </>,
    contohSesiDesaBaru(),
  )
  return userEvent.setup()
}

describe('Pengaturan › Wilayah (SPEC §8)', () => {
  it('pohon dusun → RW → RT berisi nama ketua; Simpan memperbarui Lembaga Desa (fokus review 5)', async () => {
    const user = pasang()
    const rt = await screen.findByRole('textbox', { name: 'Ketua RT 001' })
    expect(rt).toHaveValue('Jufri')
    expect(screen.getByRole('textbox', { name: 'Ketua RW 008' })).toBeInTheDocument()
    await user.clear(rt)
    await user.type(rt, 'Jufri Hasan')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Wilayah disimpan. Nama kepala dusun dan ketua RT/RW ikut diperbarui di Lembaga Desa.')).toBeInTheDocument()
    expect(ambilDb().pengurusLembaga.find((p) => p.jabatan === 'Ketua RT 001 / RW 001')?.nama).toBe('Jufri Hasan')
  })
  it('istilah wilayah yang diketik langsung dipakai judul dan label', async () => {
    const user = pasang()
    const istilah = await screen.findByRole('textbox', { name: 'Istilah untuk dusun' })
    await user.clear(istilah)
    await user.type(istilah, 'Jorong')
    expect(screen.getByRole('heading', { name: /Jorong I Kampung Tengah/ })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: 'Kepala jorong' })).toHaveLength(4)
  })
  it('nama kosong ditandai sebelum dikirim, data tidak berubah', async () => {
    const user = pasang()
    const kadus = (await screen.findAllByRole('textbox', { name: 'Kepala dusun' }))[1]
    await user.clear(kadus)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Nama kepala dusun wajib diisi')).toBeInTheDocument()
    expect(ambilDb().dusun.find((d) => d.id === 'dsn_ss_2')?.kepalaDusun).toBe('Sukardi')
  })
  it('desa tanpa penduduk: tambah dusun, RW, dan RT bernomor urut, lalu simpan (tahap 6C)', async () => {
    const user = pasangDesaBaru()
    expect(await screen.findByText('Belum ada dusun. Tambahkan dusun pertama beserta RW dan RT-nya.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tambah dusun' }))
    expect(screen.getByRole('textbox', { name: 'Nama dusun' })).toHaveFocus()
    await user.keyboard('Tanjung')
    await user.type(screen.getByRole('textbox', { name: 'Kepala dusun' }), 'Ahmad Yani')
    await user.type(screen.getByRole('textbox', { name: 'Ketua RW 001' }), 'Rasyid')
    await user.type(screen.getByRole('textbox', { name: 'Ketua RT 001' }), 'Udin')
    await user.click(screen.getByRole('button', { name: 'Tambah RT' }))
    expect(screen.getByRole('textbox', { name: 'Ketua RT 002' })).toHaveFocus()
    await user.keyboard('Usman')
    await user.click(screen.getByRole('button', { name: 'Tambah dusun' }))
    expect(screen.getByRole('heading', { name: /Dusun II$/ })).toBeInTheDocument()
    await user.keyboard('Lamo')
    await user.type(screen.getAllByRole('textbox', { name: 'Kepala dusun' })[1], 'Bahar')
    await user.type(screen.getByRole('textbox', { name: 'Ketua RW 002' }), 'Kasim')
    await user.type(screen.getByRole('textbox', { name: 'Ketua RT 003' }), 'Jalil')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Wilayah disimpan. Dusun, RW, dan RT baru langsung bisa dipakai untuk data penduduk.')).toBeInTheDocument()
    const tersimpan = ambilDb().dusun.filter((d) => d.desaId === 'desa_tanjung_lamo')
    expect(tersimpan.map((d) => `${d.nomor} ${d.nama} ${d.rw.map((rw) => `${rw.nomor}(${rw.rt.map((rt) => rt.nomor).join(',')})`).join(' ')}`)).toEqual([
      '1 Tanjung 001(001,002)',
      '2 Lamo 002(003)',
    ])
  })
  it('hapus RT dan dusun sebelum disimpan; RT dan RW terakhir tidak bisa dihapus; fokus pindah ke tombol tambah', async () => {
    const user = pasangDesaBaru()
    await user.click(await screen.findByRole('button', { name: 'Tambah dusun' }))
    expect(screen.getByRole('button', { name: 'Hapus RT 001' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hapus RW 001' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Tambah RT' }))
    await user.keyboard('Usman')
    await user.click(screen.getByRole('button', { name: 'Hapus RT 001' }))
    expect(screen.getAllByRole('textbox', { name: /^Ketua RT/ }).map((t) => (t as HTMLInputElement).value)).toEqual(['Usman'])
    expect(screen.getByRole('textbox', { name: 'Ketua RT 001' })).toHaveValue('Usman')
    expect(screen.getByRole('button', { name: 'Tambah RT' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Hapus Dusun I' }))
    expect(screen.queryByRole('textbox', { name: 'Nama dusun' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah dusun' })).toHaveFocus()
  })
  it('simpan tanpa dusun → "Tambahkan minimal satu dusun"; data tidak berubah', async () => {
    const user = pasangDesaBaru()
    await user.click(await screen.findByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Tambahkan minimal satu dusun')).toBeInTheDocument()
    expect(ambilDb().dusun.some((d) => d.desaId === 'desa_tanjung_lamo')).toBe(false)
  })
  it('Sungai Sialang sudah punya penduduk: tanpa tombol tambah dan hapus (fokus review 2)', async () => {
    pasang()
    await screen.findByRole('textbox', { name: 'Ketua RT 001' })
    expect(screen.queryByRole('button', { name: /^(Tambah|Hapus)/ })).not.toBeInTheDocument()
    expect(screen.getByText(/tidak bisa ditambah atau dihapus lagi/)).toBeInTheDocument()
  })
})

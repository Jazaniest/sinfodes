import type { ComponentProps } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import { arsipkanJenisSurat, buatPermohonan, tambahJenisSurat, ubahJenisSurat } from '@/api/surat'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel, renderRute } from '@/test/render'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DaftarJenisSurat } from './DaftarJenisSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(peran: Peran = 'operator', props: ComponentProps<typeof DaftarJenisSurat> = {}) {
  masukSebagai(peran === 'kades' ? AKUN_UJI.kades : AKUN_UJI.operator)
  renderPanel(
    <>
      <DaftarJenisSurat {...props} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}

describe('Jenis Surat (SPEC §7.4 layar 6)', () => {
  it('12 jenis: saklar aktif dan online, ringkasan aturan dan pemakaian, tautan ubah', async () => {
    pasang()
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getByRole('switch', { name: 'Surat Keterangan Domisili aktif' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Surat Keterangan Kematian bisa diajukan online' })).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Ubah Surat Keterangan Domisili' })).toHaveAttribute('href', '/admin/surat/jenis/js_ss_skd')
    expect(screen.getByText(/^Kepala Desa; boleh a\.n\. Sekretaris Desa · berlaku 3 bulan · dipakai \d+ kali dalam 12 bulan$/)).toBeInTheDocument()
    // SKTM, SKP, dan SPN wajib diparaf Sekretaris Desa.
    expect(screen.getAllByText(/^Kepala Desa · diparaf Sekretaris Desa · berlaku 3 bulan · dipakai/)).toHaveLength(3)
    expect(within(screen.getByRole('navigation', { name: 'Bagian layanan surat' })).getByRole('link', { name: 'Jenis Surat' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
  it('menonaktifkan: saklar langsung berubah, tersimpan, dan ada pesannya', async () => {
    const user = pasang()
    const saklar = await screen.findByRole('switch', { name: 'Surat Keterangan Domisili aktif' })
    await user.click(saklar)
    expect(saklar).not.toBeChecked()
    expect(
      await screen.findByText('Surat Keterangan Domisili tidak dilayani lagi. Permohonan yang sudah ada tetap bisa diproses.'),
    ).toBeInTheDocument()
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')?.aktif).toBe(false)
  })
  it('gagal menyimpan: saklar kembali seperti semula dan ada pesan galat', async () => {
    const user = pasang()
    const saklar = await screen.findByRole('switch', { name: 'Surat Keterangan Domisili bisa diajukan online' })
    aturModeJaringan('gagal')
    await user.click(saklar)
    expect(await screen.findByText('Server sedang tidak dapat dihubungi. Coba lagi beberapa saat.')).toBeInTheDocument()
    await waitFor(() => expect(saklar).toBeChecked())
    expect(ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')?.online).toBe(true)
  })
  it('Kepala Desa: status sebagai teks, tanpa saklar dan tautan ubah (fokus review 5)', async () => {
    pasang('kades')
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).queryAllByRole('switch')).toHaveLength(0)
    expect(within(daftar).getAllByText('Aktif')).toHaveLength(12)
    expect(screen.queryByRole('link', { name: /^Ubah / })).not.toBeInTheDocument()
  })
  it('desa baru: belum ada jenis yang dilayani diberi keterangan (tahap 6C)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(<DaftarJenisSurat />, contohSesiDesaBaru())
    expect(await screen.findByText(/^Belum ada jenis surat yang dilayani\. Aktifkan jenis surat/)).toBeInTheDocument()
    expect(screen.getByText('0 dari 12 jenis dilayani · 0 bisa diajukan online')).toBeInTheDocument()
  })
  it('mengaktifkan jenis surat di desa baru: pesannya "kini dilayani", bukan "kembali" (tahap 6D)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(
      <>
        <DaftarJenisSurat />
        <PenampungToast />
      </>,
      contohSesiDesaBaru(),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('switch', { name: 'Surat Keterangan Tidak Mampu aktif' }))
    expect(await screen.findByText('Surat Keterangan Tidak Mampu kini dilayani.')).toBeInTheDocument()
  })
})

/** Jenis buatan desa yang menyala dan sudah punya satu permohonan, dibuat lewat API supaya `dipakai` sungguhan true. */
async function jenisDesaDipakai() {
  masukSebagai(AKUN_UJI.operator)
  const j = await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
  await ubahJenisSurat(j.id, { aktif: true })
  await buatPermohonan({ jenisId: j.id, pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: {}, ajukan: false })
  return j
}

const menuAksi = (nama: string) => screen.findByRole('button', { name: `Aksi untuk ${nama}` })
const dialogKonfirmasi = async () => within(await screen.findByRole('alertdialog'))

describe('jenis buatan desa: tambah (SPEC-V0.2 12.1)', () => {
  it('Tambah jenis surat dari kosong: kode diketik huruf kecil jadi kapital; setelah dibuat editor terbuka dengan pratinjau lembar', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { router } = renderRute('/admin/surat/jenis')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Tambah jenis surat' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Tambah jenis surat' }))
    expect(dialog.getByRole('radio', { name: 'Mulai dari kosong' })).toBeChecked()
    await user.click(dialog.getByRole('textbox', { name: 'Kode' }))
    await user.paste('spk')
    await user.click(dialog.getByRole('textbox', { name: 'Nama surat' }))
    await user.paste('Surat Pengantar Kerja')
    await user.click(dialog.getByRole('button', { name: 'Buat jenis surat' }))
    expect(await screen.findByText('Jenis surat Surat Pengantar Kerja dibuat. Lengkapi isinya, lalu nyalakan layanannya.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Pengantar Kerja' }, { timeout: 5000 })).toBeInTheDocument()
    const baru = ambilDb().jenisSurat.find((j) => j.kode === 'SPK')
    expect(baru).toMatchObject({ asal: 'desa', aktif: false, diarsipkan: null })
    expect(router.state.location.pathname).toBe(`/admin/surat/jenis/${baru?.id}`)
    expect(screen.getByRole('textbox', { name: 'Kode' })).toHaveValue('SPK')
    expect(screen.getByRole('region', { name: 'Pratinjau surat' })).toBeInTheDocument()
  })
  it('Salin dari SKTM: editor menampilkan isian SKTM', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderRute('/admin/surat/jenis')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Tambah jenis surat' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Tambah jenis surat' }))
    await user.click(dialog.getByRole('radio', { name: 'Salin dari jenis yang ada' }))
    await user.click(dialog.getByRole('button', { name: /Jenis yang disalin/ }))
    await user.click(await screen.findByRole('option', { name: 'Surat Keterangan Tidak Mampu (SKTM)' }))
    await user.click(dialog.getByRole('textbox', { name: 'Kode' }))
    await user.paste('SKTK')
    await user.click(dialog.getByRole('textbox', { name: 'Nama surat' }))
    await user.paste('Surat Keterangan Tidak Kuat')
    await user.click(dialog.getByRole('button', { name: 'Buat jenis surat' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Tidak Kuat' }, { timeout: 5000 })).toBeInTheDocument()
    const grup = await screen.findByRole('group', { name: 'Isian 2' })
    expect(within(grup).getByRole('textbox', { name: 'Label' })).toHaveValue('Instansi tujuan')
  })
  it('kode salah atau sudah dipakai ditandai di kolomnya dan dialog tetap terbuka', async () => {
    const user = pasang()
    await user.click(await screen.findByRole('button', { name: 'Tambah jenis surat' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Tambah jenis surat' }))
    await user.click(dialog.getByRole('button', { name: 'Buat jenis surat' }))
    expect(dialog.getByText('Kode 2-5 huruf kapital.')).toBeInTheDocument()
    expect(dialog.getByText('Nama jenis surat wajib diisi.')).toBeInTheDocument()
    await user.click(dialog.getByRole('textbox', { name: 'Kode' }))
    await user.paste('SKD')
    await user.click(dialog.getByRole('textbox', { name: 'Nama surat' }))
    await user.paste('Surat Domisili Lain')
    await user.click(dialog.getByRole('button', { name: 'Buat jenis surat' }))
    expect(await dialog.findByText('Kode sudah dipakai jenis surat lain.')).toBeInTheDocument()
    expect(ambilDb().jenisSurat.filter((j) => j.kode === 'SKD' && j.desaId === 'desa_sungai_sialang')).toHaveLength(1)
  })
  it('Kepala Desa tidak melihat Tambah jenis surat', async () => {
    pasang('kades')
    await screen.findByRole('list', { name: 'Jenis surat' })
    expect(screen.queryByRole('button', { name: 'Tambah jenis surat' })).not.toBeInTheDocument()
  })
})

describe('jenis buatan desa: penanda, penyaring, dan aksi baris (SPEC-V0.2 12.1)', () => {
  it('jenis buatan desa berpenanda Buatan desa; jenis bawaan tidak punya menu aksi', async () => {
    await jenisDesaDipakai()
    pasang()
    const baris = (await screen.findByText('Surat Pengantar Kerja')).closest('li') as HTMLElement
    expect(within(baris).getByText('Buatan desa')).toBeInTheDocument()
    expect(screen.getAllByText('Buatan desa')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Aksi untuk Surat Pengantar Kerja' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aksi untuk Surat Keterangan Domisili' })).not.toBeInTheDocument()
  })
  it('penyaring Diarsipkan menampilkan jenis arsip saja, dan ?status=diarsipkan masuk URL', async () => {
    const j = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    masukSebagai(AKUN_UJI.operator)
    const { router } = renderRute('/admin/surat/jenis')
    const user = userEvent.setup()
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(13)
    await user.click(screen.getByRole('radio', { name: 'Diarsipkan' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ status: 'diarsipkan' }))
    const baris = within(await screen.findByRole('list', { name: 'Jenis surat' })).getAllByRole('listitem')
    expect(baris).toHaveLength(1)
    expect(baris[0]).toHaveTextContent('Surat Pengantar Kerja')
    expect(within(baris[0]).getByText('Diarsipkan')).toBeInTheDocument()
    expect(within(baris[0]).queryByRole('switch')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Semua' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))
  })
  it('alamat ?status=dihentikan langsung memilih chip dan menyaring daftar', async () => {
    masukSebagai(AKUN_UJI.operator)
    await ubahJenisSurat('js_ss_skd', { aktif: false })
    renderRute('/admin/surat/jenis?status=dihentikan')
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('radio', { name: 'Dihentikan' })).toBeChecked()
  })
  it('Hapus jenis yang dipakai: toast pesan server, lalu dialog Arsipkan yang bisa dilanjutkan', async () => {
    await jenisDesaDipakai()
    const user = pasang()
    await user.click(await menuAksi('Surat Pengantar Kerja'))
    await user.click(await screen.findByRole('menuitem', { name: 'Hapus…' }))
    const hapus = await dialogKonfirmasi()
    expect(hapus.getByRole('heading', { name: 'Hapus jenis Surat Pengantar Kerja?' })).toBeInTheDocument()
    await user.click(hapus.getByRole('button', { name: 'Hapus' }))
    expect(await screen.findByText('Jenis ini sudah pernah dipakai. Arsipkan saja.')).toBeInTheDocument()
    const arsip = await screen.findByRole('heading', { name: 'Arsipkan jenis Surat Pengantar Kerja?' })
    expect(arsip).toBeInTheDocument()
    expect(
      screen.getByText('Jenis ini tidak bisa dipilih untuk surat baru. Surat lamanya tetap tampil dan tetap bisa diverifikasi.'),
    ).toBeInTheDocument()
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arsipkan' }))
    expect(await screen.findByText('Surat Pengantar Kerja diarsipkan.')).toBeInTheDocument()
    expect(ambilDb().jenisSurat.find((j) => j.kode === 'SPK')?.diarsipkan).not.toBeNull()
  })
  it('Hapus jenis yang belum dipakai: hilang dari daftar', async () => {
    masukSebagai(AKUN_UJI.operator)
    await tambahJenisSurat({ dari: null, kode: 'SPK', nama: 'Surat Pengantar Kerja' })
    const user = pasang()
    await user.click(await menuAksi('Surat Pengantar Kerja'))
    await user.click(await screen.findByRole('menuitem', { name: 'Hapus…' }))
    await user.click((await dialogKonfirmasi()).getByRole('button', { name: 'Hapus' }))
    expect(await screen.findByText('Surat Pengantar Kerja dihapus.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Surat Pengantar Kerja', { selector: 'span' })).not.toBeInTheDocument())
    expect(ambilDb().jenisSurat.some((j) => j.kode === 'SPK')).toBe(false)
  })
  it('jenis arsip: berpenanda Diarsipkan tanpa saklar; Aktifkan lagi mengembalikannya sebagai tidak aktif', async () => {
    const j = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    const user = pasang()
    const baris = (await screen.findByText('Surat Pengantar Kerja')).closest('li') as HTMLElement
    expect(within(baris).getByText('Diarsipkan')).toBeInTheDocument()
    expect(within(baris).queryByRole('switch')).not.toBeInTheDocument()
    expect(within(baris).getByRole('link', { name: 'Lihat Surat Pengantar Kerja' })).toHaveAttribute('href', `/admin/surat/jenis/${j.id}`)
    await user.click(await menuAksi('Surat Pengantar Kerja'))
    await user.click(await screen.findByRole('menuitem', { name: 'Aktifkan lagi' }))
    expect(await screen.findByText(/^Surat Pengantar Kerja dikeluarkan dari arsip\./)).toBeInTheDocument()
    expect(ambilDb().jenisSurat.find((x) => x.id === j.id)).toMatchObject({ diarsipkan: null, aktif: false })
    await waitFor(() => expect(within(baris).queryByText('Diarsipkan')).not.toBeInTheDocument())
  })
  it('meta menghitung tanpa jenis arsip dan menyebut jumlah arsip', async () => {
    const j = await jenisDesaDipakai()
    await arsipkanJenisSurat(j.id)
    pasang()
    expect(await screen.findByText(/^12 dari 12 jenis dilayani · \d+ bisa diajukan online · 1 diarsipkan$/)).toBeInTheDocument()
  })
  it('onBuka dipanggil dengan id jenis baru setelah dibuat', async () => {
    const onBuka = vi.fn()
    const user = pasang('operator', { onBuka })
    await user.click(await screen.findByRole('button', { name: 'Tambah jenis surat' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Tambah jenis surat' }))
    await user.click(dialog.getByRole('textbox', { name: 'Kode' }))
    await user.paste('SPK')
    await user.click(dialog.getByRole('textbox', { name: 'Nama surat' }))
    await user.paste('Surat Pengantar Kerja')
    await user.click(dialog.getByRole('button', { name: 'Buat jenis surat' }))
    await waitFor(() => expect(onBuka).toHaveBeenCalledWith(ambilDb().jenisSurat.find((x) => x.kode === 'SPK')?.id))
  })
})

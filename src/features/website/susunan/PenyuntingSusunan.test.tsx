import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { simpanDraf, terbitkan } from '@/api/website'
import { susunBlok } from '@/domain/website/blok'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh bisa melewati 3 detik bawaan saat seluruh suite berjalan paralel di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

const WARTA = [
  'Lencana juara (deret)', 'Kabar terbaru (satu sorotan)', 'Layanan cepat (kisi)', 'Kabar terbaru (daftar)',
  'Pengumuman & agenda (bertumpuk)', 'Angka desa (dalam kalimat)', 'APBDes ringkas (batang)', 'Potensi (kartu)',
]

function pasang() {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan?bagian=susunan')
  return userEvent.setup({ applyAccept: false })
}
const daftarBlok = async () => {
  const grid = await screen.findByRole('grid', { name: 'Blok halaman' })
  await waitFor(() => expect(within(grid).getAllByRole('row').length).toBeGreaterThan(0))
  return grid
}
const namaBaris = async () => (await within(await daftarBlok()).getAllByRole('row')).map((o) => o.getAttribute('aria-label'))
const baris = async (nama: string) => within(await daftarBlok()).findByRole('row', { name: nama })

describe('Penyunting susunan: daftar blok (rencana 7F-2 Tugas 3)', () => {
  it('daftar Beranda Sungai Sialang berisi delapan blok susunan Warta', async () => {
    pasang()
    await daftarBlok()
    expect(await namaBaris()).toEqual(WARTA)
    expect(screen.getByRole('button', { name: 'Tambah blok' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beranda' })).toHaveAttribute('aria-current', 'true')
  })
  it('Turun memindahkan blok ke posisi 2, fokus tetap di tombolnya, pengumuman persis', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(await screen.findByRole('button', { name: 'Turun: Lencana juara (deret)' }))
    expect(await namaBaris()).toEqual([WARTA[1], WARTA[0], ...WARTA.slice(2)])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Turun: Lencana juara (deret)' }))
    expect(screen.getByText('Lencana juara dipindah ke posisi 2 dari 8.')).toBeInTheDocument()
  })
  it('Tambah blok memilih Teks dari katalog: blok baru terpilih sesudah blok terpilih', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(await baris(WARTA[3]))
    await user.click(screen.getByRole('button', { name: 'Tambah blok' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah blok' })
    await user.click(within(dialog).getByRole('button', { name: 'Teks' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah blok' })).not.toBeInTheDocument())
    const semua = await namaBaris()
    expect(semua).toEqual([...WARTA.slice(0, 4), 'Teks (biasa)', ...WARTA.slice(4)])
    const baru = await baris('Teks (biasa)')
    expect(baru).toHaveAttribute('aria-selected', 'true')
  })
  it('Gandakan menghasilkan dua blok sama berdampingan', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(screen.getByRole('button', { name: 'Gandakan: Angka desa (dalam kalimat)' }))
    const semua = await namaBaris()
    expect(semua).toEqual([...WARTA.slice(0, 5), 'Angka desa (dalam kalimat)', 'Angka desa (dalam kalimat)', ...WARTA.slice(6)])
  })
  it('Sembunyikan memberi tanda Tersembunyi dan tombol berubah menjadi Tampilkan', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(screen.getByRole('button', { name: 'Sembunyikan: Layanan cepat (kisi)' }))
    const row = await baris('Layanan cepat (kisi)')
    expect(within(row).getByText('Tersembunyi')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Tampilkan: Layanan cepat (kisi)' })).toBeInTheDocument()
  })
  it('Hapus blok Teks berisi meminta konfirmasi, lalu hilang dan seleksi pindah ke blok sesudahnya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const susunan = susunanBawaan()
    susunan.beranda.splice(1, 0, susunBlok({ id: 'blk_teks01', jenis: 'teks', isi: { judul: 'Sejarah', paragraf: ['Isi sejarah.'], tautan: null } }))
    await simpanDraf(null, { tema: TEMA_WARTA_BAWAAN('#1F4E79'), susunan })
    await terbitkan('Teks.')
    const user = pasang()
    await daftarBlok()
    await user.click(screen.getByRole('button', { name: 'Hapus: Teks (biasa)' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('button', { name: 'Hapus' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    const grid = await daftarBlok()
    await waitFor(() => expect(within(grid).queryByRole('row', { name: 'Teks (biasa)' })).not.toBeInTheDocument())
    expect(await namaBaris()).toEqual(WARTA)
    expect(await baris(WARTA[1])).toHaveAttribute('aria-selected', 'true')
  })
  it('blok kabar yang sumbernya kosong bertanda "Kosong, tidak tampil di website"', async () => {
    ambilDb().artikel = []
    pasang()
    await daftarBlok()
    const row = await baris('Kabar terbaru (daftar)')
    expect(within(row).getByText('Kosong, tidak tampil di website')).toBeInTheDocument()
  })
})

describe('Halaman tambahan (rencana 7F-2 Tugas 5)', () => {
  it('Tambah halaman judul Sejarah Kampung: nama usulan sejarah-kampung, halaman terpilih, dan menu bertambah', async () => {
    const user = pasang()
    await daftarBlok()
    await user.click(screen.getByRole('button', { name: 'Tambah halaman' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah halaman' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Judul halaman' }), 'Sejarah Kampung')
    expect(within(dialog).getByRole('textbox', { name: 'Nama halaman' })).toHaveValue('sejarah-kampung')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah halaman' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah halaman' })).not.toBeInTheDocument())
    const tombol = await screen.findByRole('button', { name: 'Sejarah Kampung' })
    expect(tombol).toHaveAttribute('aria-current', 'true')
    expect(await namaBaris()).toEqual(['Teks (biasa)'])
    await waitFor(() =>
      expect(ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')?.draf?.susunan.menu).toHaveLength(8),
    )
    expect(screen.getByRole('button', { name: 'Hapus halaman' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ubah halaman' })).toBeInTheDocument()
  })
})

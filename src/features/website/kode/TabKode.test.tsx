import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aturLanjut, simpanDraf } from '@/api/website'
import { susunanBawaan } from '@/domain/website/susunan'
import { TEMA_WARTA_BAWAAN } from '@/domain/website/tema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'
import { kosongkanToast } from '@/ui/toast/antrean'

pakaiApiTiruan({ dbSegarTiapUji: true })
// Render rute penuh dengan pemeriksaan CSS dinamis bisa melewati 3 detik bawaan di mesin lambat.
configure({ asyncUtilTimeout: 10_000 })
afterEach(() => kosongkanToast())

const PNG_KECIL = `data:image/png;base64,${'A'.repeat(1364)}`
const KOTAK_PENJELASAN = 'Tingkat Lanjut menyalakan CSS kustom dan Blok HTML untuk website publik desa ini.'
const KALIMAT_KONFIRMASI = 'Tingkat Lanjut untuk yang paham CSS dan HTML.'
const TOAST_SALIN = 'Prompt disalin. Tempel ke AI pilihan Anda, lalu tempel jawabannya di sini.'
const PESAN_DIPAKAI = 'Blok HTML ini masih dipakai di Beranda.'

const dokumen = () => ambilDb().situs.find((s) => s.desaId === 'desa_sungai_sialang')!

type User = ReturnType<typeof userEvent.setup>

function pasang(): User {
  masukSebagai(AKUN_UJI.operator)
  renderRute('/admin/website/tampilan?bagian=kode')
  return userEvent.setup({ applyAccept: false })
}

async function aktifkan(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Aktifkan tingkat Lanjut' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Aktifkan' }))
  await screen.findByRole('textbox', { name: 'CSS kustom' })
}

describe('Sub-tab Kode (7G Tugas 5, keputusan 8)', () => {
  it('belum aktif: kotak penjelasan; konfirmasi mengaktifkan tingkat dan editor tampil', async () => {
    const user = pasang()
    await screen.findByRole('button', { name: 'Aktifkan tingkat Lanjut' })
    expect(screen.getByText(KOTAK_PENJELASAN)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'CSS kustom' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aktifkan tingkat Lanjut' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(KALIMAT_KONFIRMASI)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Aktifkan' }))
    expect(await screen.findByRole('textbox', { name: 'CSS kustom' })).toBeInTheDocument()
    await waitFor(() => expect(dokumen().lanjut.aktif).toBe(true))
  })

  it('CSS bermasalah: pesan "Baris 1: @import tidak diizinkan." dan tidak ada PUT draf', async () => {
    const user = pasang()
    await aktifkan(user)
    fireEvent.change(screen.getByRole('textbox', { name: 'CSS kustom' }), {
      target: { value: '@import url(x);' },
    })
    // Teks pesan terpecah oleh tautan `Baris {b}`, jadi baris daftar diperiksa lewat textContent.
    await waitFor(
      () => {
        expect(screen.getAllByRole('listitem').map((el) => el.textContent)).toContain('Baris 1: @import tidak diizinkan.')
      },
      { timeout: 10_000 },
    )
    await new Promise((selesai) => setTimeout(selesai, 1500))
    expect(dokumen().draf).toBeNull()
  })

  it('CSS sah masuk draf lewat PUT draf dengan cssKustom', async () => {
    const user = pasang()
    await aktifkan(user)
    fireEvent.change(screen.getByRole('textbox', { name: 'CSS kustom' }), {
      target: { value: '.kartu { color: #1F4E79; }' },
    })
    await waitFor(() => expect(dokumen().draf?.cssKustom).toBe('.kartu { color: #1F4E79; }'), { timeout: 10_000 })
  })

  it('Matikan tingkat Lanjut mematikan tampilan kode tanpa menghapusnya', async () => {
    const user = pasang()
    await aktifkan(user)
    fireEvent.change(screen.getByRole('textbox', { name: 'CSS kustom' }), {
      target: { value: '.kartu { color: #1F4E79; }' },
    })
    await waitFor(() => expect(dokumen().draf?.cssKustom).toBe('.kartu { color: #1F4E79; }'), { timeout: 10_000 })
    await user.click(screen.getByRole('button', { name: 'Matikan tingkat Lanjut' }))
    await waitFor(() => expect(dokumen().lanjut.aktif).toBe(false))
    await screen.findByRole('button', { name: 'Aktifkan tingkat Lanjut' })
    expect(dokumen().draf?.cssKustom).toBe('.kartu { color: #1F4E79; }')
  })

  it('Salin prompt menyalin teks yang memuat permintaan operator', async () => {
    const user = pasang()
    // userEvent.setup() memasang stub papan klipnya sendiri, jadi stub uji dipasang setelahnya.
    const tulis = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: tulis }, configurable: true })
    await aktifkan(user)
    await user.type(screen.getAllByRole('textbox', { name: 'Apa yang ingin diubah?' })[0], 'Buat kartu lebih terang.')
    await user.click(screen.getAllByRole('button', { name: 'Salin prompt' })[0])
    expect(await screen.findByText(TOAST_SALIN)).toBeInTheDocument()
    expect(tulis).toHaveBeenCalledTimes(1)
    expect(tulis.mock.calls[0][0]).toContain('Buat kartu lebih terang.')
  })

  it('menghapus Blok HTML yang masih dipakai blok susunan ditolak dengan pesan halaman', async () => {
    masukSebagai(AKUN_UJI.operator)
    await aturLanjut(true)
    await simpanDraf(null, {
      tema: { ...TEMA_WARTA_BAWAAN('#1F4E79'), logo: PNG_KECIL, warga: { fotoLatar: null, sambutan: 'Selamat datang.' } },
      susunan: {
        ...susunanBawaan(),
        beranda: [
          {
            id: 'blk_html01',
            jenis: 'html',
            varian: 'bingkai',
            lebar: 'penuh',
            tersembunyi: false,
            isi: { htmlId: 'html_peta01' },
          },
        ],
      },
      cssKustom: '',
      blokHtml: [{ id: 'html_peta01', nama: 'Peta', kode: '<p>Peta</p>', tinggi: { mode: 'otomatis' } }],
    })
    renderRute('/admin/website/tampilan?bagian=kode')
    const user = userEvent.setup({ applyAccept: false })
    const baris = await screen.findByRole('listitem', { name: 'Peta' })
    await user.click(within(baris).getByRole('button', { name: 'Hapus' }))
    expect(await screen.findByText(PESAN_DIPAKAI)).toBeInTheDocument()
    expect(dokumen().draf?.blokHtml).toHaveLength(1)
  })
})

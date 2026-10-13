import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { UbahJenisSurat } from './UbahJenisSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function pasang(id = 'js_ss_skd') {
  masukSebagai(AKUN_UJI.operator)
  const onSelesai = vi.fn()
  const onKotor = vi.fn()
  renderPanel(
    <>
      <UbahJenisSurat id={id} onSelesai={onSelesai} onKotor={onKotor} sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return { onSelesai, onKotor, user: userEvent.setup() }
}
const skd = () => ambilDb().jenisSurat.find((j) => j.id === 'js_ss_skd')

describe('ubah jenis surat (SPEC §7.4 layar 6)', () => {
  it('terisi dari jenis surat; ubah klasifikasi, paraf, dan masa berlaku lalu simpan', async () => {
    const { onSelesai, onKotor, user } = pasang()
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Kode' })).toHaveAttribute('readonly')
    const klasifikasi = screen.getByRole('textbox', { name: 'Kode klasifikasi' })
    expect(klasifikasi).toHaveValue('470')
    await user.clear(klasifikasi)
    await user.paste('470.1')
    await user.click(screen.getByRole('checkbox', { name: 'Wajib diparaf Sekretaris Desa sebelum ditandatangani' }))
    await user.click(screen.getByRole('radio', { name: 'Tanpa batas waktu' }))
    expect(onKotor).toHaveBeenLastCalledWith(true)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalledOnce())
    expect(await screen.findByText('Jenis surat disimpan. Surat yang sudah terbit tidak berubah.')).toBeInTheDocument()
    expect(skd()).toMatchObject({ klasifikasi: '470.1', wajibParaf: true, masaBerlakuBulan: null })
  })
  it('syarat: tambah dan hapus; syarat kosong ditandai sebelum dikirim', async () => {
    const { onSelesai, user } = pasang()
    await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })
    await user.click(screen.getByRole('button', { name: 'Tambah syarat' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Syarat tidak boleh kosong')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Hapus syarat 4' }))
    await user.click(screen.getByRole('button', { name: 'Hapus syarat 3' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalledOnce())
    expect(skd()?.syarat).toEqual(['KTP', 'KK'])
  })
  it('klasifikasi salah: ditandai di kolomnya, tidak tersimpan', async () => {
    const { onSelesai, user } = pasang()
    const klasifikasi = await screen.findByRole('textbox', { name: 'Kode klasifikasi' })
    await user.clear(klasifikasi)
    await user.paste('47')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Kode klasifikasi berupa 3 angka, boleh diikuti titik dan angka, mis. 474.1')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
    expect(skd()?.klasifikasi).toBe('470')
  })
  it('setiap bagian memakai lebar penuh formulir: isian dan pratinjau tidak terjepit di setengah kolom', async () => {
    pasang()
    await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })
    for (const id of ['jenis-identitas', 'jenis-ttd', 'jenis-berlaku', 'jenis-syarat', 'jenis-isian', 'jenis-teks']) {
      const isi = document.getElementById(id)?.querySelector(':scope > div')
      expect([...(isi?.children ?? [])].every((anak) => anak.classList.contains('sm:col-span-2')), id).toBe(true)
    }
  })
  it('jenis surat tidak ada → keterangan dan tautan kembali', async () => {
    pasang('js_tidak_ada')
    expect(await screen.findByText('Jenis surat tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Jenis Surat' })).toHaveAttribute('href', '/admin/surat/jenis')
  })
  it('desa tanpa penduduk: pratinjau memakai data contoh dan menyebutnya (tahap 6C)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(<UbahJenisSurat id="js_tanjung_lamo_sktm" onSelesai={vi.fn()} sekarang={SEKARANG_UJI} />, contohSesiDesaBaru())
    expect(await screen.findByText('Pratinjau memakai data contoh, karena desa belum punya data penduduk.')).toBeInTheDocument()
    // Lembar surat menulis nama dengan huruf kapital.
    expect(screen.getByRole('region', { name: 'Pratinjau surat' })).toHaveTextContent('NAMA PEMOHON')
  })
})

describe('isian tambahan, chip sisipan, dan pratinjau (SPEC §7.4 layar 6)', () => {
  it('tambah isian: kunci dari label; chip menyisipkannya; pratinjau ikut berubah; lalu tersimpan', async () => {
    const { onSelesai, user } = pasang()
    await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })
    await user.click(screen.getByRole('button', { name: 'Tambah isian' }))
    const baru = screen.getByRole('group', { name: 'Isian 2' })
    await user.click(within(baru).getByRole('textbox', { name: 'Label' }))
    await user.paste('Nama sekolah')
    expect(within(baru).getByText('[namaSekolah]')).toBeInTheDocument()
    const teks = screen.getByRole('textbox', { name: 'Teks surat' })
    await user.click(teks)
    await user.paste(' Sekolah tujuan: ')
    await user.click(screen.getByRole('button', { name: 'Sisipkan Nama sekolah' }))
    expect((teks as HTMLTextAreaElement).value).toMatch(/Sekolah tujuan: \[namaSekolah\]$/)
    const pratinjau = screen.getByRole('region', { name: 'Pratinjau surat' })
    expect(within(pratinjau).getByText(/Sekolah tujuan: ……/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalledOnce())
    const tersimpan = skd()
    expect(tersimpan?.isian.map((d) => d.kunci)).toEqual(['keperluan', 'namaSekolah'])
    expect(tersimpan?.teks).toMatch(/\[namaSekolah\]$/)
  })
  it('isian dihapus padahal masih dipakai teks: ditandai dan tidak tersimpan (fokus review 3)', async () => {
    const { onSelesai, user } = pasang()
    await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })
    await user.click(screen.getByRole('button', { name: 'Hapus isian 1' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Sisipan [keperluan] tidak dikenal. Hapus, atau tambahkan isiannya lebih dulu.')).toBeInTheDocument()
    expect(onSelesai).not.toHaveBeenCalled()
    expect(skd()?.isian).toHaveLength(1)
  })
  it('isian pilihan: ditulis dipisah koma, minimal dua pilihan', async () => {
    const { user } = pasang('js_ss_sktm')
    await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Tidak Mampu' })
    const pilihan = within(screen.getByRole('group', { name: 'Isian 1' })).getByRole('textbox', { name: 'Pilihan' })
    expect(pilihan).toHaveValue('Pendidikan, Kesehatan, Lainnya')
    await user.clear(pilihan)
    await user.paste('Pendidikan')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Isi minimal dua pilihan')).toBeInTheDocument()
  })
  it('chip Tabel rincian disisipkan sebagai paragraf sendiri', async () => {
    const { user } = pasang('js_ss_sktm')
    const teks = await screen.findByRole('textbox', { name: 'Teks surat' })
    await user.click(teks)
    await user.click(screen.getByRole('button', { name: 'Sisipkan Tabel rincian' }))
    expect((teks as HTMLTextAreaElement).value.endsWith('\n\n[tabelRincian]')).toBe(true)
  })
})

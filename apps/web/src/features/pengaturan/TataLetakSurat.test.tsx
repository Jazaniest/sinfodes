import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { TATA_LETAK_SIAP } from '@/domain/surat/tata-letak-siap'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel, renderRute } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { TataLetakSuratDesa } from './TataLetakSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const tersimpan = () => ambilDb().pengaturanSurat.find((p) => p.desaId === 'desa_sungai_sialang')?.tataLetak

async function pasang() {
  masukSebagai(AKUN_UJI.sekdes)
  renderPanel(
    <>
      <TataLetakSuratDesa sekarang={SEKARANG_UJI} />
      <PenampungToast />
    </>,
    contohSesi('sekdes'),
  )
  await screen.findByRole('button', { name: /Kop rata tengah/ })
  await screen.findByRole('region', { name: 'Pratinjau surat' }, { timeout: 5000 })
  return userEvent.setup()
}
const pratinjau = () => screen.getByRole('region', { name: 'Pratinjau surat' })
const isiMargin = async (user: UserEvent, label: string, nilai: string) => {
  const kolom = screen.getByRole('textbox', { name: label })
  await user.clear(kolom)
  await user.type(kolom, nilai)
  await user.tab()
}

describe('Pengaturan › Tata letak surat (SPEC-V0.2 12.2)', () => {
  it('tiga kartu tata letak siap pakai; standar bertanda Dipakai; catatan QR selalu tercetak', async () => {
    await pasang()
    for (const nama of [/Standar tata naskah dinas/, /Kop dua lambang/, /Kop rata tengah/]) {
      expect(screen.getByRole('button', { name: nama })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Standar tata naskah dinas/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Kop rata tengah/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('QR, kode verifikasi, dan nomor surat selalu tercetak.')).toBeInTheDocument()
  })
  it('pratinjau memakai jenis SKTM dan menampilkan QR serta kode verifikasi contoh', async () => {
    await pasang()
    expect(await within(pratinjau()).findByRole('heading', { name: 'SURAT KETERANGAN TIDAK MAMPU' })).toBeInTheDocument()
    expect(within(pratinjau()).getByText(/Keaslian surat dapat diperiksa/)).toBeInTheDocument()
  })
  it('memilih rata tengah mengubah pratinjau (tanda tangan di tengah) dan Simpan menyimpannya', async () => {
    const user = await pasang()
    await within(pratinjau()).findByRole('heading', { name: 'SURAT KETERANGAN TIDAK MAMPU' })
    await user.click(screen.getByRole('button', { name: /Kop rata tengah/ }))
    expect(screen.getByRole('button', { name: /Kop rata tengah/ })).toHaveAttribute('aria-pressed', 'true')
    const blok = within(pratinjau()).getByText('H. Muhammad Nasir').closest('div.break-inside-avoid')
    expect(blok).toHaveClass('mx-auto')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Tata letak surat disimpan. Surat yang sudah terbit tidak berubah.')).toBeInTheDocument()
    expect(tersimpan()?.siap).toBe('rata-tengah')
  })
  it('mengubah margin menjadikan tata letak bukan siap pakai: tanda Dipakai hilang', async () => {
    const user = await pasang()
    await isiMargin(user, 'Margin kiri (mm)', '31')
    expect(screen.queryByText('Dipakai')).not.toBeInTheDocument()
  })
  it('margin 41: galat persis dan Simpan tidak mengirim', async () => {
    const user = await pasang()
    await isiMargin(user, 'Margin atas (mm)', '41')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect((await screen.findAllByText('Margin 10-40 mm.')).length).toBeGreaterThan(0)
    expect(tersimpan()).toEqual(TATA_LETAK_SIAP.standar)
    expect(screen.queryByText('Tata letak surat disimpan. Surat yang sudah terbit tidak berubah.')).not.toBeInTheDocument()
  })
  it('unsur wajib tanda tangan tidak punya tombol hapus; Turun menggeser urutannya', async () => {
    const user = await pasang()
    expect(screen.queryByRole('button', { name: /Hapus (Nama|Jabatan|Tempat dan tanggal)/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Turunkan Tempat dan tanggal' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(tersimpan()?.tandaTangan.urutan.slice(0, 2)).toEqual(['jabatan', 'tempat-tanggal']))
  })
  it('Tampilkan NIP dan Tempat cap tersimpan; pratinjau jenis lain mengganti judul suratnya', async () => {
    const user = await pasang()
    await user.click(screen.getByRole('checkbox', { name: 'Tampilkan NIP penanda tangan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Sediakan tempat cap' }))
    await user.click(screen.getByRole('button', { name: /Jenis surat untuk pratinjau/ }))
    await user.click(await screen.findByRole('option', { name: /Domisili/ }))
    expect(await within(pratinjau()).findByRole('heading', { name: 'SURAT KETERANGAN DOMISILI' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(tersimpan()?.tandaTangan).toMatchObject({ nip: true, tempatCap: true }))
  })
})

describe('Tab Tata letak surat di panel', () => {
  it('ada sesudah Penomoran untuk Sekretaris Desa; Kepala Desa tidak melihat tab dan halamannya', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const sekdes = renderRute('/admin/pengaturan/tata-letak-surat')
    const tab = await screen.findByRole('navigation', { name: 'Bagian pengaturan' }, { timeout: 5000 })
    const nama = within(tab).getAllByRole('link').map((l) => l.textContent)
    expect(nama.indexOf('Tata letak surat')).toBe(nama.indexOf('Penomoran') + 1)
    expect(within(tab).getByRole('link', { name: 'Tata letak surat' })).toHaveAttribute('aria-current', 'page')
    sekdes.unmount()
    masukSebagai(AKUN_UJI.kades)
    renderRute('/admin/pengaturan/tata-letak-surat')
    expect(await screen.findByRole('heading', { name: 'Tidak punya akses' }, { timeout: 5000 })).toBeInTheDocument()
  })
})

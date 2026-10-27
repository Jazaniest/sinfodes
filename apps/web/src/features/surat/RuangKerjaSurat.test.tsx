import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Peran } from '@/domain/pengguna/schema'
import type { Permohonan } from '@/domain/surat/permohonan'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { RuangKerjaSurat } from './RuangKerjaSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const AKUN: Readonly<Record<'operator' | 'kades' | 'kadus', string>> = {
  operator: AKUN_UJI.operator,
  kades: AKUN_UJI.kades,
  kadus: AKUN_UJI.kadus,
}
const cari = (syarat: (p: Permohonan) => boolean): Permohonan => {
  const p = ambilDb().permohonan.find(syarat)
  if (!p) throw new Error('Permohonan uji tidak ada di data demo')
  return p
}
const domisiliSiti = () => cari((p) => p.pemohonId === 'pdk_siti_rahmah')

function pasang(id: string, peran: keyof typeof AKUN = 'operator') {
  masukSebagai(AKUN[peran])
  const onKotor = vi.fn()
  const hasil = renderPanel(
    <>
      <RuangKerjaSurat id={id} sekarang={SEKARANG_UJI} onKotor={onKotor} />
      <PenampungToast />
    </>,
    contohSesi(peran as Peran),
  )
  return { ...hasil, onKotor, user: userEvent.setup() }
}
const pratinjau = () => screen.getByRole('region', { name: 'Pratinjau surat' })

describe('ruang kerja surat (SPEC §7.4 layar 3)', () => {
  it('Domisili Siti Rahmah: lembar draf, status, riwayat, pemohon, dan lampiran', async () => {
    pasang(domisiliSiti().id)
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
    const lembar = within(pratinjau()).getByRole('article', { name: 'Lembar surat keterangan domisili' })
    expect(within(lembar).getByText('SITI RAHMAH')).toBeInTheDocument()
    expect(within(lembar).getByText('Nomor: …')).toBeInTheDocument()
    expect(within(pratinjau()).getByText('Draf')).toBeInTheDocument()
    const panel = screen.getByRole('complementary', { name: 'Panel permohonan' })
    expect(within(panel).getByText('Diproses')).toBeInTheDocument()
    const riwayat = within(panel).getByRole('list', { name: 'Riwayat permohonan' })
    expect(within(riwayat).getByText('Diajukan lewat layanan warga')).toBeInTheDocument()
    expect(within(riwayat).getByText('Mulai diproses')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Siti Rahmah' })).toHaveAttribute('href', '/admin/kependudukan/penduduk/pdk_siti_rahmah')
    expect(within(panel).getByRole('list', { name: 'Lampiran dari warga' })).toHaveTextContent('KTP')
    // Di bawah 1280 px satu kolom selebar halaman, tidak melebar mengikuti lembar 21 cm.
    expect(pratinjau().parentElement).toHaveClass('grid-cols-[minmax(0,1fr)]')
  })
  it('isian yang diketik langsung tampil di lembar; Simpan mencatat riwayat (fokus review 4)', async () => {
    const { user, onKotor } = pasang(domisiliSiti().id)
    const keperluan = await screen.findByRole('textbox', { name: 'Keperluan' })
    await user.clear(keperluan)
    await user.paste('pembukaan rekening bank')
    expect(within(pratinjau()).getByText(/untuk keperluan pembukaan rekening bank dan berlaku sampai 24 Desember 2026/)).toBeInTheDocument()
    expect(onKotor).toHaveBeenLastCalledWith(true)
    await user.click(screen.getByRole('button', { name: 'Simpan isian' }))
    expect(await screen.findByText('Isian surat disimpan.')).toBeInTheDocument()
    await waitFor(() => expect(onKotor).toHaveBeenLastCalledWith(false))
    expect(within(screen.getByRole('list', { name: 'Riwayat permohonan' })).getByText('Isian diubah')).toBeInTheDocument()
  })
  it('ajukan dengan isian kosong: galat tampil di isiannya; setelah diisi, status Perlu TTD dan isian terkunci', async () => {
    const { user } = pasang(domisiliSiti().id)
    const keperluan = await screen.findByRole('textbox', { name: 'Keperluan' })
    await user.clear(keperluan)
    await user.click(screen.getByRole('button', { name: 'Ajukan tanda tangan' }))
    expect(await screen.findByText('Keperluan wajib diisi')).toBeInTheDocument()
    await user.click(keperluan)
    await user.paste('pendaftaran sekolah anak')
    expect(screen.queryByText('Keperluan wajib diisi')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ajukan tanda tangan' }))
    expect(await screen.findByText('Diajukan ke Kepala Desa untuk tanda tangan.')).toBeInTheDocument()
    expect(await screen.findByText('Perlu TTD')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Keperluan' })).not.toBeInTheDocument()
  })
  it('surat yang dikembalikan: banner berisi catatan Kades', async () => {
    pasang(cari((p) => p.pemohonId === 'pdk_zulkifli' && p.status === 'diproses').id)
    expect(await screen.findByText('Dikembalikan oleh H. Muhammad Nasir')).toBeInTheDocument()
    expect(screen.getByText('Alamat usaha belum lengkap. Tuliskan RT/RW dan nama dusunnya.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Catatan untuk petugas' })).toHaveValue('Pemohon sudah ditelepon dan akan datang melengkapi alamat usaha.')
  })
  it('surat yang sudah terbit: nomor, QR, keterangan terbit; Cetak membuka lembar cetak', async () => {
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => {})
    const p = cari((x) => x.status === 'selesai' && x.kanal === 'loket')
    const { user } = pasang(p.id)
    const lembar = await within(await screen.findByRole('region', { name: 'Pratinjau surat' })).findByRole('article')
    expect(within(lembar).getByText(`Nomor: ${p.terbit?.nomor ?? '-'}`)).toBeInTheDocument()
    expect(within(lembar).getByRole('img', { name: `Kode QR verifikasi ${p.terbit?.kodeVerifikasi ?? '-'}` })).toBeInTheDocument()
    expect(within(pratinjau()).queryByText('Draf')).not.toBeInTheDocument()
    const panel = screen.getByRole('complementary', { name: 'Panel permohonan' })
    expect(within(panel).getByText(p.terbit?.kodeVerifikasi ?? '-')).toBeInTheDocument()
    expect(within(panel).getByText('Lampiran dari warga')).toBeInTheDocument()
    expect(within(panel).getByText('Permohonan loket: berkas persyaratan diperiksa langsung di kantor desa.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cetak' }))
    expect(cetak).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: 'Lembar cetak' })).toBeInTheDocument()
    window.dispatchEvent(new Event('afterprint'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Lembar cetak' })).not.toBeInTheDocument())
  })
  it('surat kelahiran menautkan bayi sebagai subjeknya', async () => {
    const p = cari((x) => x.jenisId === 'js_ss_skl')
    pasang(p.id)
    const panel = await screen.findByRole('complementary', { name: 'Panel permohonan' })
    const bayi = ambilDb().penduduk.find((o) => o.id === p.subjekId)
    expect(within(panel).getByRole('link', { name: bayi?.nama ?? '-' })).toHaveAttribute('href', `/admin/kependudukan/penduduk/${p.subjekId ?? ''}`)
  })
  it('Kades melihat isian sebagai daftar, tanpa Simpan dan tanpa aksi pada status Diproses', async () => {
    pasang(domisiliSiti().id, 'kades')
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Keperluan' })).not.toBeInTheDocument()
    expect(screen.getByText('pendaftaran sekolah anak')).toBeInTheDocument()
    expect(screen.getByText('Tidak ada aksi untuk peran Anda pada status ini.')).toBeInTheDocument()
  })
  it('Kepala Dusun membuka permohonan dari dusun lain → tidak ditemukan, dengan tautan kembali (fokus review 1)', async () => {
    pasang(cari((p) => p.dusunId !== 'dsn_ss_2').id, 'kadus')
    expect(await screen.findByRole('heading', { level: 1, name: 'Permohonan tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar permohonan' })).toHaveAttribute('href', '/admin/surat')
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatAngka } from '@/domain/format/angka'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import type { Peran } from '@/domain/pengguna/schema'
import type { FilterPermohonan } from '@/domain/surat/permohonan'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarPermohonan } from './DaftarPermohonan'
import { FILTER_PERMOHONAN_BAWAAN } from './filter-url'

pakaiApiTiruan()

const TABEL = { name: 'Daftar permohonan surat' }

function pasang(filter: Partial<FilterPermohonan> = {}, peran: Peran = 'operator') {
  masukSebagai(peran === 'kadus' ? AKUN_UJI.kadus : AKUN_UJI.operator)
  const onUbahFilter = vi.fn()
  const onBuka = vi.fn()
  const hasil = renderPanel(
    <DaftarPermohonan filter={{ ...FILTER_PERMOHONAN_BAWAAN, ...filter }} onUbahFilter={onUbahFilter} onBuka={onBuka} sekarang={SEKARANG_UJI} />,
    contohSesi(peran),
  )
  return { ...hasil, onUbahFilter, onBuka, user: userEvent.setup() }
}

describe('Daftar permohonan (SPEC §7.4 layar 1)', () => {
  it('tab per status beserta jumlahnya; Menunggu terlama dulu, lama menunggu berwarna', async () => {
    pasang()
    expect(screen.getByRole('heading', { level: 1, name: 'Permohonan' })).toBeInTheDocument()
    const tab = screen.getByRole('navigation', { name: 'Status permohonan' })
    expect(await within(tab).findByRole('link', { name: 'Menunggu, 7 permohonan' })).toHaveAttribute('aria-current', 'page')
    expect(within(tab).getByRole('link', { name: 'Diproses, 5 permohonan' })).toHaveAttribute('href', '/admin/surat?status=diproses')
    expect(screen.getByText('7 menunggu · 5 diproses · 3 perlu tanda tangan')).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', TABEL)
    const baris = within(tabel).getAllByRole('row')
    expect(baris).toHaveLength(8)
    expect(within(baris[1]).getByText('2 hari kerja')).toHaveClass('text-oker')
    expect(within(baris[1]).getByText(/· Online$/)).toBeInTheDocument()
  })
  it('tab Diproses: surat yang dikembalikan diberi keterangan', async () => {
    pasang({ status: 'diproses' })
    const tabel = await screen.findByRole('grid', TABEL)
    const zulkifli = (await within(tabel).findByText('Zulkifli')).closest('tr')
    expect(zulkifli).not.toBeNull()
    expect(within(zulkifli as HTMLElement).getByText('dikembalikan')).toBeInTheDocument()
    expect(within(zulkifli as HTMLElement).getByText('Surat Keterangan Usaha')).toBeInTheDocument()
  })
  it('filter jenis; pilihan periode tidak tampil untuk status yang masih terbuka', async () => {
    const { user, onUbahFilter } = pasang()
    await screen.findByRole('grid', TABEL)
    expect(screen.queryByRole('button', { name: /Periode/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Jenis surat/ }))
    await user.click(await screen.findByRole('option', { name: 'Surat Keterangan Domisili' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ jenis: 'SKD', page: 1 })
  })
  it('tab Selesai: periode bisa diganti', async () => {
    const { user, onUbahFilter } = pasang({ status: 'selesai' })
    await screen.findByRole('grid', TABEL)
    await user.click(screen.getByRole('button', { name: /Periode/ }))
    await user.click(await screen.findByRole('option', { name: '30 hari terakhir' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ periode: 30, page: 1 })
  })
  it('jenis tanpa permohonan → Tampilkan semua jenis', async () => {
    // SPN hanya dilayani di loket, sedangkan penolakan di data demo hanya untuk permohonan online.
    const { user, onUbahFilter } = pasang({ status: 'ditolak', jenis: 'SPN' })
    expect(await screen.findByText('Tidak ada permohonan ditolak untuk jenis surat ini')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tampilkan semua jenis' }))
    expect(onUbahFilter).toHaveBeenCalledWith({ jenis: undefined, page: 1 })
  })
  it('cari nama di semua status; tidak ada tab yang aktif selama mencari', async () => {
    const { user } = pasang()
    await screen.findByRole('grid', TABEL)
    await user.click(screen.getByRole('searchbox', { name: 'Cari permohonan' }))
    await user.paste('Zulkifli')
    expect(await screen.findByText('Hasil pencarian di semua status, terbaru dulu.')).toBeInTheDocument()
    const tabel = screen.getByRole('grid', TABEL)
    expect((await within(tabel).findAllByText('Surat Keterangan Usaha')).length).toBeGreaterThan(0)
    expect(within(screen.getByRole('navigation', { name: 'Status permohonan' })).queryByRole('link', { current: 'page' })).toBeNull()
  })
  it('klik baris membuka ruang kerja', async () => {
    const { user, onBuka } = pasang()
    const tabel = await screen.findByRole('grid', TABEL)
    await user.click(within(tabel).getAllByRole('row')[1])
    expect(onBuka).toHaveBeenCalledWith(expect.stringMatching(/^srt_/))
  })
  it('Kepala Dusun hanya melihat permohonan dari dusunnya', async () => {
    pasang({ status: 'selesai', periode: 365 }, 'kadus')
    const awal = tanggalIsoWib(new Date(SEKARANG_UJI.getTime() - 364 * 86_400_000))
    const jumlah = ambilDb().permohonan.filter(
      (p) => p.dusunId === 'dsn_ss_2' && p.status === 'selesai' && p.masukPada.slice(0, 10) >= awal,
    ).length
    expect(await screen.findByText(`1-25 dari ${formatAngka(jumlah)}`)).toBeInTheDocument()
  })
  it('Buat surat untuk petugas; tidak untuk Kepala Desa (fokus review 5)', async () => {
    const { unmount } = pasang()
    expect(await screen.findByRole('link', { name: 'Buat surat' })).toHaveAttribute('href', '/admin/surat/baru')
    unmount()
    pasang({}, 'kades')
    await screen.findByRole('grid', TABEL)
    expect(screen.queryByRole('link', { name: 'Buat surat' })).not.toBeInTheDocument()
  })
  it('Tanda tangani untuk Kepala Desa; tidak untuk Operator', async () => {
    const { unmount } = pasang({}, 'kades')
    expect(await screen.findByRole('link', { name: 'Tanda tangani' })).toHaveAttribute('href', '/admin/surat/tanda-tangan')
    unmount()
    pasang()
    await screen.findByRole('grid', TABEL)
    expect(screen.queryByRole('link', { name: 'Tanda tangani' })).not.toBeInTheDocument()
  })
  it('tab modul Permohonan · Arsip · Jenis Surat (SPEC §5.2)', async () => {
    pasang()
    const tab = screen.getByRole('navigation', { name: 'Bagian layanan surat' })
    expect(within(tab).getByRole('link', { name: 'Permohonan' })).toHaveAttribute('aria-current', 'page')
    expect(within(tab).getByRole('link', { name: 'Arsip' })).toHaveAttribute('href', '/admin/surat/arsip')
    expect(within(tab).getByRole('link', { name: 'Jenis Surat' })).toHaveAttribute('href', '/admin/surat/jenis')
    await screen.findByRole('grid', TABEL)
  })
})

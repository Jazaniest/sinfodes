import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilPermohonan, jalankanAksi } from '@/api/surat'
import type { Peran } from '@/domain/pengguna/schema'
import type { Permohonan } from '@/domain/surat/permohonan'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { AksiSurat } from './AksiSurat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

const AKUN: Readonly<Record<'operator' | 'sekdes' | 'kades' | 'kadus', string>> = {
  operator: AKUN_UJI.operator,
  sekdes: AKUN_UJI.sekdes,
  kades: AKUN_UJI.kades,
  kadus: AKUN_UJI.kadus,
}
const cari = (syarat: (p: Permohonan) => boolean): Permohonan => {
  const p = ambilDb().permohonan.find(syarat)
  if (!p) throw new Error('Permohonan uji tidak ada di data demo')
  return p
}
const dariDb = (id: string) => ambilDb().permohonan.find((p) => p.id === id)
const teleponPemohon = (p: Permohonan) => ambilDb().penduduk.find((o) => o.id === p.pemohonId)?.telepon ?? null

async function pasang(id: string, peran: keyof typeof AKUN, isian?: Record<string, string>) {
  masukSebagai(AKUN[peran])
  const d = await ambilPermohonan(id)
  const onBerhasil = vi.fn()
  const onGalatIsian = vi.fn()
  const onCetak = vi.fn()
  const hasil = renderPanel(
    <>
      <AksiSurat d={d} isian={isian ?? d.permohonan.isian} onBerhasil={onBerhasil} onGalatIsian={onGalatIsian} onCetak={onCetak} />
      <PenampungToast />
    </>,
    contohSesi(peran as Peran),
  )
  return { ...hasil, d, onBerhasil, onGalatIsian, onCetak, user: userEvent.setup() }
}

describe('aksi ruang kerja surat (SPEC §7.4)', () => {
  it('Menunggu: Operator memproses; Kades tidak punya aksi', async () => {
    const id = cari((p) => p.status === 'menunggu').id
    const { user, onBerhasil, unmount } = await pasang(id, 'operator')
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Proses' }))
    expect(await screen.findByText('Permohonan mulai diproses.')).toBeInTheDocument()
    expect(onBerhasil).toHaveBeenCalledWith('proses')
    expect(dariDb(id)?.status).toBe('diproses')
    unmount()
    await pasang(id, 'kades')
    expect(screen.getByText('Tidak ada aksi untuk peran Anda pada status ini.')).toBeInTheDocument()
  })
  it('Tolak: alasan wajib; tersimpan bersama alasannya', async () => {
    const id = cari((p) => p.status === 'menunggu').id
    const { user } = await pasang(id, 'operator')
    await user.click(screen.getByRole('button', { name: 'Tolak' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tolak permohonan?' })
    await user.click(within(dialog).getByRole('textbox', { name: 'Alasan penolakan' }))
    await user.paste('Foto KTP tidak terbaca.')
    await user.click(within(dialog).getByRole('button', { name: 'Tolak permohonan' }))
    expect(await screen.findByText('Permohonan ditolak.')).toBeInTheDocument()
    expect(dariDb(id)?.penolakan?.catatan).toBe('Foto KTP tidak terbaca.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('Ajukan tanda tangan mengirim isian yang tampil; galat isian diteruskan (fokus review 3)', async () => {
    const id = cari((p) => p.pemohonId === 'pdk_siti_rahmah').id
    const { user, onGalatIsian, unmount } = await pasang(id, 'operator', { keperluan: '' })
    await user.click(screen.getByRole('button', { name: 'Ajukan tanda tangan' }))
    await waitFor(() => expect(onGalatIsian).toHaveBeenCalledWith({ keperluan: 'Keperluan wajib diisi' }))
    expect(await screen.findByText('Isian surat belum lengkap. Periksa isian yang ditandai.')).toBeInTheDocument()
    expect(dariDb(id)?.status).toBe('diproses')
    unmount()
    const lagi = await pasang(id, 'operator', { keperluan: 'pembukaan rekening bank' })
    await lagi.user.click(screen.getByRole('button', { name: 'Ajukan tanda tangan' }))
    expect(await screen.findByText('Diajukan ke Kepala Desa untuk tanda tangan.')).toBeInTheDocument()
    expect(dariDb(id)?.isian).toEqual({ keperluan: 'pembukaan rekening bank' })
  })
  it('Sekdes memaraf SKTM, tanpa tombol tanda tangan (SKTM tidak boleh a.n.)', async () => {
    const id = cari((p) => p.status === 'perlu-ttd' && p.tahap === 'paraf').id
    const { user } = await pasang(id, 'sekdes')
    expect(screen.queryByRole('button', { name: 'Tanda tangani' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Paraf' }))
    expect(await screen.findByText('Surat diparaf. Kini menunggu tanda tangan Kepala Desa.')).toBeInTheDocument()
    expect(dariDb(id)?.tahap).toBe('tanda-tangan')
  })
  it('Kades menandatangani: passphrase salah tampil di dialog; yang benar memberi nomor', async () => {
    const id = cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && p.jenisId === 'js_ss_skd').id
    const { user } = await pasang(id, 'kades')
    await user.click(screen.getByRole('button', { name: 'Tanda tangani' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })
    const kolom = within(dialog).getByLabelText('Passphrase tanda tangan elektronik')
    await user.click(kolom)
    await user.paste('salah')
    await user.click(within(dialog).getByRole('button', { name: 'Tanda tangani' }))
    expect(await within(dialog).findByText('Passphrase salah. Periksa kembali, lalu coba lagi.')).toBeInTheDocument()
    await user.clear(kolom)
    await user.paste('sialang2026')
    await user.click(within(dialog).getByRole('button', { name: 'Tanda tangani' }))
    expect(await screen.findByText(/^Surat ditandatangani\. Nomor 470\/\d{3}\/SS\/IX\/2026\.$/)).toBeInTheDocument()
    expect(dariDb(id)?.status).toBe('selesai')
  })
  it('Sekdes menandatangani Domisili atas nama Kepala Desa', async () => {
    const id = cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && p.jenisId === 'js_ss_skd').id
    const { user } = await pasang(id, 'sekdes')
    await user.click(screen.getByRole('button', { name: 'Tanda tangani' }))
    expect(await screen.findByRole('dialog', { name: 'Tanda tangani surat?' })).toHaveTextContent('Anda menandatangani atas nama Kepala Desa.')
  })
  it('Kades mengembalikan dengan catatan', async () => {
    const id = cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan').id
    const { user } = await pasang(id, 'kades')
    await user.click(screen.getByRole('button', { name: 'Kembalikan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kembalikan ke operator?' })
    await user.click(within(dialog).getByRole('textbox', { name: 'Catatan perbaikan' }))
    await user.paste('Keperluan kurang jelas.')
    await user.click(within(dialog).getByRole('button', { name: 'Kembalikan' }))
    expect(await screen.findByText('Surat dikembalikan ke operator untuk diperbaiki.')).toBeInTheDocument()
    expect(dariDb(id)?.dikembalikan?.catatan).toBe('Keperluan kurang jelas.')
  })
  it('Selesai, Operator: cetak, unduh PDF, kirim WhatsApp, tandai diambil; tanpa Batalkan', async () => {
    const p = cari((x) => x.status === 'selesai' && x.diambil === null && teleponPemohon(x) !== null)
    const { user, onCetak } = await pasang(p.id, 'operator')
    for (const nama of ['Cetak', 'Unduh PDF', 'Kirim ke WhatsApp', 'Tandai sudah diambil']) {
      expect(screen.getByRole('button', { name: nama })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Batalkan surat' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unduh PDF' }))
    expect(screen.getByText('Pilih “Simpan sebagai PDF” di jendela cetak.')).toBeInTheDocument()
    expect(onCetak).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Kirim ke WhatsApp' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kirim ke WhatsApp?' })
    expect(dialog).toHaveTextContent(`Nomor: ${p.terbit?.nomor ?? '-'}`)
    await user.click(within(dialog).getByRole('button', { name: 'Kirim' }))
    expect(await screen.findByText(/^Pesan terkirim ke \d{4}-••••-\d{4}$/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tandai sudah diambil' }))
    expect(await screen.findByText('Ditandai sudah diambil.')).toBeInTheDocument()
    expect(dariDb(p.id)?.diambil?.oleh.nama).toBe('Rosmiati')
  })
  it('pemohon tanpa nomor telepon: tombol Kirim ke WhatsApp tidak tampil', async () => {
    const p = cari((x) => x.status === 'selesai' && teleponPemohon(x) === null)
    await pasang(p.id, 'operator')
    expect(screen.getByRole('button', { name: 'Cetak' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kirim ke WhatsApp' })).not.toBeInTheDocument()
  })
  it('Kades membatalkan surat yang sudah terbit', async () => {
    const id = cari((x) => x.status === 'selesai').id
    const { user } = await pasang(id, 'kades')
    await user.click(screen.getByRole('button', { name: 'Batalkan surat' }))
    const dialog = await screen.findByRole('dialog', { name: 'Batalkan surat ini?' })
    await user.click(within(dialog).getByRole('textbox', { name: 'Alasan pembatalan' }))
    await user.paste('Salah ketik nama usaha.')
    await user.click(within(dialog).getByRole('button', { name: 'Batalkan surat' }))
    expect(await screen.findByText('Surat dibatalkan. Nomornya tetap tercatat.')).toBeInTheDocument()
    expect(dariDb(id)?.status).toBe('dibatalkan')
  })
  it('Kepala Dusun: tanpa aksi dan tanpa cetak', async () => {
    const id = cari((x) => x.status === 'selesai' && x.dusunId === 'dsn_ss_2').id
    await pasang(id, 'kadus')
    expect(screen.getByText('Tidak ada aksi untuk peran Anda pada status ini.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cetak' })).not.toBeInTheDocument()
  })
  it('status sudah diubah orang lain → pesan, tanpa perubahan ganda (fokus review 2)', async () => {
    const id = cari((p) => p.status === 'menunggu').id
    const { user } = await pasang(id, 'operator')
    await jalankanAksi(id, 'proses')
    await user.click(screen.getByRole('button', { name: 'Proses' }))
    expect(await screen.findByText('Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.')).toBeInTheDocument()
    expect(dariDb(id)?.riwayat.filter((r) => r.kejadian === 'proses')).toHaveLength(1)
  })
})

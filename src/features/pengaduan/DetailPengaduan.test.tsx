import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { StatusPengaduan } from '@/domain/pengaduan/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { DetailPengaduan } from './DetailPengaduan'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

type Peran = 'operator' | 'kades' | 'kadus'
const AKUN: Record<Peran, string> = { operator: AKUN_UJI.operator, kades: AKUN_UJI.kades, kadus: AKUN_UJI.kadus }
const idDengan = (status: StatusPengaduan, dusunId?: string) =>
  ambilDb().pengaduan.find((a) => a.status === status && (dusunId === undefined || a.dusunId === dusunId))?.id ?? '-'

function pasang(id: string, peran: Peran = 'operator') {
  masukSebagai(AKUN[peran])
  renderPanel(
    <>
      <DetailPengaduan id={id} />
      <PenampungToast />
    </>,
    contohSesi(peran),
  )
  return userEvent.setup()
}

describe('detail pengaduan (SPEC §8)', () => {
  it('balasan pertama: kosong ditolak, lalu terkirim; Baru → Ditanggapi (fokus review 2)', async () => {
    const id = idDengan('baru', 'dsn_ss_3')
    const user = pasang(id)
    expect(await screen.findByRole('heading', { level: 1, name: 'Jalan berlubang di RT 012' })).toBeInTheDocument()
    const percakapan = screen.getByRole('list', { name: 'Percakapan' })
    expect(within(percakapan).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('complementary', { name: 'Rincian pengaduan' })).getByText('Belum dibalas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai selesai' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }))
    expect(screen.getByText('Balasan wajib diisi')).toBeInTheDocument()
    await user.click(screen.getByRole('textbox', { name: 'Balasan untuk warga' }))
    await user.paste('Kepala dusun meninjau lokasi besok pagi.')
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }))
    expect(await screen.findByText('Balasan terkirim. Warga bisa membacanya di layanan warga.')).toBeInTheDocument()
    expect(await within(percakapan).findByText('Kepala dusun meninjau lokasi besok pagi.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Balasan untuk warga' })).toHaveValue('')
    expect(await screen.findByRole('button', { name: 'Tandai selesai' })).toBeInTheDocument()
    expect(ambilDb().pengaduan.find((a) => a.id === id)?.status).toBe('ditanggapi')
  })
  it('Tandai selesai menyembunyikan formulir balasan; Buka kembali memunculkannya lagi (fokus review 2)', async () => {
    const user = pasang(idDengan('ditanggapi'))
    await user.click(await screen.findByRole('button', { name: 'Tandai selesai' }))
    expect(await screen.findByText('Pengaduan ditandai selesai.')).toBeInTheDocument()
    expect(await screen.findByText('Pengaduan ini sudah selesai. Buka kembali untuk membalas warga.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Balasan untuk warga' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buka kembali' }))
    expect(await screen.findByRole('textbox', { name: 'Balasan untuk warga' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Percakapan' })).getByText(/^Dibuka kembali oleh Rosmiati/)).toBeInTheDocument()
  })
  it('Kepala Desa hanya membaca: tanpa formulir balasan dan tombol status (fokus review 4)', async () => {
    pasang(idDengan('ditanggapi'), 'kades')
    expect(await screen.findByRole('list', { name: 'Percakapan' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Balasan untuk warga' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai selesai' })).not.toBeInTheDocument()
  })
  it('Kepala Dusun II membuka pengaduan dusun lain → tidak ditemukan (fokus review 1)', async () => {
    pasang(idDengan('baru', 'dsn_ss_3'), 'kadus')
    expect(await screen.findByText('Pengaduan tidak ditemukan')).toBeInTheDocument()
  })
  it('foto dan lokasi dari warga tampil bila ada', async () => {
    const a = ambilDb().pengaduan.find((x) => {
      const pertama = x.percakapan[0]
      return pertama.jenis === 'warga' && pertama.foto !== null && x.lokasi !== null
    })
    const pertama = a?.percakapan[0]
    if (!a?.lokasi || pertama?.jenis !== 'warga' || !pertama.foto) throw new Error('Data demo tanpa pengaduan berfoto')
    pasang(a.id)
    expect(await screen.findByText(`Foto: ${pertama.foto.berkas} · ${pertama.foto.ukuranKb} KB`)).toBeInTheDocument()
    expect(within(screen.getByRole('complementary', { name: 'Rincian pengaduan' })).getByText(a.lokasi)).toBeInTheDocument()
  })
})

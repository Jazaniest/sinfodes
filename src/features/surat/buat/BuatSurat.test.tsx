import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { aturLebarLayar } from '@/test/layar'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { kosongkanToast } from '@/ui/toast/antrean'
import { PenampungToast } from '@/ui/toast/PenampungToast'
import { BuatSurat } from './BuatSurat'
import { CARI_BUAT_BAWAAN, type CariBuatSurat } from './cari-buat'

pakaiApiTiruan({ dbSegarTiapUji: true })
afterEach(() => kosongkanToast())

function Uji({ awal, onSelesai }: { awal: Partial<CariBuatSurat>; onSelesai: (id: string) => void }) {
  const [cari, setCari] = useState<CariBuatSurat>({ ...CARI_BUAT_BAWAAN, ...awal })
  return <BuatSurat cari={cari} onUbahCari={(ubah) => setCari((lama) => ({ ...lama, ...ubah }))} onSelesai={onSelesai} sekarang={SEKARANG_UJI} />
}

function pasang(awal: Partial<CariBuatSurat> = {}) {
  masukSebagai(AKUN_UJI.operator)
  const onSelesai = vi.fn()
  const hasil = renderPanel(
    <>
      <Uji awal={awal} onSelesai={onSelesai} />
      <PenampungToast />
    </>,
    contohSesi('operator'),
  )
  return { ...hasil, onSelesai, user: userEvent.setup() }
}

const langkahAktif = () => within(screen.getByRole('list', { name: 'Langkah buat surat' })).getByRole('listitem', { current: 'step' })

describe('Buat surat di loket (SPEC §7.4 layar 2)', () => {
  it('Domisili untuk Siti Rahmah dari profilnya: jenis → pemohon → isian → pratinjau → ajukan', async () => {
    const { user, onSelesai } = pasang({ pemohon: 'pdk_siti_rahmah' })
    expect(await screen.findByText(/Untuk/)).toHaveTextContent('Untuk Siti Rahmah')
    const daftar = await screen.findByRole('list', { name: 'Jenis surat' })
    const domisili = within(daftar).getAllByRole('listitem').find((b) => b.textContent?.includes('Surat Keterangan Domisili'))
    if (!domisili) throw new Error('Domisili tidak ada di daftar')
    await user.click(within(domisili).getByRole('button'))
    expect(await screen.findByRole('heading', { name: 'Ringkasan pemohon' })).toBeInTheDocument()
    expect(langkahAktif()).toHaveTextContent('Pemohon')
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    const keperluan = await screen.findByRole('textbox', { name: 'Keperluan' })
    await user.click(screen.getByRole('button', { name: 'Lanjut ke pratinjau' }))
    expect(await screen.findByText('Keperluan wajib diisi')).toBeInTheDocument()
    await user.click(keperluan)
    await user.paste('pembukaan rekening bank')
    await user.click(screen.getByRole('button', { name: 'Lanjut ke pratinjau' }))
    const lembar = await screen.findByRole('article', { name: 'Lembar surat keterangan domisili' })
    expect(within(lembar).getByText(/untuk keperluan pembukaan rekening bank/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ajukan tanda tangan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalledWith(expect.stringMatching(/^srt_/)))
    expect(await screen.findByText('Surat dibuat dan diajukan ke Kepala Desa untuk tanda tangan.')).toBeInTheDocument()
    const id = String(onSelesai.mock.calls[0][0])
    expect(ambilDb().permohonan.find((p) => p.id === id)).toMatchObject({
      kanal: 'loket', status: 'perlu-ttd', pemohonId: 'pdk_siti_rahmah', isian: { keperluan: 'pembukaan rekening bank' },
    })
  })
  it('Simpan draf → permohonan Diproses', async () => {
    const { user, onSelesai } = pasang({ jenis: 'SKD', pemohon: 'pdk_siti_rahmah', langkah: 3 })
    await user.click(await screen.findByRole('textbox', { name: 'Keperluan' }))
    await user.paste('pengurusan BPJS Kesehatan')
    await user.click(screen.getByRole('button', { name: 'Lanjut ke pratinjau' }))
    await user.click(await screen.findByRole('button', { name: 'Simpan draf' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalled())
    expect(await screen.findByText('Draf surat disimpan dengan status Diproses.')).toBeInTheDocument()
    expect(ambilDb().permohonan.find((p) => p.id === String(onSelesai.mock.calls[0][0]))?.status).toBe('diproses')
  })
  it('klik ganda Ajukan tanda tangan → satu permohonan saja (fokus review 4)', async () => {
    aturModeJaringan('normal')
    const sebelum = ambilDb().permohonan.length
    const { user, onSelesai } = pasang({ jenis: 'SKD', pemohon: 'pdk_siti_rahmah', langkah: 3 })
    await user.click(await screen.findByRole('textbox', { name: 'Keperluan' }, { timeout: 3000 }))
    await user.paste('pembukaan rekening bank')
    await user.click(screen.getByRole('button', { name: 'Lanjut ke pratinjau' }))
    await user.dblClick(await screen.findByRole('button', { name: 'Ajukan tanda tangan' }))
    await waitFor(() => expect(onSelesai).toHaveBeenCalled(), { timeout: 3000 })
    expect(onSelesai).toHaveBeenCalledOnce()
    expect(ambilDb().permohonan).toHaveLength(sebelum + 1)
  })
  it('langkah yang dilompati lewat URL kembali ke langkah yang belum lengkap (fokus review 2)', async () => {
    const { unmount } = pasang({ langkah: 4 })
    expect(await screen.findByRole('list', { name: 'Jenis surat' })).toBeInTheDocument()
    unmount()
    pasang({ langkah: 4, jenis: 'SKD' })
    expect(await screen.findByRole('combobox', { name: 'Pemohon' })).toHaveValue('')
    expect(langkahAktif()).toHaveTextContent('Pemohon')
  })
  it('pemohon Meninggal dari tautan → diblokir di langkah Pemohon (fokus review 1)', async () => {
    const almarhum = ambilDb().penduduk.find((p) => p.statusDasar === 'Meninggal' && p.desaId === 'desa_sungai_sialang')
    pasang({ jenis: 'SKD', pemohon: almarhum?.id, langkah: 3 })
    expect(await screen.findByText('Surat tidak bisa dibuat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled()
    expect(screen.queryByRole('textbox', { name: 'Keperluan' })).not.toBeInTheDocument()
  })
  it('surat kelahiran dari tawaran mutasi: orang tua sebagai pemohon dan pelapor terisi dari mutasinya', async () => {
    const lahir = ambilDb().mutasi.find((m) => m.jenis === 'lahir' && m.tanggal.startsWith('2026-09'))
    if (lahir?.jenis !== 'lahir') throw new Error('Mutasi lahir bulan ini tidak ada')
    const { user } = pasang({ jenis: 'SKL', subjek: lahir.pendudukIds[0], langkah: 2 })
    expect(await screen.findByText(/Isian diambil dari kelahiran yang dicatat/)).toBeInTheDocument()
    const orangTua = ambilDb().penduduk.filter((p) => p.id === lahir.rincian.ayahId || p.id === lahir.rincian.ibuId).map((p) => p.nama)
    await waitFor(() => expect(orangTua).toContain((screen.getByRole('combobox', { name: 'Pemohon (pelapor)' }) as HTMLInputElement).value))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(await screen.findByRole('textbox', { name: 'Nama pelapor' })).toHaveValue(lahir.rincian.pelapor)
  })
  it('layar ≥ 1280px: pratinjau di samping sejak langkah 2; layar lebih sempit tanpa pratinjau samping', async () => {
    aturLebarLayar(1366)
    const { unmount } = pasang({ jenis: 'SKD', pemohon: 'pdk_siti_rahmah', langkah: 2 })
    const samping = await screen.findByRole('region', { name: 'Pratinjau surat' })
    expect(within(samping).getByText('SITI RAHMAH')).toBeInTheDocument()
    unmount()
    aturLebarLayar(1024)
    pasang({ jenis: 'SKD', pemohon: 'pdk_siti_rahmah', langkah: 2 })
    expect(await screen.findByRole('heading', { name: 'Ringkasan pemohon' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pratinjau surat' })).not.toBeInTheDocument()
  })
})

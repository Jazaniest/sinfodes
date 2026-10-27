import { screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { pakaiBerkasNode } from '@/test/berkas-node'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { DaftarPengaduan } from './DaftarPengaduan'
import { FormPengaduan } from './FormPengaduan'

pakaiApiTiruan({ dbSegarTiapUji: true })
pakaiBerkasNode()

const kecilkan = async (f: File) => new File([new Uint8Array(180 * 1024)], f.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
const CERITA = 'Lampu jalan di depan surau mati sejak Senin. Malam hari gelap sekali.'

async function isiPengaduan(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /Kategori$/ }))
  await user.click(await screen.findByRole('option', { name: 'Infrastruktur' }))
  await user.type(screen.getByRole('textbox', { name: 'Cerita' }), CERITA)
  await user.type(screen.getByRole('textbox', { name: 'Lokasi (tidak wajib)' }), 'Depan surau RT 004')
}

describe('Pengaduan saya (SPEC §10)', () => {
  it('daftar pengaduan milik warga dengan status, dan tombol Sampaikan pengaduan', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    renderWarga(<DaftarPengaduan />, {
      ...contohSesiWarga(),
      penduduk: { id: 'pdk_zulkifli', nama: 'Zulkifli', nik: '1405091706848005', keluargaId: 'kk_zulkifli' },
    })
    const milik = ambilDb().pengaduan.find((a) => a.pelapor.pendudukId === 'pdk_zulkifli')
    if (!milik) throw new Error('Pengaduan Zulkifli tidak ada di seed')
    const tautan = await screen.findByRole('link', { name: new RegExp(milik.judul) })
    expect(tautan).toHaveAttribute('href', `/warga/pengaduan/${milik.id}`)
    expect(tautan).toHaveTextContent('Baru')
    expect(screen.getByRole('link', { name: 'Sampaikan pengaduan' })).toHaveAttribute('href', '/warga/pengaduan/baru')
  })
  it('kirim pengaduan dengan foto → onTerkirim dengan ID dan nomornya; draf dibuang', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const onTerkirim = vi.fn()
    renderWarga(<FormPengaduan onTerkirim={onTerkirim} kecilkan={kecilkan} />)
    const user = userEvent.setup({ applyAccept: false })
    await screen.findByRole('heading', { level: 1, name: 'Sampaikan pengaduan' })
    await isiPengaduan(user)
    const input = screen.getByRole('group', { name: 'Foto (tidak wajib)' }).querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('Input foto tidak ada')
    await user.upload(input, new File([new Uint8Array(2500 * 1024)], 'lampu.png', { type: 'image/png' }))
    await screen.findByText('lampu.jpg')
    await user.click(screen.getByRole('button', { name: 'Kirim pengaduan' }))
    await vi.waitFor(() => expect(onTerkirim).toHaveBeenCalledWith(expect.stringMatching(/^adu_/), expect.stringMatching(/^ADU-2026-\d{3}$/)))
    expect(localStorage.getItem('sinfodes.draf.warga.aduan.pdk_siti_rahmah')).toBeNull()
  })
  it('cerita terlalu pendek dan kategori kosong ditandai sebelum dikirim', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<FormPengaduan onTerkirim={() => {}} kecilkan={kecilkan} />)
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 1, name: 'Sampaikan pengaduan' })
    await user.type(screen.getByRole('textbox', { name: 'Cerita' }), 'Jalan rusak')
    await user.click(screen.getByRole('button', { name: 'Kirim pengaduan' }))
    expect(screen.getByText('Pilih kategori pengaduan.')).toBeInTheDocument()
    expect(screen.getByText('Ceritakan masalahnya, paling sedikit 20 huruf.')).toBeInTheDocument()
  })
  it('kirim gagal: cerita tetap; Kirim ulang berhasil sekali saja (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const onTerkirim = vi.fn()
    renderWarga(<FormPengaduan onTerkirim={onTerkirim} kecilkan={kecilkan} />)
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 1, name: 'Sampaikan pengaduan' })
    await isiPengaduan(user)
    const sebelum = ambilDb().pengaduan.length
    aturModeJaringan('gagal')
    await user.click(screen.getByRole('button', { name: 'Kirim pengaduan' }))
    expect(await screen.findByText('Pengaduan belum terkirim')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cerita' })).toHaveValue(CERITA)
    aturModeJaringan('instan')
    await user.click(screen.getByRole('button', { name: 'Kirim ulang' }))
    await vi.waitFor(() => expect(onTerkirim).toHaveBeenCalledTimes(1))
    expect(ambilDb().pengaduan.length).toBe(sebelum + 1)
  })
  it('draf: cerita kembali saat formulir dibuka lagi (fokus review 4)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const pertama = renderWarga(<FormPengaduan onTerkirim={() => {}} kecilkan={kecilkan} />)
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 1, name: 'Sampaikan pengaduan' })
    await user.type(screen.getByRole('textbox', { name: 'Cerita' }), CERITA)
    pertama.unmount()
    renderWarga(<FormPengaduan onTerkirim={() => {}} kecilkan={kecilkan} />)
    expect(await screen.findByRole('textbox', { name: 'Cerita' })).toHaveValue(CERITA)
    expect(screen.getByText('Melanjutkan cerita yang tersimpan di HP ini')).toBeInTheDocument()
  })
})

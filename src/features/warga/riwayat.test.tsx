import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jalankanAksi } from '@/api/surat'
import { milikWarga } from '@/domain/warga/permohonan'
import { ambilDb, ubahDb } from '@/mocks/db'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { DaftarRiwayat } from './DaftarRiwayat'
import { DetailRiwayat } from './DetailRiwayat'

pakaiApiTiruan({ dbSegarTiapUji: true })

const PASSPHRASE = { passphrase: 'sialang2026' }
const SESI_ZULKIFLI = {
  ...contohSesiWarga(),
  penduduk: { id: 'pdk_zulkifli', nama: 'Zulkifli', nik: '1405091706848005', keluargaId: 'kk_zulkifli' },
  whatsapp: '081371185570',
}

/** Domisili online Siti Rahmah yang sedang diproses (SPEC §12.9). */
function idDomisiliSiti(): string {
  const p = ambilDb().permohonan.find((x) => x.pemohonId === AKUN_WARGA_UJI.siti && x.status === 'diproses')
  if (!p) throw new Error('Permohonan Domisili Siti tidak ada di seed')
  return p.id
}

/** Operator mengajukan tanda tangan, lalu Kepala Desa menandatangani. Sesi warga tidak terganggu. */
async function tandatanganiDomisili(id: string) {
  masukSebagai(AKUN_UJI.operator)
  await jalankanAksi(id, 'ajukan-ttd')
  masukSebagai(AKUN_UJI.kades)
  await jalankanAksi(id, 'tandatangani', PASSPHRASE)
}

describe('Riwayat warga (SPEC §10)', () => {
  it('daftar: nama jenis lengkap, cap status, dan posisinya', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<DaftarRiwayat />)
    expect(screen.getByRole('heading', { level: 1, name: 'Riwayat permohonan' })).toBeInTheDocument()
    const tautan = await screen.findAllByRole('link', { name: /Surat Keterangan Domisili \(SKD\)/ })
    const domisili = tautan.find((a) => a.getAttribute('href') === `/warga/riwayat/${idDomisiliSiti()}`)
    expect(domisili).toHaveTextContent('Sedang diproses petugas desa')
  })
  it('detail yang sedang diproses: rincian isian dan perjalanan permohonan, tanpa Unduh PDF', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<DetailRiwayat id={idDomisiliSiti()} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Surat Keterangan Domisili (SKD)' })).toBeInTheDocument()
    expect(screen.getByText('Sedang diproses petugas desa')).toBeInTheDocument()
    expect(screen.getByText('pendaftaran sekolah anak')).toBeInTheDocument()
    expect(screen.getByText(/^2026-\d{4}$/)).toBeInTheDocument()
    const perjalanan = screen.getByRole('list', { name: 'Riwayat permohonan' })
    expect(within(perjalanan).getByText('Diajukan lewat layanan warga')).toBeInTheDocument()
    expect(within(perjalanan).getByText('Mulai diproses')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unduh PDF' })).not.toBeInTheDocument()
  })
  it('SKU Zulkifli yang dikembalikan: catatan antarpetugas tidak tampil (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const sku = ambilDb().permohonan.find((p) => p.pemohonId === 'pdk_zulkifli' && p.dikembalikan !== null)
    if (!sku) throw new Error('SKU Zulkifli tidak ada di seed')
    renderWarga(<DetailRiwayat id={sku.id} />, SESI_ZULKIFLI)
    expect(await screen.findByText('Dikembalikan untuk diperbaiki')).toBeInTheDocument()
    expect(screen.getByText('Sedang diperbaiki petugas desa')).toBeInTheDocument()
    expect(screen.queryByText(/Alamat usaha belum lengkap/)).not.toBeInTheDocument()
  })
  it('Selesai TTE: Unduh PDF membuka dialog cetak dengan lembar surat bernomor', async () => {
    const id = idDomisiliSiti()
    await tandatanganiDomisili(id)
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const cetak = vi.spyOn(window, 'print').mockImplementation(() => { })
    renderWarga(<DetailRiwayat id={id} />)
    const nomor = ambilDb().permohonan.find((p) => p.id === id)?.terbit?.nomor ?? '?'
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Unduh PDF' }))
    expect(cetak).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('region', { name: 'Lembar cetak' })).toHaveTextContent(nomor)
    cetak.mockRestore()
  })
  it('Selesai tanda tangan basah: ambil di kantor desa beserta jam layanan, tanpa Unduh PDF', async () => {
    ubahDb((d) => {
      const pengaturan = d.pengaturanSurat.find((p) => p.desaId === 'desa_sungai_sialang')
      if (pengaturan) pengaturan.modeTandaTangan = 'basah'
    })
    const id = idDomisiliSiti()
    await tandatanganiDomisili(id)
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<DetailRiwayat id={id} />)
    expect(await screen.findByText('Ambil di kantor desa, bawa KTP asli')).toBeInTheDocument()
    expect(screen.getByText(/Senin-Kamis 08\.00-15\.00/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unduh PDF' })).not.toBeInTheDocument()
  })
  it('Ditolak: alasannya tampil', async () => {
    const id = idDomisiliSiti()
    masukSebagai(AKUN_UJI.operator)
    await jalankanAksi(id, 'tolak', { alasan: 'Pengantar RT belum dilampirkan.' })
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<DetailRiwayat id={id} />)
    expect(await screen.findByText('Permohonan ditolak')).toBeInTheDocument()
    expect(screen.getAllByText(/Pengantar RT belum dilampirkan\./).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Ajukan ulang' })).toHaveAttribute('href', `/warga/ajukan?ulang=${id}`)
  })
  it('permohonan orang lain → "Permohonan tidak ditemukan" (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const lain = ambilDb().permohonan.find((p) => !milikWarga(p, 'pdk_siti_rahmah'))
    if (!lain) throw new Error('Seed tanpa permohonan orang lain')
    renderWarga(<DetailRiwayat id={lain.id} />)
    expect(await screen.findByText('Permohonan tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke Riwayat' })).toHaveAttribute('href', '/warga/riwayat')
  })
})

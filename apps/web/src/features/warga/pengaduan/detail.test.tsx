import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ambilDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderWarga } from '@/test/render'
import { contohSesiWarga } from '@/test/sesi'
import { DetailPengaduan } from './DetailPengaduan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const SESI_ZULKIFLI = {
  ...contohSesiWarga(),
  penduduk: { id: 'pdk_zulkifli', nama: 'Zulkifli', nik: '1405091706848005', keluargaId: 'kk_zulkifli' },
}
const pengaduanMilik = (pendudukId: string) => {
  const a = ambilDb().pengaduan.find((p) => p.pelapor.pendudukId === pendudukId)
  if (!a) throw new Error(`Pengaduan ${pendudukId} tidak ada di seed`)
  return a
}

describe('percakapan pengaduan (SPEC §10)', () => {
  it('pengaduan Baru: judul, status, cerita warga; balasan warga masuk percakapan', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const a = pengaduanMilik('pdk_zulkifli')
    renderWarga(<DetailPengaduan id={a.id} />, SESI_ZULKIFLI)
    expect(await screen.findByRole('heading', { level: 1, name: a.judul })).toBeInTheDocument()
    expect(screen.getByText(`${a.nomor} · ${a.kategori}`)).toBeInTheDocument()
    const percakapan = screen.getByRole('list', { name: 'Percakapan pengaduan' })
    expect(within(percakapan).getAllByRole('listitem')[0]).toHaveTextContent('Anda')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }))
    expect(screen.getByText('Tulis balasan Anda.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Balasan Anda' }), 'Lubangnya makin besar sesudah hujan semalam.')
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }))
    expect(await within(percakapan).findByText('Lubangnya makin besar sesudah hujan semalam.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Balasan Anda' })).toHaveValue('')
  })
  it('pengaduan Selesai: balasan desa tampil dengan nama dan jabatannya; tidak bisa dibalas, disarankan pengaduan baru', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const a = pengaduanMilik('pdk_siti_rahmah')
    const balasanDesa = a.percakapan.find((e) => e.jenis === 'desa')
    if (balasanDesa?.jenis !== 'desa') throw new Error('Pengaduan Siti tanpa balasan desa')
    renderWarga(<DetailPengaduan id={a.id} />)
    expect(await screen.findByText(`${balasanDesa.oleh.nama} · ${balasanDesa.jabatan}`)).toBeInTheDocument()
    expect(screen.getByText('Pengaduan ini sudah selesai')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Balasan Anda' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sampaikan pengaduan baru' })).toHaveAttribute('href', '/warga/pengaduan/baru')
  })
  it('pengaduan orang lain → "Pengaduan tidak ditemukan" (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    renderWarga(<DetailPengaduan id={pengaduanMilik('pdk_zulkifli').id} />)
    expect(await screen.findByText('Pengaduan tidak ditemukan')).toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { daftarPenduduk } from '@/api/penduduk'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { ProfilPenduduk } from './ProfilPenduduk'

pakaiApiTiruan()

describe('Profil penduduk (SPEC §6.3)', () => {
  it('Siti Rahmah: identitas, alamat, keluarga, dan riwayat', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.getByText('Hidup')).toBeInTheDocument()
    expect(screen.getByText('RT 004/RW 002, Dusun I Kampung Tengah')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '140509 201123 8004' })).toHaveAttribute('href', '/admin/kependudukan/keluarga/kk_syahrial')
    expect(screen.getByRole('link', { name: 'Syahrial' })).toHaveAttribute('href', '/admin/kependudukan/penduduk/pdk_syahrial')
    const riwayat = await screen.findByRole('list', { name: 'Riwayat perubahan dan mutasi' })
    expect(within(riwayat).getByText('Data dibuat')).toBeInTheDocument()
  })
  it('perubahan field tampil sebagai "lama → baru" beserta petugasnya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = ambilDb().riwayat[0]
    renderPanel(<ProfilPenduduk id={r.pendudukId} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByText(`${LABEL_FIELD[r.field]}: ${r.nilaiLama} → ${r.nilaiBaru}`)).toBeInTheDocument()
  })
  it('mantan penduduk: banner keterangan, bukan galat (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const [almarhum] = (await daftarPenduduk({ status: 'Meninggal' })).data
    renderPanel(<ProfilPenduduk id={almarhum.id} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('heading', { level: 1, name: almarhum.nama })).toBeInTheDocument()
    expect(await screen.findByText(/^Meninggal pada /)).toBeInTheDocument()
    expect(screen.getByText(/tidak dihitung sebagai jiwa/)).toBeInTheDocument()
  })
  it('di luar wilayah Kepala Dusun → tidak ditemukan, dengan tautan kembali', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    expect(await screen.findByText('Data penduduk tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke daftar penduduk' })).toHaveAttribute('href', '/admin/kependudukan/penduduk')
  })
  it('tombol Ubah hanya untuk Operator dan Sekretaris Desa (SPEC §5.1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { unmount } = renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('link', { name: 'Ubah' })).toHaveAttribute('href', '/admin/kependudukan/penduduk/pdk_siti_rahmah/ubah')
    unmount()
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ubah' })).not.toBeInTheDocument()
  })
  it('menu Catat mutasi di profil penduduk yang masih hidup (SPEC §6.3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi())
    await userEvent.click(await screen.findByRole('button', { name: 'Catat mutasi' }))
    expect(await screen.findByRole('menuitem', { name: 'Meninggal' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/mutasi/meninggal?penduduk=pdk_siti_rahmah',
    )
    expect(screen.getByRole('menuitem', { name: 'Pindah keluar' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/mutasi/pindah?penduduk=pdk_siti_rahmah',
    )
  })
  it('mantan penduduk tidak punya menu Catat mutasi', async () => {
    masukSebagai(AKUN_UJI.operator)
    const [almarhum] = (await daftarPenduduk({ status: 'Meninggal' })).data
    renderPanel(<ProfilPenduduk id={almarhum.id} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('heading', { level: 1, name: almarhum.nama })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Catat mutasi' })).not.toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    expect(await screen.findByRole('heading', { level: 1, name: 'Data penduduk tidak ditemukan' })).toBeInTheDocument()
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
  it('Buat surat dengan pemohon terisi untuk Operator; tidak untuk Kepala Desa (SPEC §6.3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { unmount } = renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('link', { name: 'Buat surat' })).toHaveAttribute('href', '/admin/surat/baru?pemohon=pdk_siti_rahmah')
    unmount()
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buat surat' })).not.toBeInTheDocument()
  })
  it('mantan penduduk tidak bisa menjadi pemohon: tanpa Buat surat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const [almarhum] = (await daftarPenduduk({ status: 'Meninggal' })).data
    renderPanel(<ProfilPenduduk id={almarhum.id} sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('heading', { level: 1, name: almarhum.nama })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buat surat' })).not.toBeInTheDocument()
  })
  it('tab Surat: semua surat orang ini (SPEC §6.3)', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    await userEvent.click(await screen.findByRole('tab', { name: 'Surat' }))
    const daftar = await screen.findByRole('list', { name: 'Surat untuk penduduk ini' })
    expect(within(daftar).getByRole('link', { name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
  })
  it('tawaran surat kematian setelah kematian dicatat; Nanti saja menutupnya (SPEC §6.6)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const [almarhum] = (await daftarPenduduk({ status: 'Meninggal' })).data
    const onTutupTawaran = vi.fn()
    renderPanel(
      <ProfilPenduduk id={almarhum.id} sekarang={SEKARANG_UJI} tawaran="SKM" onTutupTawaran={onTutupTawaran} />,
      contohSesi(),
    )
    expect(await screen.findByText('Kematian sudah dicatat')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buat Surat Keterangan Kematian' })).toHaveAttribute(
      'href',
      `/admin/surat/baru?jenis=SKM&subjek=${almarhum.id}&langkah=2`,
    )
    // Dua aksi banner berjajar dengan jarak, seperti banner laporan warga.
    expect(screen.getByRole('button', { name: 'Nanti saja' }).parentElement).toHaveClass('flex', 'gap-2')
    await userEvent.click(screen.getByRole('button', { name: 'Nanti saja' }))
    expect(onTutupTawaran).toHaveBeenCalledOnce()
  })
  it('tawaran surat tidak tampil untuk peran yang tidak membuat surat', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} tawaran="SKL" onTutupTawaran={vi.fn()} />, contohSesi('kades'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Siti Rahmah' })).toBeInTheDocument()
    expect(screen.queryByText('Kelahiran sudah dicatat')).not.toBeInTheDocument()
  })
  it('tab Bantuan: program keluarganya dan status tiap tahap (SPEC §6.3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    const user = userEvent.setup()
    renderPanel(<ProfilPenduduk id="pdk_siti_rahmah" sekarang={SEKARANG_UJI} />, contohSesi())
    await user.click(await screen.findByRole('tab', { name: 'Bantuan' }))
    const bantuan = await screen.findByRole('list', { name: 'Bantuan keluarga' })
    expect(within(bantuan).getByRole('link', { name: 'BLT Dana Desa 2026' })).toHaveAttribute('href', '/admin/bansos/bns_ss_blt')
    expect(within(bantuan).getByRole('link', { name: 'Bantuan Pangan Beras 2026' })).toBeInTheDocument()
    const tahapIII = within(within(bantuan).getByRole('list', { name: 'Penyaluran BLT-DD' })).getAllByRole('listitem')[2]
    expect(tahapIII).toHaveTextContent('Tahap III · 30 Sep 2026')
    expect(tahapIII).toHaveTextContent('Dijadwalkan')
  })
  it('tab Bantuan: keluarga yang bukan penerima', async () => {
    masukSebagai(AKUN_UJI.operator)
    const penerima = new Set(ambilDb().penerimaBansos.map((x) => x.keluargaId))
    const bukan = ambilDb().penduduk.find((p) => p.statusDasar === 'Hidup' && !penerima.has(p.keluargaId))
    if (!bukan) throw new Error('Semua keluarga menerima bansos')
    const user = userEvent.setup()
    renderPanel(<ProfilPenduduk id={bukan.id} sekarang={SEKARANG_UJI} />, contohSesi())
    await user.click(await screen.findByRole('tab', { name: 'Bantuan' }))
    expect(await screen.findByText('Keluarga ini tidak tercatat sebagai penerima bantuan sosial.')).toBeInTheDocument()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarKegiatan } from './DaftarKegiatan'
import { DetailKegiatan } from './DetailKegiatan'

pakaiApiTiruan()

function pasangDetail(id: string) {
  masukSebagai(AKUN_UJI.kadus)
  renderPanel(<DetailKegiatan id={id} />, contohSesi('kadus'))
}

describe('Pembangunan (SPEC §8)', () => {
  it('daftar: yang berjalan dulu, anggaran ringkas bernilai penuh di tooltip, progres fisik dan keuangan; baris membuka detail', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const onBuka = vi.fn()
    renderPanel(<DaftarKegiatan onBuka={onBuka} />, contohSesi('kaur-keuangan'))
    const tabel = await screen.findByRole('grid', { name: 'Kegiatan pembangunan' })
    const baris = within(tabel).getAllByRole('row').slice(1)
    expect(baris).toHaveLength(7)
    expect(baris[0]).toHaveTextContent('Semenisasi jalan lingkungan Dusun III')
    expect(within(baris[0]).getByTitle('Rp245.000.000')).toHaveTextContent('Rp245 jt')
    expect(within(baris[0]).getByRole('meter', { name: 'Fisik' })).toHaveAttribute('aria-valuetext', '70,0%')
    expect(within(baris[0]).getByRole('meter', { name: 'Keuangan' })).toHaveAttribute('aria-valuetext', '62,0%')
    expect(screen.getByText('7 kegiatan · Rp721,9 jt dari bidang Pelaksanaan Pembangunan Desa')).toBeInTheDocument()
    await userEvent.setup().click(baris[0])
    expect(onBuka).toHaveBeenCalledWith('kgt_ss_01')
  })
  it('detail: progres, dokumentasi 0/50/100 berbingkai, anggaran dari APBDes, dan tautan ke peta', async () => {
    pasangDetail('kgt_ss_01')
    expect(await screen.findByRole('heading', { level: 1, name: 'Semenisasi jalan lingkungan Dusun III' })).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Progres fisik' })).toHaveAttribute('aria-valuetext', '70,0%')
    const dok = within(screen.getByRole('list', { name: 'Dokumentasi progres' })).getAllByRole('listitem')
    expect(dok).toHaveLength(3)
    expect(dok[0]).toHaveTextContent('Belum ada foto')
    expect(dok[0]).toHaveTextContent('Kondisi lokasi sebelum dikerjakan')
    expect(dok[1]).toHaveTextContent('Belum ada foto')
    expect(dok[2]).toHaveTextContent('Belum mencapai 100%')
    expect(within(screen.getByRole('complementary', { name: 'Rincian kegiatan' })).getByText('5.2.01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lihat di peta' })).toHaveAttribute('href', '/admin/peta?kegiatan=kgt_ss_01')
  })
  it('kegiatan perencanaan: progres keuangan 0%, belum dimulai (fokus review 3)', async () => {
    pasangDetail('kgt_ss_07')
    expect(await screen.findByRole('meter', { name: 'Progres keuangan' })).toHaveAttribute('aria-valuetext', '0,0%')
    expect(within(screen.getByRole('complementary', { name: 'Rincian kegiatan' })).getByText('Belum dimulai')).toBeInTheDocument()
  })
  it('kegiatan tak dikenal → tidak ditemukan', async () => {
    pasangDetail('kgt_xx')
    expect(await screen.findByText('Kegiatan pembangunan tidak ditemukan')).toBeInTheDocument()
  })
})

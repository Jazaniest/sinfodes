import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buatPermohonan } from '@/api/surat'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarSuratPenduduk } from './DaftarSuratPenduduk'

pakaiApiTiruan({ dbSegarTiapUji: true })

const nama = (id: string) => ambilDb().penduduk.find((p) => p.id === id)?.nama ?? '-'

describe('surat seorang penduduk (SPEC §6.2, §6.3)', () => {
  it('Siti Rahmah: Domisilinya, membuka ruang kerja; belum bernomor', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<DaftarSuratPenduduk pendudukId="pdk_siti_rahmah" />, contohSesi())
    const daftar = await screen.findByRole('list', { name: 'Surat untuk penduduk ini' })
    expect(within(daftar).getByRole('link', { name: 'Surat Keterangan Domisili' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/admin\/surat\/srt_/),
    )
    expect(within(daftar).getByText(/^Belum bernomor · /)).toBeInTheDocument()
  })
  it('bayi: surat kelahirannya, dengan nama pemohonnya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const skl = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skl' && p.subjekId !== null)
    renderPanel(<DaftarSuratPenduduk pendudukId={skl?.subjekId ?? '-'} />, contohSesi())
    const daftar = await screen.findByRole('list', { name: 'Surat untuk penduduk ini' })
    expect(within(daftar).getByRole('link', { name: 'Surat Keterangan Kelahiran' })).toBeInTheDocument()
    expect(within(daftar).getByText(new RegExp(` · Pemohon: ${nama(skl?.pemohonId ?? '-')}$`))).toBeInTheDocument()
  })
  it('batas tiga: tiga terbaru, lalu sisanya disebut', async () => {
    masukSebagai(AKUN_UJI.operator)
    for (let i = 0; i < 4; i++) {
      await buatPermohonan({
        jenisId: 'js_ss_skd', pemohonId: 'pdk_siti_rahmah', subjekId: null, mutasiId: null, isian: { keperluan: `uji ${i}` }, ajukan: false,
      })
    }
    renderPanel(<DaftarSuratPenduduk pendudukId="pdk_siti_rahmah" batas={3} />, contohSesi())
    const daftar = await screen.findByRole('list', { name: 'Surat untuk penduduk ini' })
    expect(within(daftar).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('dan 2 surat lainnya, lihat di profil.')).toBeInTheDocument()
  })
  it('belum pernah dibuatkan surat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const db = ambilDb()
    const punya = new Set(db.permohonan.flatMap((p) => [p.pemohonId, p.subjekId]))
    const tanpa = db.penduduk.find((p) => p.desaId === 'desa_sungai_sialang' && !punya.has(p.id))
    renderPanel(<DaftarSuratPenduduk pendudukId={tanpa?.id ?? '-'} />, contohSesi())
    expect(await screen.findByText('Belum ada surat untuk orang ini.')).toBeInTheDocument()
  })
})

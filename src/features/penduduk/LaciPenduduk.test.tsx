import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import type { Peran } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohPenduduk } from '@/test/contoh'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { LaciPenduduk } from './LaciPenduduk'

pakaiApiTiruan()

const SITI: BarisPenduduk = { ...contohPenduduk({ id: 'pdk_siti_rahmah', keluargaId: 'kk_syahrial' }), nomorKk: '1405092011238004' }

function pasang(peran: Peran = 'operator', penduduk: BarisPenduduk = SITI) {
  renderPanel(<LaciPenduduk penduduk={penduduk} hariIni={SEKARANG_UJI} onTutup={vi.fn()} onBukaProfil={vi.fn()} />, contohSesi(peran))
}

describe('laci penduduk (SPEC §6.2)', () => {
  it('tiga surat terakhir dan Buat surat untuk orang ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    pasang()
    const laci = await screen.findByRole('dialog')
    const surat = await within(laci).findByRole('list', { name: 'Surat untuk penduduk ini' })
    expect(within(surat).getByRole('link', { name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
    expect(within(laci).getByRole('link', { name: 'Buat surat untuk orang ini' })).toHaveAttribute(
      'href',
      '/admin/surat/baru?pemohon=pdk_siti_rahmah',
    )
  })
  it('Kepala Desa: surat terlihat, tanpa Buat surat', async () => {
    masukSebagai(AKUN_UJI.kades)
    pasang('kades')
    const laci = await screen.findByRole('dialog')
    expect(await within(laci).findByRole('list', { name: 'Surat untuk penduduk ini' })).toBeInTheDocument()
    expect(within(laci).queryByRole('link', { name: 'Buat surat untuk orang ini' })).not.toBeInTheDocument()
  })
  it('mantan penduduk: tanpa Buat surat', async () => {
    masukSebagai(AKUN_UJI.operator)
    pasang('operator', { ...SITI, statusDasar: 'Meninggal' })
    const laci = await screen.findByRole('dialog')
    expect(within(laci).getByRole('button', { name: 'Buka profil' })).toBeInTheDocument()
    expect(within(laci).queryByRole('link', { name: 'Buat surat untuk orang ini' })).not.toBeInTheDocument()
  })
})

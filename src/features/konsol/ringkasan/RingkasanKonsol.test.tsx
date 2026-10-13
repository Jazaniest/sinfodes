import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKonsol } from '@/test/konsol'
import { renderKonsol } from '@/test/render'
import { RingkasanKonsol } from './RingkasanKonsol'

pakaiApiTiruan()

describe('Ringkasan Konsol (SPEC §11)', () => {
  it('Tim Sinfodes: Perlu perhatian di atas, lalu angka platform dalam kalimat', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    renderKonsol(<RingkasanKonsol sekarang={SEKARANG_UJI} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ringkasan' })).toBeInTheDocument()
    expect(screen.getByText('Semua desa · Kamis, 24 September 2026')).toBeInTheDocument()
    const perhatian = await screen.findByRole('region', { name: 'Perlu perhatian' })
    expect(within(perhatian).getAllByRole('listitem').map((li) => li.firstChild?.textContent)).toEqual([
      '3 desa tidak aktif 14 hari', '2 desa berhenti di langkah impor penduduk', '1 tagihan lewat jatuh tempo',
    ])
    expect(within(perhatian).getByRole('link', { name: 'Lihat desa dalam persiapan' })).toHaveAttribute('href', '/konsol/desa?status=Persiapan')
    expect(screen.getByRole('region', { name: 'Angka platform' })).toHaveTextContent(
      /26 desa aktif, 5 uji coba, 7 dalam persiapan, dan 2 ditangguhkan\. [\d.]+ surat terbit dalam 7 hari terakhir\./,
    )
  })
  it('pemantau: angka kabupatennya saja, tanpa tagihan dan tanpa tautan ke daftar desa (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    renderKonsol(<RingkasanKonsol sekarang={SEKARANG_UJI} />, contohSesiKonsol('pemantau'))
    expect(screen.getByText('Kabupaten Pelalawan · Kamis, 24 September 2026')).toBeInTheDocument()
    const perhatian = await screen.findByRole('region', { name: 'Perlu perhatian' })
    expect(perhatian).not.toHaveTextContent('tagihan')
    expect(within(perhatian).queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Desa di Kabupaten Pelalawan' })).toHaveTextContent(
      '21 desa aktif, 4 uji coba, 5 dalam persiapan, dan 2 ditangguhkan.',
    )
    expect(screen.getByRole('link', { name: 'Buka Pemantauan wilayah' })).toHaveAttribute('href', '/konsol/pemantauan')
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
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
      '2 bukti bayar menunggu verifikasi', '3 desa tidak aktif 14 hari', '3 desa berhenti di langkah persiapan', '1 tagihan lewat jatuh tempo',
    ])
    expect(within(perhatian).getByRole('link', { name: 'Buka Tagihan' })).toHaveAttribute('href', '/konsol/tagihan?tab=menunggu')
    expect(within(perhatian).getByRole('link', { name: 'Lihat tagihan yang lewat' })).toHaveAttribute('href', '/konsol/tagihan?tab=lewat')
    expect(within(perhatian).getByRole('link', { name: 'Lihat desa dalam persiapan' })).toHaveAttribute('href', '/konsol/desa?status=Persiapan')
    const platform = screen.getByRole('region', { name: 'Angka platform' })
    expect(platform).toHaveTextContent('33 desa aktif, 5 uji coba, 7 dalam persiapan, dan 2 ditangguhkan. 2 kabupaten mitra.')
    expect(platform).not.toHaveTextContent(/surat terbit/)
    expect(screen.queryByRole('link', { name: 'Buka Pemantauan wilayah' })).not.toBeInTheDocument()
  })
})
